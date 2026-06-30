import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react],
  ignorePatterns: core.ignorePatterns,
  rules: {
    "func-style": "off",
    "unicorn/filename-case": "off",
  },
});

//Filename should be in kebab-case
// help: Rename the file to 'data-store.ts'
