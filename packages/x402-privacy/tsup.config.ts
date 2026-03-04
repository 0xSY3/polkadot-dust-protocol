import { defineConfig } from "tsup";

const baseConfig = {
  entry: {
    index: "src/index.ts",
    "client/index": "src/client/index.ts",
    "facilitator/index": "src/facilitator/index.ts",
    "server/index": "src/server/index.ts",
    "tree/index": "src/tree/index.ts",
    "crypto/index": "src/crypto/index.ts",
  },
  dts: { resolve: true },
  sourcemap: true,
  target: "es2020" as const,
};

export default defineConfig([
  { ...baseConfig, format: "esm", outDir: "dist/esm", clean: true },
  { ...baseConfig, format: "cjs", outDir: "dist/cjs", clean: false },
]);
