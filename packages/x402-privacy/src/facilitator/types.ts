export type FacilitatorEvmSigner = {
  getAddresses(): readonly `0x${string}`[];
  readContract(args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }): Promise<unknown>;
  writeContract(args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }): Promise<`0x${string}`>;
  waitForTransactionReceipt(args: {
    hash: `0x${string}`;
  }): Promise<{ status: string }>;
  verifyTypedData(args: Record<string, unknown>): Promise<boolean>;
  sendTransaction(args: Record<string, unknown>): Promise<`0x${string}`>;
  getCode(args: {
    address: `0x${string}`;
  }): Promise<`0x${string}` | undefined>;
};
