import { readFileSync } from "node:fs";
import { URL as NodeURL } from "node:url";
export const standardRepeatFile = new Uint8Array(
  readFileSync(
    new NodeURL("../../../reader/test/fixtures/bigbed/repeatmasker.bb", import.meta.url),
  ),
);
export { serveBigRmsk as serveRepeats } from "./bigRmsk";
