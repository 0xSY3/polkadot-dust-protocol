import { ethers } from 'ethers'
import { NextResponse } from 'next/server'
import { getServerSponsor, getMaxGasPrice } from '@/lib/server-provider'
import { DEFAULT_CHAIN_ID, getChainConfig } from '@/config/chains'
import { getDustPoolV2Address, DUST_POOL_V2_ABI } from '@/lib/dustpool/v2/contracts'
import { syncAndPostRoot } from '@/lib/dustpool/v2/relayer-tree'
import { toBytes32Hex } from '@/lib/dustpool/poseidon'
import { computeAssetId } from '@/lib/dustpool/v2/commitment'
import { BN254_FIELD_SIZE } from '@/lib/dustpool/v2/constants'
import { PRIVACY_AMM_ADDRESS, WPAS_ADDRESS } from '@/lib/swap/constants'
import { acquireNullifier, releaseNullifier } from '@/lib/dustpool/v2/pending-nullifiers'
import { checkCooldown } from '@/lib/dustpool/v2/persistent-cooldown'
import { incrementSwap, observeGasUsed, recordProofVerification } from '@/lib/metrics'

export const maxDuration = 120

const NO_STORE = { 'Cache-Control': 'no-store' } as const

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
]

const WPAS_ABI = [
  'function deposit() external payable',
  'function approve(address spender, uint256 amount) external returns (bool)',
]

const AMM_ABI = [
  'function vanillaSwap(bool zeroForOne, uint256 amountIn, uint256 amountOutMin) external returns (uint256)',
  'function getAmountOut(uint256 amountIn, bool zeroForOne) external view returns (uint256)',
]

