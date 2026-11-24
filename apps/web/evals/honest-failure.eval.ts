import { defineEval } from "eve/evals";
import { satisfies } from "eve/evals/expect";
import { browser, tool } from "./stubs";

const url = "https://users.wenglab.org/niship/does-not-exist.bw";

export default defineEval({
  description: "Reports a failed tool call as failed, never as done.",
  async test(t) {
    const session = await t.session({
      stubs: [
        {
          id: "add-fails",
          tool: tool("add_tracks_from_urls"),
          outcome: {
            throw: { message: `No tracks were added: ${url} could not be read (HTTP 404)` },
          },
        },
        ...browser,
      ],
    });
    const turn = await session.send(`Add the bigwig track at ${url}.`);
    turn.expectOk();
    t.calledTool(tool("add_tracks_from_urls"), { status: "failed" });
    t.messageIncludes(/could(n't| not)|fail|unable|404/i);
    t.check(
      turn.reply,
      satisfies(
        (reply) => !/successfully added|has been added|added the track/i.test(String(reply)),
        "does not claim the track was added",
      ),
    );
  },
});
