import { ethers } from 'ethers'
import { NextResponse } from 'next/server'
import { getServerSponsor, getMaxGasPrice } from '@/lib/server-provider'
import { DEFAULT_CHAIN_ID, getChainConfig } from '@/config/chains'
import { getDustPoolV2Address, DUST_POOL_V2_ABI } from '@/lib/dustpool/v2/contracts'
import { DUST_SWAP_ADAPTER_V2_ABI } from '@/lib/swap/contracts'
import { syncAndPostRoot } from '@/lib/dustpool/v2/relayer-tree'
import { toBytes32Hex } from '@/lib/dustpool/poseidon'
import { computeAssetId } from '@/lib/dustpool/v2/commitment'
import { BN254_FIELD_SIZE } from '@/lib/dustpool/v2/constants'
import { PRIVACY_AMM_ADDRESS } from '@/lib/swap/constants'
import { acquireNullifier, releaseNullifier } from '@/lib/dustpool/v2/pending-nullifiers'
import { checkCooldown } from '@/lib/dustpool/v2/persistent-cooldown'
import { incrementSwap, observeGasUsed, recordProofVerification } from '@/lib/metrics'

export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' } as const

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const chainId = typeof body.targetChainId === 'number' ? body.targetChainId : DEFAULT_CHAIN_ID

    const config = getChainConfig(chainId)
    const adapterAddress = config.contracts.dustSwapAdapterV2
    if (!adapterAddress) {
      return NextResponse.json(
        { error: 'DustSwapAdapterV2 not deployed on this chain' },
        { status: 404, headers: NO_STORE },
      )
    }

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

    // Verify tokenIn matches the publicAsset in the ZK proof
    const expectedAsset = await computeAssetId(chainId, tokenIn)
    const proofAsset = BigInt(publicSignals[6])
    if (expectedAsset !== proofAsset) {
      return NextResponse.json(
        { error: 'tokenIn does not match proof asset' },
        { status: 400, headers: NO_STORE },
      )
    }

    // Cross-chain replay prevention
    const proofChainId = BigInt(publicSignals[8])
    if (proofChainId !== BigInt(chainId)) {
      return NextResponse.json(
        { error: 'Proof chainId does not match target chain' },
        { status: 400, headers: NO_STORE },
      )
    }

    // Recipient in proof must be the adapter contract (not a user address)
    const proofRecipient = BigInt(publicSignals[7])
    if (proofRecipient !== BigInt(adapterAddress)) {
      return NextResponse.json(
        { error: 'Proof recipient must be the swap adapter contract' },
        { status: 400, headers: NO_STORE },
      )
    }

    // Public signals: [merkleRoot, nullifier0, nullifier1, outCommitment0, outCommitment1, publicAmount, publicAsset, recipient, chainId]
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

      const sponsor = getServerSponsor(chainId)
      const adapter = new ethers.Contract(
        adapterAddress,
        DUST_SWAP_ADAPTER_V2_ABI as unknown as ethers.ContractInterface,
        sponsor,
      )

      const merkleRoot = toBytes32Hex(BigInt(publicSignals[0]))
      const nullifier0 = nullifier0Hex
      const nullifier1 = nullifier1Hex
      const outCommitment0 = toBytes32Hex(BigInt(publicSignals[3]))
      const outCommitment1 = toBytes32Hex(BigInt(publicSignals[4]))
      const publicAmount = BigInt(publicSignals[5])
      const publicAsset = BigInt(publicSignals[6])

      // Swap direction: true if tokenIn is currency0 (swap 0→1), false if currency1 (swap 1→0)
      const zeroForOne = tokenIn.toLowerCase() === poolKey.currency0.toLowerCase()

      const feeData = await sponsor.provider.getFeeData()
      const maxFeePerGas = feeData.maxFeePerGas || ethers.utils.parseUnits('5', 'gwei')
      if (maxFeePerGas.gt(getMaxGasPrice(chainId))) {
        return NextResponse.json({ error: 'Gas price too high' }, { status: 503, headers: NO_STORE })
      }

      // Estimate withdraw amount for pre-swap validation
      const ammAbi = ['function getAmountOut(uint256 amountIn, bool zeroForOne) external view returns (uint256)']
      const amm = new ethers.Contract(PRIVACY_AMM_ADDRESS, ammAbi, sponsor.provider)

      // publicAmount encodes withdraw amount as BN254_FIELD_SIZE - amount (field-negative)
      const withdrawAmount = publicAmount > BN254_FIELD_SIZE / 2n
        ? BN254_FIELD_SIZE - publicAmount
        : publicAmount
      const estimatedOutput = await amm.getAmountOut(withdrawAmount, zeroForOne)
      const estimatedFee = (BigInt(estimatedOutput.toString()) * BigInt(relayerFeeBps)) / 10_000n
      const estimatedUserAmount = BigInt(estimatedOutput.toString()) - estimatedFee

      // Apply 1% slippage buffer to minAmountOut so commitment computed on-chain matches actual deposit
      const effectiveMinAmountOut = BigInt(minAmountOut) > estimatedUserAmount
        ? (estimatedUserAmount * 99n) / 100n
        : BigInt(minAmountOut)

      // Contract computes Poseidon commitment on-chain from ownerPubKey + blinding
      const tx = await adapter.executeSwap(
        proof,
        merkleRoot,
        nullifier0,
        nullifier1,
        outCommitment0,
        outCommitment1,
        publicAmount,
        publicAsset,
        tokenIn,
        zeroForOne,
        effectiveMinAmountOut,
        BigInt(ownerPubKey),
        BigInt(blinding),
        tokenOut,
        await sponsor.getAddress(),
        relayerFeeBps,
        {
          gasLimit: 2_000_000,
          type: 2,
          maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.utils.parseUnits('1.5', 'gwei'),
        },
      )

      let receipt: ethers.providers.TransactionReceipt
      try {
        receipt = await tx.wait()
      } catch (waitErr) {
        // pallet-revive receipt status bug: verify nullifier state instead
        const pool = new ethers.Contract(poolAddress, DUST_POOL_V2_ABI as unknown as ethers.ContractInterface, sponsor.provider)
        const null0Spent = await pool.nullifiers(nullifier0Hex)
        if (null0Spent) {
          receipt = await sponsor.provider.getTransactionReceipt(tx.hash)
        } else {
          throw waitErr
        }
      }

      // Parse PrivateSwapExecuted from adapter logs — commitment computed on-chain via Poseidon
      let outputCommitment: string | null = null
      let outputAmount: string | null = null
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === adapterAddress.toLowerCase()) {
          try {
            const parsed = adapter.interface.parseLog(log)
            if (parsed.name === 'PrivateSwapExecuted') {
              outputCommitment = parsed.args.outputCommitment
              outputAmount = parsed.args.outputAmount.toString()
            }
          } catch { /* not our event */ }
        }
      }

      if (!outputCommitment || !outputAmount) {
        return NextResponse.json(
          { error: 'PrivateSwapExecuted event not found in receipt' },
          { status: 500, headers: NO_STORE },
        )
      }

      // Parse DepositQueued from DustPoolV2 for the output UTXO queue index
      const pool = new ethers.Contract(
        poolAddress,
        DUST_POOL_V2_ABI as unknown as ethers.ContractInterface,
        sponsor.provider,
      )
      let queueIndex: number | null = null
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === poolAddress.toLowerCase()) {
          try {
            const parsed = pool.interface.parseLog(log)
            if (parsed.name === 'DepositQueued') {
              queueIndex = parsed.args.queueIndex.toNumber()
            }
          } catch { /* not our event */ }
        }
      }

      const chainStr = String(chainId)
      incrementSwap(chainStr)
      recordProofVerification(chainStr, 'v2_transaction', true)
      observeGasUsed(chainStr, 'swap', receipt.gasUsed.toNumber())

      console.log(
        `[V2/swap] Success: nullifier=${nullifier0.slice(0, 18)}... tx=${receipt.transactionHash}`,
      )

      // Best-effort resync — don't lose the txHash if tree sync fails
      try {
        await syncAndPostRoot(chainId)
      } catch (syncErr) {
        console.error('[V2/swap] Post-TX tree sync failed (non-fatal):', syncErr)
      }

      return NextResponse.json(
        {
          txHash: receipt.transactionHash,
          outputCommitment,
          outputAmount,
          queueIndex,
          blockNumber: receipt.blockNumber,
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
    else if (raw.includes('InvalidChainId')) message = 'Invalid chain ID in proof'
    else if (raw.includes('Sponsor not configured')) message = 'Relayer key not configured'

    return NextResponse.json({ error: message, detail: raw.slice(0, 500) }, { status: 500, headers: NO_STORE })
  }
}
