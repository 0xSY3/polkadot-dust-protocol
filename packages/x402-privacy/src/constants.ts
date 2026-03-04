export const SCHEME_NAME = "shielded";
export const BN254_FIELD_SIZE =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
export const TREE_DEPTH = 20;
export const MAX_AMOUNT = (1n << 64n) - 1n;
export const ZERO_VALUE = 0n;

// DustPoolV2 addresses per CAIP-2 network
export const POOL_ADDRESSES: Record<string, `0x${string}`> = {
  "eip155:84532": "0x17f52f01ffcB6d3C376b2b789314808981cebb16",  // Base Sepolia
  "eip155:11155111": "0x3cbf3459e7E0E9Fd2fd86a28c426CED2a60f023f", // Eth Sepolia
};

export const VERIFIER_ADDRESSES: Record<string, `0x${string}`> = {
  "eip155:84532": "0xe51ebD6B1F1ad7d7E4874Bb7D4E53a0504cCf652",
  "eip155:11155111": "0xd0f5aB15Ef3C882EB4341D38A3183Cc1FDcCFD8a",
};

// Default stablecoins per network (same as @x402/evm exact scheme)
export const DEFAULT_ASSETS: Record<string, { address: `0x${string}`; decimals: number }> = {
  "eip155:84532": { address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", decimals: 6 },
  "eip155:11155111": { address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6 },
  "eip155:8453": { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
};

// DustPoolV2 ABI (subset needed for verify + settle)
export const DUST_POOL_V2_ABI = [
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "merkleRoot", type: "bytes32" },
      { name: "nullifier0", type: "bytes32" },
      { name: "nullifier1", type: "bytes32" },
      { name: "outCommitment0", type: "bytes32" },
      { name: "outCommitment1", type: "bytes32" },
      { name: "publicAmount", type: "uint256" },
      { name: "publicAsset", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "tokenAddress", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "isKnownRoot",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "root", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "nullifiers",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "depositERC20",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "commitment", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [],
  },
] as const;

// FFLONK verifier ABI (on-chain proof verification)
export const FFLONK_VERIFIER_ABI = [
  {
    name: "verifyProof",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "pubSignals", type: "uint256[9]" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

// DepositQueued event for tree indexing
export const DEPOSIT_QUEUED_EVENT = {
  type: "event",
  name: "DepositQueued",
  inputs: [
    { name: "commitment", type: "bytes32", indexed: true },
    { name: "queueIndex", type: "uint256", indexed: false },
    { name: "amount", type: "uint256", indexed: false },
    { name: "asset", type: "address", indexed: false },
    { name: "timestamp", type: "uint256", indexed: false },
  ],
} as const;
