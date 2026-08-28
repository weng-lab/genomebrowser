import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      "@weng-lab/genomebrowser": "../../packages/core/src/lib.ts",
      "@weng-lab/genomebrowser-tracks": "../../packages/tracks/src/lib.ts",
      "@weng-lab/genomebrowser-tracks/bigbed": "../../packages/tracks/src/bigbed/index.ts",
      "@weng-lab/genomebrowser-tracks/bigwig": "../../packages/tracks/src/bigwig/index.ts",
      "@weng-lab/genomebrowser-tracks/bulkbed": "../../packages/tracks/src/bulkbed/index.ts",
      "@weng-lab/genomebrowser-tracks/cave": "../../packages/tracks/src/cave/index.ts",
      "@weng-lab/genomebrowser-tracks/ccre": "../../packages/tracks/src/ccre/index.ts",
      "@weng-lab/genomebrowser-tracks/gene": "../../packages/tracks/src/gene/index.ts",
      "@weng-lab/genomebrowser-tracks/methylc": "../../packages/tracks/src/methylc/index.ts",
      "@weng-lab/genomebrowser-tracks/shared": "../../packages/tracks/src/shared/index.ts",
      "@weng-lab/genomebrowser-tracks/transcript": "../../packages/tracks/src/transcript/index.ts",
      "@weng-lab/genomebrowser-ui": "../../packages/ui/src/lib.ts",
      "@weng-lab/genomic-reader": "../../packages/reader/src/lib.ts",
    },
  },
};

export default nextConfig;
