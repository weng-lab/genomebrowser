import { defineAgent } from "eve";
import { defineDynamic } from "eve/models";
import { chatgpt } from "eve/models/openai";

export default defineAgent({
  model: defineDynamic(() =>
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.NODE_ENV === "production"
      ? "openai/gpt-6-luna"
      : chatgpt("gpt-6-luna-fast"),
  ),
  defaultTools: false,
});
