export { ShieldedEvmClientScheme } from "./scheme";
export type { ShieldedClientOptions } from "./scheme";
export { registerShieldedEvmScheme } from "./register";
export type { ShieldedClientConfig } from "./register";
export { UtxoStore } from "./utxo-store";
export { buildPaymentInputs, formatCircuitInputs } from "./proof-inputs";
export type { PaymentInputParams, ProofInputs } from "./proof-inputs";
export { createDepositCommitment, depositETH, depositERC20 } from "./deposit";
export type { DepositResult, DepositWalletClient, DepositPublicClient } from "./deposit";
