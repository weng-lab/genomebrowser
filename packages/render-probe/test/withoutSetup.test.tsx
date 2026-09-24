import { expect, it } from "vitest";
import { renderWithProbe } from "../src";

it("names the missing setupFiles entry when the setup module has not run", async () => {
  await expect(renderWithProbe(<div />)).rejects.toThrow(
    '"@weng-lab/render-probe/setup" to `test.setupFiles`',
  );
});
