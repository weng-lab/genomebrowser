import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(packageDirectory, "package.json"), "utf8"));
assertEqual(manifest.sideEffects, false, "package sideEffects declaration");
const trackNames = ["bigbed", "bigwig", "bulkbed", "cave", "ccre", "methylc", "transcript"];
const expectedRuntimeExports = new Map([
  ["./bigbed", ["bigBedModule", "fetchBigBedRows"]],
  ["./bigwig", ["bigWigModule"]],
  ["./bulkbed", ["bulkBedModule"]],
  ["./cave", ["caveModule"]],
  ["./ccre", ["ccreBigBedModule", "ccreBigBedSchema"]],
  ["./methylc", ["methylCModule"]],
  ["./transcript", ["transcriptModule"]],
  [
    "./shared",
    [
      "TrackBaseSettings",
      "TrackSettingsColorField",
      "TrackSettingsFieldGrid",
      "TrackSettingsFieldRow",
      "TrackSettingsFullRow",
      "TrackSettingsLayout",
      "TrackSettingsNumberField",
      "TrackSettingsRangeFields",
      "TrackSettingsSection",
      "TrackSettingsTextField",
      "TrackSettingsUrlField",
      "TrackTooltip",
      "clientXToTrackX",
      "condenseSignalRecords",
      "createGenomicXScale",
      "formatGenomicInterval",
      "formatOptionalBedValue",
      "formatSignalValue",
      "isRowLayoutConfig",
      "packRows",
      "rowCountFromTrackHeight",
      "rowHeightFromTrackHeight",
      "trackHeightFromRowCount",
      "useRowLayout",
    ],
  ],
  [".", ["firstPartyTrackModules"]],
]);

assertEqual(
  JSON.stringify(Object.keys(manifest.exports).sort()),
  JSON.stringify([...expectedRuntimeExports.keys()].sort()),
  "public package subpaths",
);

for (const [subpath, expectedExports] of expectedRuntimeExports) {
  const conditions = manifest.exports[subpath];
  assert(isObject(conditions), `${subpath} must use export conditions`);
  assert(typeof conditions.import === "string", `${subpath} import condition is missing`);
  assert(typeof conditions.types === "string", `${subpath} types condition is missing`);
  const expectedDeclaration =
    subpath === "." ? "./dist/src/lib.d.ts" : `./dist/src/${subpath.slice(2)}/index.d.ts`;
  assertEqual(conditions.types, expectedDeclaration, `${subpath} declaration entry`);

  const javascriptPath = resolveExport(conditions.import);
  const declarationPath = resolveExport(conditions.types);
  await Promise.all([access(javascriptPath), access(declarationPath)]);

  const runtimeModule = await import(`${pathToFileURL(javascriptPath).href}?verify-package`);
  assertEqual(
    JSON.stringify(Object.keys(runtimeModule).sort()),
    JSON.stringify([...expectedExports].sort()),
    `${subpath} runtime exports`,
  );

  const sources = await collectReachableSources(javascriptPath);
  const loadedTrackModules = trackNames.filter((trackName) =>
    sources.some((source) =>
      new RegExp(`(?:^|/)src/${trackName}/index\\.[cm]?[jt]sx?$`).test(source),
    ),
  );
  const expectedTracks =
    subpath === "." ? trackNames : trackNames.filter((name) => subpath === `./${name}`);
  assertEqual(
    JSON.stringify(loadedTrackModules),
    JSON.stringify(expectedTracks),
    `${subpath} loaded track implementations`,
  );

  for (const javascript of await collectReachableJavaScript(javascriptPath)) {
    const source = await readFile(javascript, "utf8");
    assert(
      !source.includes("@weng-lab/genomebrowser-ui"),
      `${subpath} imports @weng-lab/genomebrowser-ui`,
    );
  }
}

console.log(
  "Verified all built tracks subpaths, declarations, exports, and isolated entry graphs.",
);

async function collectReachableSources(entryPath) {
  const sources = [];
  for (const javascriptPath of await collectReachableJavaScript(entryPath)) {
    try {
      const sourceMap = JSON.parse(await readFile(`${javascriptPath}.map`, "utf8"));
      sources.push(...sourceMap.sources);
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
  }
  return sources;
}

async function collectReachableJavaScript(entryPath) {
  const visited = new Set();
  const pending = [entryPath];
  while (pending.length > 0) {
    const javascriptPath = pending.pop();
    if (visited.has(javascriptPath)) continue;
    visited.add(javascriptPath);
    const source = await readFile(javascriptPath, "utf8");
    for (const specifier of collectRelativeSpecifiers(source)) {
      pending.push(resolve(dirname(javascriptPath), specifier));
    }
  }
  return visited;
}

function collectRelativeSpecifiers(source) {
  const specifiers = [];
  const pattern = /\b(?:import|export)\s+(?:[^"']*?\s+from\s*)?["'](\.[^"']+)["']/g;
  for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

function resolveExport(exportPath) {
  assert(typeof exportPath === "string" && exportPath.startsWith("./"), "invalid export path");
  const resolved = resolve(packageDirectory, exportPath);
  const relativePath = relative(packageDirectory, resolved);
  assert(
    !relativePath.startsWith("..") && !isAbsolute(relativePath),
    `export path escapes package directory: ${exportPath}`,
  );
  return resolved;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMissingFileError(error) {
  return isObject(error) && error.code === "ENOENT";
}

function assertEqual(actual, expected, label) {
  assert(actual === expected, `${label}: expected ${expected}, got ${actual}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
