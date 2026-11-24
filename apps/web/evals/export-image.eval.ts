import { defineEval } from "eve/evals";
import { browser, tool } from "./stubs";

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
  },
});