async function waitForTx(
  tx: ethers.ContractTransaction,
  sponsor: ethers.Wallet,
  contract: ethers.Contract,
  nullifierHex: string,
  label: string,
): Promise<ethers.providers.TransactionReceipt> {
  try {
    return await tx.wait()
  } catch {
    // pallet-revive receipt status bug: verify nullifier state if applicable
    if (nullifierHex) {
      const spent = await contract.nullifiers(nullifierHex)
      if (spent) return await sponsor.provider.getTransactionReceipt(tx.hash)
    }
    // For non-nullifier txs (approve, swap, deposit), just get the receipt
    const receipt = await sponsor.provider.getTransactionReceipt(tx.hash)
    if (receipt) return receipt
    throw new Error(`${label} failed`)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const chainId = typeof body.targetChainId === 'number' ? body.targetChainId : DEFAULT_CHAIN_ID

    const config = getChainConfig(chainId)
    const poolAddress = getDustPoolV2Address(chainId)
    if (!poolAddress) {
      return NextResponse.json(
        { error: 'DustPoolV2 not deployed on this chain' },
        { status: 404, headers: NO_STORE },
      )
    }

    const poolKey = config.contracts.dustSwapVanillaPoolKey
    if (!poolKey) {
      return NextResponse.json(
        { error: 'DustSwap pool key not configured for this chain' },
        { status: 404, headers: NO_STORE },
      )
    }

    const {
      proof,
      publicSignals,
      tokenIn,
      tokenOut,
      ownerPubKey,
      blinding,
      relayerFeeBps = 100,
      minAmountOut,
    } = body

    if (!proof || !Array.isArray(publicSignals) || publicSignals.length !== 9) {
      return NextResponse.json(
        { error: 'Missing or invalid fields: proof (hex), publicSignals (9 elements)' },
        { status: 400, headers: NO_STORE },
      )
    }
    if (!/^0x[0-9a-fA-F]+$/.test(proof)) {
      return NextResponse.json({ error: 'Invalid proof format' }, { status: 400, headers: NO_STORE })
    }
    if (!tokenIn || !/^0x[0-9a-fA-F]{40}$/.test(tokenIn)) {
      return NextResponse.json({ error: 'Invalid tokenIn address' }, { status: 400, headers: NO_STORE })
    }
    if (!tokenOut || !/^0x[0-9a-fA-F]{40}$/.test(tokenOut)) {
      return NextResponse.json({ error: 'Invalid tokenOut address' }, { status: 400, headers: NO_STORE })
    }
    if (!ownerPubKey || !blinding) {
      return NextResponse.json(
        { error: 'Missing ownerPubKey or blinding' },
        { status: 400, headers: NO_STORE },
      )
    }
    if (typeof relayerFeeBps !== 'number' || relayerFeeBps < 0 || relayerFeeBps > 500) {
      return NextResponse.json(
        { error: 'relayerFeeBps must be a number between 0 and 500' },
        { status: 400, headers: NO_STORE },
      )
    }
    if (!minAmountOut || BigInt(minAmountOut) <= 0n) {
      return NextResponse.json(
        { error: 'minAmountOut must be > 0' },
        { status: 400, headers: NO_STORE },
      )
    }

    const expectedAsset = await computeAssetId(chainId, tokenIn)
    const proofAsset = BigInt(publicSignals[6])
    if (expectedAsset !== proofAsset) {
      return NextResponse.json(
        { error: 'tokenIn does not match proof asset' },
        { status: 400, headers: NO_STORE },
      )
    }

    const proofChainId = BigInt(publicSignals[8])
    if (proofChainId !== BigInt(chainId)) {
      return NextResponse.json(
        { error: 'Proof chainId does not match target chain' },
        { status: 400, headers: NO_STORE },
      )
    }

    const sponsor = getServerSponsor(chainId)
    const sponsorAddress = await sponsor.getAddress()

    // Two-tx swap: proof recipient must be the relayer wallet
    const proofRecipient = BigInt(publicSignals[7])
    if (proofRecipient !== BigInt(sponsorAddress)) {
      return NextResponse.json(
        { error: 'Proof recipient must be the relayer wallet for two-tx swap' },
        { status: 400, headers: NO_STORE },
      )
    }

    const nullifier0Hex = toBytes32Hex(BigInt(publicSignals[1]))
    const nullifier1Hex = toBytes32Hex(BigInt(publicSignals[2]))
    const nullifier1IsZero = BigInt(publicSignals[2]) === 0n

    if (!(await checkCooldown(nullifier0Hex))) {
      return NextResponse.json({ error: 'Please wait before retrying' }, { status: 429, headers: NO_STORE })
    }

    if (!acquireNullifier(nullifier0Hex)) {
      return NextResponse.json({ error: 'Nullifier already being processed' }, { status: 409, headers: NO_STORE })
    }
    if (!nullifier1IsZero && !acquireNullifier(nullifier1Hex)) {
      releaseNullifier(nullifier0Hex)
      return NextResponse.json({ error: 'Nullifier already being processed' }, { status: 409, headers: NO_STORE })
    }

    try {
      await syncAndPostRoot(chainId)

      const pool = new ethers.Contract(
        poolAddress,
        DUST_POOL_V2_ABI as unknown as ethers.ContractInterface,
        sponsor,
      )

      // Pre-flight nullifier check
      const null0Spent = await pool.nullifiers(nullifier0Hex)
      if (null0Spent) {
        return NextResponse.json(
          { error: 'NullifierAlreadySpent' },
          { status: 400, headers: NO_STORE },
        )
      }

      const merkleRoot = toBytes32Hex(BigInt(publicSignals[0]))
      const nullifier0 = nullifier0Hex
      const nullifier1 = nullifier1Hex
      const outCommitment0 = toBytes32Hex(BigInt(publicSignals[3]))
      const outCommitment1 = toBytes32Hex(BigInt(publicSignals[4]))
      const publicAmount = BigInt(publicSignals[5])
      const publicAsset = BigInt(publicSignals[6])

      const withdrawAmount = publicAmount > BN254_FIELD_SIZE / 2n
        ? BN254_FIELD_SIZE - publicAmount
        : publicAmount

      const zeroForOne = tokenIn.toLowerCase() === poolKey.currency0.toLowerCase()

      const feeData = await sponsor.provider.getFeeData()
      const maxFeePerGas = feeData.maxFeePerGas || ethers.utils.parseUnits('5', 'gwei')
      if (maxFeePerGas.gt(getMaxGasPrice(chainId))) {
        return NextResponse.json({ error: 'Gas price too high' }, { status: 503, headers: NO_STORE })
      }

      const txOpts = {
        type: 2,
        maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.utils.parseUnits('1.5', 'gwei'),
      }

      // ── TX1: Withdraw from pool to relayer ────────────────────────────
      console.log(`[V2/swap] TX1: Withdrawing ${ethers.utils.formatEther(withdrawAmount)} from pool...`)
      const tx1 = await pool.withdraw(
        proof,
        merkleRoot,
        nullifier0,
        nullifier1,
        outCommitment0,
        outCommitment1,
        publicAmount,
        publicAsset,
        sponsorAddress,
        tokenIn,
        { gasLimit: 800_000, ...txOpts },
      )
      const receipt1 = await waitForTx(tx1, sponsor, pool, nullifier0Hex, 'Withdraw')
      console.log(`[V2/swap] TX1 confirmed: ${receipt1.transactionHash}`)

      // ── Determine actual withdraw amount and handle wrapping ─────────
      const isNativeIn = tokenIn.toLowerCase() === ethers.constants.AddressZero.toLowerCase()
      const amm = new ethers.Contract(PRIVACY_AMM_ADDRESS, AMM_ABI, sponsor)

      let swapAmountIn = withdrawAmount

      // If native PAS, wrap to WPAS for AMM
      if (isNativeIn) {
        const wpas = new ethers.Contract(WPAS_ADDRESS, WPAS_ABI, sponsor)
        const wrapTx = await wpas.deposit({ value: swapAmountIn, gasLimit: 100_000, ...txOpts })
        await wrapTx.wait().catch(() => sponsor.provider.getTransactionReceipt(wrapTx.hash))
        const approveTx = await wpas.approve(PRIVACY_AMM_ADDRESS, swapAmountIn, { gasLimit: 100_000, ...txOpts })
        await approveTx.wait().catch(() => sponsor.provider.getTransactionReceipt(approveTx.hash))
      } else {
        const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, sponsor)
        const approveTx = await tokenContract.approve(PRIVACY_AMM_ADDRESS, swapAmountIn, { gasLimit: 100_000, ...txOpts })
        await approveTx.wait().catch(() => sponsor.provider.getTransactionReceipt(approveTx.hash))
      }

      // ── TX2: Swap on PrivacyAMM ─────────────────────────────────────
      const estimatedOutput = await amm.getAmountOut(swapAmountIn, zeroForOne)
      const effectiveMinOut = BigInt(minAmountOut) > BigInt(estimatedOutput.toString())
        ? (BigInt(estimatedOutput.toString()) * 99n) / 100n
        : BigInt(minAmountOut)

      console.log(`[V2/swap] TX2: Swapping on AMM (zeroForOne=${zeroForOne})...`)
      const tx2 = await amm.vanillaSwap(zeroForOne, swapAmountIn, effectiveMinOut, { gasLimit: 500_000, ...txOpts })
      await tx2.wait().catch(() => sponsor.provider.getTransactionReceipt(tx2.hash))
      console.log(`[V2/swap] TX2 confirmed: ${tx2.hash}`)

      // ── Compute output amounts (after relayer fee) ──────────────────
      const swapOutput = BigInt(estimatedOutput.toString())
      const relayerFee = (swapOutput * BigInt(relayerFeeBps)) / 10_000n
      const userAmount = swapOutput - relayerFee

      // ── Compute output commitment off-chain via Poseidon ────────────
      const { poseidonHash } = await import('@/lib/dustpool/v2/commitment')
      const outputAssetId = await computeAssetId(chainId, tokenOut)
      const outputCommitment = await poseidonHash([
        BigInt(ownerPubKey),
        userAmount,
        outputAssetId,
        BigInt(chainId),
        BigInt(blinding),
      ])
      const outputCommitmentHex = toBytes32Hex(outputCommitment)

      // ── TX3: Deposit output token back into pool ────────────────────
      const isNativeOut = tokenOut.toLowerCase() === ethers.constants.AddressZero.toLowerCase()

      let depositReceipt: ethers.providers.TransactionReceipt
      if (isNativeOut) {
        // AMM returned WPAS, unwrap to PAS first — but pool accepts native via deposit()
        // Actually the pool's deposit() is for the initial deposit, not for swap outputs.
        // For swap outputs we need depositERC20 or use the native deposit.
        // Since the AMM returns WPAS (ERC20), deposit WPAS as the output token.
        // The user will see WPAS in their pool balance.
        // For a cleaner UX, the relayer can unwrap WPAS and deposit native PAS.
        const wpas = new ethers.Contract(WPAS_ADDRESS, WPAS_ABI, sponsor)
        // Approve pool to take WPAS
        const tokenContract = new ethers.Contract(WPAS_ADDRESS, ERC20_ABI, sponsor)
        const approveTx = await tokenContract.approve(poolAddress, userAmount, { gasLimit: 100_000, ...txOpts })
        await approveTx.wait().catch(() => sponsor.provider.getTransactionReceipt(approveTx.hash))
        // Deposit as ERC20 (WPAS)
        console.log(`[V2/swap] TX3: Depositing ${ethers.utils.formatEther(userAmount)} WPAS to pool...`)
        const tx3 = await pool.depositERC20(outputCommitmentHex, WPAS_ADDRESS, userAmount, { gasLimit: 300_000, ...txOpts })
        depositReceipt = await tx3.wait().catch(async () => sponsor.provider.getTransactionReceipt(tx3.hash))
      } else {
        // Output is ERC20 (e.g., USDC)
        const tokenContract = new ethers.Contract(tokenOut, ERC20_ABI, sponsor)
        const approveTx = await tokenContract.approve(poolAddress, userAmount, { gasLimit: 100_000, ...txOpts })
        await approveTx.wait().catch(() => sponsor.provider.getTransactionReceipt(approveTx.hash))
        console.log(`[V2/swap] TX3: Depositing output to pool...`)
        const tx3 = await pool.depositERC20(outputCommitmentHex, tokenOut, userAmount, { gasLimit: 300_000, ...txOpts })
        depositReceipt = await tx3.wait().catch(async () => sponsor.provider.getTransactionReceipt(tx3.hash))
      }
      console.log(`[V2/swap] TX3 confirmed: ${depositReceipt.transactionHash}`)

      // ── Parse DepositQueued event for queue index ───────────────────
      let queueIndex: number | null = null
      for (const log of depositReceipt.logs ?? []) {
        if (log.address.toLowerCase() === poolAddress.toLowerCase()) {
          try {
            const parsed = pool.interface.parseLog(log)
            if (parsed.name === 'DepositQueued') {
              queueIndex = parsed.args.queueIndex?.toNumber?.() ?? parsed.args[1]?.toNumber?.() ?? null
            }
          } catch { /* not our event */ }
        }
      }

      const chainStr = String(chainId)
      incrementSwap(chainStr)
      recordProofVerification(chainStr, 'v2_transaction', true)
      observeGasUsed(chainStr, 'swap', receipt1.gasUsed?.toNumber?.() ?? 0)

      console.log(
        `[V2/swap] Success: nullifier=${nullifier0.slice(0, 18)}... withdraw=${receipt1.transactionHash} deposit=${depositReceipt.transactionHash}`,
      )

      try {
        await syncAndPostRoot(chainId)
      } catch (syncErr) {
        console.error('[V2/swap] Post-TX tree sync failed (non-fatal):', syncErr)
      }

      return NextResponse.json(
        {
          txHash: receipt1.transactionHash,
          outputCommitment: outputCommitmentHex,
          outputAmount: userAmount.toString(),
          queueIndex,
          blockNumber: depositReceipt.blockNumber,
        },
        { headers: NO_STORE },
      )
    } finally {
      releaseNullifier(nullifier0Hex)
      if (!nullifier1IsZero) releaseNullifier(nullifier1Hex)
    }
  } catch (e) {
    console.error('[V2/swap] Error:', e)
    const raw = e instanceof Error ? e.message : String(e)
    let message = 'Swap failed'
    if (raw.includes('InvalidProof')) message = 'Invalid proof'
    else if (raw.includes('NullifierAlreadySpent')) message = 'Note already spent'
    else if (raw.includes('UnknownRoot')) message = 'Invalid or expired Merkle root'
    else if (raw.includes('InsufficientPoolBalance')) message = 'Insufficient pool balance'
    else if (raw.includes('InvalidProofLength')) message = 'Invalid proof length (expected 768 bytes)'
    else if (raw.includes('InvalidFieldElement')) message = 'Invalid field element in public signals'
    else if (raw.includes('SlippageExceeded')) message = 'Swap slippage exceeded'
    else if (raw.includes('InsufficientOutputAmount')) message = 'Swap slippage exceeded'
    else if (raw.includes('Sponsor not configured')) message = 'Relayer key not configured'

    return NextResponse.json({ error: message, detail: raw.slice(0, 500) }, { status: 500, headers: NO_STORE })
  }
}
