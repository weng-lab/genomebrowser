import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      compilerOptions: { declarationMap: true },
      entryRoot: "src",
      exclude: ["test"],
      tsconfigPath: "./tsconfig.json",
    }),
  ],
  build: {
    lib: {
      entry: "src/lib.ts",
      name: "genomicReader",
      fileName: (format) => `genomic-reader.${format}.js`,
      formats: ["es"],
    },
    sourcemap: true,
    rollupOptions: {
      external: ["zod"],
      output: {
        sourcemapExcludeSources: true,
      },
    },
  },
});
