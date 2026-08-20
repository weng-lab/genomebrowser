import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDirectory = resolve(packageDirectory, "../app");
const manifest = JSON.parse(await readFile(resolve(packageDirectory, "package.json"), "utf8"));
const temporaryDirectory = await mkdtemp(resolve(appDirectory, ".verify-trackselect-"));

try {
  await writeFile(
    resolve(temporaryDirectory, "trackselect.config.ts"),
    `import { defineTrackSelectConfig } from "@weng-lab/genomebrowser-ui/cli";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";

export default defineTrackSelectConfig({
  modules: firstPartyTrackModules,
  schema: { outFile: "trackSelectCollection.schema.json" },
});
`,
  );

  const trackselectPath = resolve(packageDirectory, manifest.bin.trackselect);
  const result = spawnSync(process.execPath, [trackselectPath, "schema"], {
    cwd: temporaryDirectory,
    encoding: "utf8",
  });
  assert(
    result.status === 0,
    `trackselect schema smoke test failed:\n${result.stderr || result.stdout}`,
  );

  const schema = JSON.parse(
    await readFile(resolve(temporaryDirectory, "trackSelectCollection.schema.json"), "utf8"),
  );
  assert(
    schema?.properties?.tracks?.items?.oneOf?.length === firstPartyTrackModules.length,
    "trackselect schema must include all first-party modules",
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log("Verified the built TrackSelect CLI and Jiti config workflow.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
