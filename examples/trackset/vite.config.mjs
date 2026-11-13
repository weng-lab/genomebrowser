import { fileURLToPath } from "node:url";
const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));
export default {
  root: path("."),
  resolve: {
    alias: {
      "@weng-lab/genomebrowser-ui": path("../../packages/ui/src/lib.ts"),
      "@weng-lab/genomebrowser-tracks/bigwig": path("../../packages/tracks/src/bigwig/index.ts"),
      "@weng-lab/genomebrowser-tracks/bigbed": path("../../packages/tracks/src/bigbed/index.ts"),
      "@weng-lab/genomebrowser-tracks/ruler": path("../../packages/tracks/src/ruler/index.ts"),
      "@weng-lab/genomebrowser": path("../../packages/core/src/lib.ts"),
      react: path("../../packages/ui/node_modules/react"),
      "react-dom": path("../../packages/ui/node_modules/react-dom"),
      "@mui/material": path("../../packages/ui/node_modules/@mui/material/esm"),
      "@emotion/react": path("../../packages/ui/node_modules/@emotion/react"),
      "@emotion/styled": path("../../packages/ui/node_modules/@emotion/styled"),
    },
  },
  server: { host: "127.0.0.1", port: 4175, strictPort: true, fs: { allow: [path("../..")] } },
  build: { outDir: "dist", emptyOutDir: true },
};
