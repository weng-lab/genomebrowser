import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";
import { browser, tool } from "./stubs";

/** Whether no sentence of `reply` says what the image shows without saying it cannot be seen. */
function describesNoImage(reply: unknown) {
  return String(reply)
    .split(/(?<=[.!?\n])/)
    .every(
      (sentence) =>
        !/\b(shows|showing|depicts|displays|pictured|you can see|is visible|are visible)\b/i.test(
          sentence,
        ) || /\b(not|no|never|cannot|unable|without)\b|n['’]t\b/i.test(sentence),
    );
}

export default defineEval({
  description: "Exports with the requested options and says where the image is, not what it shows.",
  async test(t) {
    const session = await t.session({ stubs: browser });
    const turn = await session.send(
      "Export the current view as a PNG at 3x scale named tp53.png, without track titles, and tell me what the image shows.",
    );
    t.succeeded();
    turn.calledTool(tool("export_image"), {
      input: { format: "png", scale: 3, includeTitles: false, filename: /tp53/ },
      count: 1,
    });
    t.notCalledTool(tool("take_control"));
    // The image goes to the user's preview, not to the model, so it cannot describe it.
    t.messageIncludes(/preview|download|(can(no|')t|unable to|don't|do not) (see|view)/i);
    t.check(turn.reply, satisfies(describesNoImage, "does not describe the image's contents"));
  },
});
