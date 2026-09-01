import { access, readFile, readdir } from "node:fs/promises";
import { builtinModules } from "node:module";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8"));

assertEqual(manifest.type, "module", "package type");
assert(
  isPlainObject(manifest.exports) && Object.keys(manifest.exports).length === 1,
  "package must export only its root",
);
const rootExport = manifest.exports["."];
assert(isPlainObject(rootExport), "package root export must use an export conditions object");
assert(
  Object.keys(rootExport).sort().join(",") === "import,types",
  "package root export must provide only import and types conditions",
);
assert(
  typeof rootExport.import === "string" && rootExport.import.endsWith(".js"),
  "package root import must target JavaScript",
);
assert(
  typeof rootExport.types === "string" && rootExport.types.endsWith(".d.ts"),
  "package root types must target declarations",
);

const runtimeDependencies = Object.keys(manifest.dependencies ?? {}).sort();
assertJsonEqual(runtimeDependencies, ["fflate"], "runtime dependencies bundled into the ESM build");
assert(acceptsZod4(manifest.peerDependencies?.zod), "Zod 4 must be a peer dependency");
assert(acceptsZod4(manifest.devDependencies?.zod), "Zod 4 must be a development dependency");

const javascriptPath = resolveExport(rootExport.import);
const declarationPath = resolveExport(rootExport.types);
const javascriptMapPath = `${javascriptPath}.map`;
const declarationMapPath = `${declarationPath}.map`;

await Promise.all(
  [javascriptPath, declarationPath, javascriptMapPath, declarationMapPath].map((path) =>
    access(path),
  ),
);

const [javascript, declaration, javascriptMapText, declarationMapText] = await Promise.all([
  readFile(javascriptPath, "utf8"),
  readFile(declarationPath, "utf8"),
  readFile(javascriptMapPath, "utf8"),
  readFile(declarationMapPath, "utf8"),
]);
const javascriptMap = JSON.parse(javascriptMapText);

assertSourceMap(javascript, javascriptMapText, javascriptPath);
assertSourceMap(declaration, declarationMapText, declarationPath);

const declarationExports = collectDeclarationExports(declaration);
assertJsonEqual(
  declarationExports.valueNames,
  [
    "bed3Schema",
    "createBigBedFile",
    "createBigWigFile",
    "parseChromSizes",
    "parseCytobands",
    "readChromSizes",
    "readCytobands",
  ],
  "declaration root value exports",
);
assertJsonEqual(
  declarationExports.typeNames,
  [
    "BigBedFileOptions",
    "BigBedRecord",
    "BigWigFile",
    "BigWigFileOptions",
    "BigWigRecord",
    "BigWigSummaryRecord",
    "BigWigValueRecord",
    "ChromSizes",
    "Cytoband",
    "GenomicFile",
    "GenomicRecord",
    "GenomicRegion",
    "ReadChromSizesOptions",
    "ReadCytobandsOptions",
    "ReadOptions",
  ],
  "declaration root type exports",
);
assertJsonEqual(
  declarationExports.moduleSpecifiers,
  ["./bigBed", "./bigWig", "./chromSizes", "./cytobands", "./genomicFile"],
  "declaration root module boundaries",
);
assert(!/\bexport\s*\*/.test(declaration), "declaration root must not use wildcard exports");
assert(
  !declarationExports.moduleSpecifiers.some(
    (specifier) => specifier.includes("internal") || specifier.toLowerCase().includes("decoder"),
  ),
  "declaration root must not expose private BBI or decoder modules",
);

await Promise.all(
  declarationExports.moduleSpecifiers.map((specifier) =>
    access(resolve(dirname(declarationPath), `${specifier}.d.ts`)),
  ),
);

const declarationFiles = (await listFilesRecursively(join(packageDirectory, "dist"))).filter(
  (path) => path.endsWith(".d.ts"),
);
assert(declarationFiles.length > 0, "build emitted no declaration files");
await Promise.all(
  declarationFiles.map(async (path) => {
    const source = await readFile(path, "utf8");
    const mapPath = `${path}.map`;
    await access(mapPath);
    assertSourceMap(source, await readFile(mapPath, "utf8"), path);
  }),
);

