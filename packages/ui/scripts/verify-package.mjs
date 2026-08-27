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
    resolve(temporaryDirectory, "trackModules.ts"),
    `export { firstPartyTrackModules as trackModules } from "@weng-lab/genomebrowser-tracks";
`,
  );

  const trackselectPath = resolve(packageDirectory, manifest.bin.trackselect);
  const schemaArguments = [
    trackselectPath,
    "schema",
    "--from",
    "./trackModules.ts#trackModules",
    "--out",
    "trackSelectCollection.schema.json",
  ];
  const result = spawnSync(process.execPath, schemaArguments, {
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

  const checkResult = spawnSync(process.execPath, [...schemaArguments, "--check"], {
    cwd: temporaryDirectory,
    encoding: "utf8",
  });
  assert(
    checkResult.status === 0,
    `trackselect schema --check smoke test failed:\n${checkResult.stderr || checkResult.stdout}`,
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log("Verified the built TrackSelect CLI module-loading workflow.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
