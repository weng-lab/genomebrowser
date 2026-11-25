import { defineEvalConfig } from "eve/evals";

// Run with the app up (`pnpm dev`): the agent lists its browser tools from the
// app's MCP endpoint, though every call answers from the evals' stubs.
export default defineEvalConfig({});
