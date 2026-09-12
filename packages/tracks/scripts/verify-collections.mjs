import { deepStrictEqual } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  await readFile(resolve(packageDirectory, "../core/package.json"), "utf8"),
);
const temporaryDirectory = await mkdtemp(
  resolve(packageDirectory, "node_modules/.verify-genomebrowser-"),
);

try {
  await writeFile(
    resolve(temporaryDirectory, "trackModules.ts"),
    `export { firstPartyTrackModules as trackModules } from "../../dist/genomebrowser-tracks.es.js";
`,
  );

  const genomebrowserPath = resolve(packageDirectory, "../core", manifest.bin.genomebrowser);
  const schemaArguments = [
    genomebrowserPath,
    "schema",
    "--from",
    "./trackModules.ts#trackModules",
    "--out",
    "trackCollection.schema.json",
  ];
  const result = spawnSync(process.execPath, schemaArguments, {
    cwd: temporaryDirectory,
    encoding: "utf8",
  });
  assert(
    result.status === 0,
    `genomebrowser schema smoke test failed:\n${result.stderr || result.stdout}`,
  );

  const schema = JSON.parse(
    await readFile(resolve(temporaryDirectory, "trackCollection.schema.json"), "utf8"),
  );
  assert(
    schema?.properties?.tracks?.items?.oneOf?.length === firstPartyTrackModules.length,
    "genomebrowser schema must include all first-party modules",
  );

  const shippedSchema = JSON.parse(
    await readFile(
      new URL(import.meta.resolve("@weng-lab/genomebrowser-tracks/trackCollection.schema.json")),
      "utf8",
    ),
  );
  deepStrictEqual(
    shippedSchema,
    schema,
    "Shipped first-party collection schema is stale; regenerate it with the collection CLI.",
  );

  const checkResult = spawnSync(process.execPath, [...schemaArguments, "--check"], {
    cwd: temporaryDirectory,
    encoding: "utf8",
  });
  assert(
    checkResult.status === 0,
    `genomebrowser schema --check smoke test failed:\n${checkResult.stderr || checkResult.stdout}`,
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log("Verified the built collection CLI module-loading workflow.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