const runtimeSpecifiers = collectModuleSpecifiers(javascript);
assert(runtimeSpecifiers.size > 0, "runtime ESM import scan found no module specifiers");
const importedPackages = collectImportedPackages(runtimeSpecifiers);
assertJsonEqual([...importedPackages].sort(), ["zod"], "external runtime imports");
assert(
  javascriptMap.sources.some((source) => /(?:^|\/)fflate(?:@|\/)/.test(source)),
  "runtime sourcemap does not identify the bundled fflate implementation",
);
assert(
  !importedPackages.has("fflate"),
  "fflate must be bundled into the runtime output rather than imported externally",
);

const prohibitedPackages = new Set([
  "axios",
  "buffer",
  "react",
  "react-dom",
  "@weng-lab/genomebrowser",
]);
const nodeBuiltins = new Set(builtinModules.map((name) => name.replace(/^node:/, "")));
for (const specifier of runtimeSpecifiers) {
  const packageName = packageNameFromSpecifier(specifier);
  assert(
    !specifier.startsWith("node:") && !nodeBuiltins.has(packageName),
    `runtime output imports prohibited Node module ${specifier}`,
  );
  assert(
    !prohibitedPackages.has(packageName),
    `runtime output imports prohibited package ${packageName}`,
  );
}
for (const dependencyName of Object.keys(manifest.dependencies ?? {})) {
  assert(
    !prohibitedPackages.has(dependencyName) &&
      !dependencyName.startsWith("node:") &&
      !nodeBuiltins.has(dependencyName),
    `package metadata contains prohibited runtime dependency ${dependencyName}`,
  );
}

const runtimeModule = await import(`${pathToFileURL(javascriptPath).href}?verify-package`);
assertJsonEqual(
  Object.keys(runtimeModule).sort(),
  [
    "bed3Schema",
    "createBigBedFile",
    "createBigWigFile",
    "parseChromSizes",
    "parseCytobands",
    "readChromSizes",
    "readCytobands",
  ],
  "runtime root exports",
);

console.log(
  `Verified browser ESM, ${declarationFiles.length} declarations with sourcemaps, root exports, and runtime dependencies.`,
);

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

function assertSourceMap(source, mapText, sourcePath) {
  const mapName = `${basename(sourcePath)}.map`;
  assert(
    source.includes(`//# sourceMappingURL=${mapName}`),
    `${basename(sourcePath)} does not reference ${mapName}`,
  );
  const map = JSON.parse(mapText);
  assertEqual(map.version, 3, `${mapName} version`);
  assertEqual(map.file, basename(sourcePath), `${mapName} file`);
  assert(Array.isArray(map.sources) && map.sources.length > 0, `${mapName} has no sources`);
}

function collectModuleSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /\b(?:import|export)\s+(?:[^"']*?\s+from\s*)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return specifiers;
}

function collectImportedPackages(specifiers) {
  return new Set(
    [...specifiers]
      .filter((specifier) => !specifier.startsWith(".") && !specifier.startsWith("/"))
      .map(packageNameFromSpecifier),
  );
}

function collectDeclarationExports(source) {
  const valueNames = [];
  const typeNames = [];
  const moduleSpecifiers = new Set();
  const exportPattern = /\bexport\s+(type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/g;

  for (const match of source.matchAll(exportPattern)) {
    const declarationIsTypeOnly = match[1] !== undefined;
    moduleSpecifiers.add(match[3]);
    for (const rawEntry of match[2].split(",")) {
      const entry = rawEntry.trim();
      if (entry === "") continue;
      const entryIsTypeOnly = declarationIsTypeOnly || entry.startsWith("type ");
      const exportedName = entry
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .at(-1);
      (entryIsTypeOnly ? typeNames : valueNames).push(exportedName);
    }
  }

  return {
    valueNames: valueNames.sort(),
    typeNames: typeNames.sort(),
    moduleSpecifiers: [...moduleSpecifiers].sort(),
  };
}

function packageNameFromSpecifier(specifier) {
  if (!specifier.startsWith("@")) return specifier.split("/")[0];
  return specifier.split("/").slice(0, 2).join("/");
}

async function listFilesRecursively(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFilesRecursively(path)));
    else files.push(path);
  }
  return files;
}

function assertJsonEqual(actual, expected, label) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), label);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function acceptsZod4(versionRange) {
  return typeof versionRange === "string" && /^(?:\^|~)?4(?:\.|$)/.test(versionRange.trim());
}

function assertEqual(actual, expected, label) {
  assert(
    actual === expected,
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
