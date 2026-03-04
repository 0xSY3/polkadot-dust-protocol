declare module "circomlibjs" {
  export function buildPoseidon(): Promise<PoseidonInstance>;

  interface PoseidonInstance {
    (inputs: bigint[]): Uint8Array;
    F: {
      toObject(val: Uint8Array): bigint;
    };
  }
}
