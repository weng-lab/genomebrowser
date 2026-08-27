#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, dirname, resolve } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { createModuleRegistry, type AnyTrackModule } from "@weng-lab/genomebrowser";
import { createJiti } from "jiti";
import { generateTrackCollectionJsonSchema } from "./TrackSelect/schema/generateJsonSchema";

const defaultSchemaOutFile = "trackSelectCollection.schema.json";

type SchemaCommand = {
  sources: string[];
  outFile: string;
  id?: string;
  check: boolean;
};

async function main() {
  const command = parseCommand(process.argv.slice(2));
  if (!command) return;

  const modules = await loadTrackModules(command.sources, process.cwd());
  const registry = createModuleRegistry(modules);
  const generatedSchema = generateTrackCollectionJsonSchema(registry);
  const schema = command.id ? { $id: command.id, ...generatedSchema } : generatedSchema;
  const contents = `${JSON.stringify(schema, null, 2)}\n`;

  writeSchema(contents, command, process.cwd());
  reportModules(modules, command.outFile);
}

function parseCommand(args: string[]): SchemaCommand | undefined {
  const { values, positionals } = parseArgs({
    args,
    options: {
      from: { type: "string", multiple: true },
      out: { type: "string", short: "o", default: defaultSchemaOutFile },
      id: { type: "string" },
      check: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  const [name, ...unexpected] = positionals;
  if (values.help || !name) {
    printHelp();
    return undefined;
  }
  if (name !== "schema") {
    throw new Error(`Unknown command "${name}". Run trackselect --help for usage.`);
  }
  if (unexpected.length > 0) {
    throw new Error(`Unexpected argument "${unexpected[0]}". Module sources use --from.`);
  }
  if (!values.from?.length) {
    throw new Error("schema requires at least one --from module source");
  }
  if (!values.out) {
    throw new Error("--out must not be empty");
  }
  if (values.id !== undefined && values.id.length === 0) {
    throw new Error("--id must not be empty");
  }
  if (values.check && values.out === "-") {
    throw new Error("--check cannot be used with --out -");
  }

  return {
    sources: values.from,
    outFile: values.out,
    ...(values.id === undefined ? {} : { id: values.id }),
    check: values.check,
  };
}

async function loadTrackModules(sources: string[], cwd: string): Promise<AnyTrackModule[]> {
  const jiti = createJiti(resolve(cwd, ".trackselect-loader.mjs"), {
    interopDefault: false,
  });
  const modulesBySource = await Promise.all(
    sources.map(async (source) => {
      const reference = parseSourceReference(source);
      const specifier = resolveSpecifier(reference.specifier, cwd);
      let imported: unknown;
      try {
        imported = await jiti.import(specifier);
      } catch (error) {
        throw new Error(`Could not import track modules from "${source}": ${errorMessage(error)}`);
      }
      return selectTrackModules(imported, reference.exportName, source);
    }),
  );

  return modulesBySource.flat();
}

function parseSourceReference(source: string) {
  const separator = source.lastIndexOf("#");
  const specifier = separator === -1 ? source : source.slice(0, separator);
  const exportName = separator === -1 ? undefined : source.slice(separator + 1);
  if (!specifier) throw new Error(`Invalid empty module source "${source}"`);
  if (exportName !== undefined && !exportName) {
    throw new Error(`Module source "${source}" has an empty export name`);
  }
  return { specifier, exportName };
}

function resolveSpecifier(specifier: string, cwd: string) {
  return specifier.startsWith(".") || isAbsolute(specifier) ? resolve(cwd, specifier) : specifier;
}

function selectTrackModules(imported: unknown, exportName: string | undefined, source: string) {
  if (exportName !== undefined) {
    if (!isObject(imported) || !(exportName in imported)) {
      throw new Error(`Module source "${source}" does not export "${exportName}"`);
    }
    return assertTrackModuleValue(imported[exportName], source);
  }

  if (isTrackModuleValue(imported)) return normalizeTrackModuleValue(imported);
  if (isObject(imported) && isTrackModuleValue(imported.default)) {
    return normalizeTrackModuleValue(imported.default);
  }
  if (!isObject(imported)) {
    throw new Error(`Module source "${source}" does not export a track module or module array`);
  }

  const candidates = Object.entries(imported).filter(([, value]) => isTrackModuleValue(value));
  if (candidates.length === 1) return assertTrackModuleValue(candidates[0]![1], source);
  if (candidates.length === 0) {
    throw new Error(`Module source "${source}" does not export a track module or module array`);
  }
  throw new Error(
    `Module source "${source}" has multiple track-module exports (${candidates
      .map(([name]) => name)
      .join(", ")}); select one with "${source}#exportName"`,
  );
}

function assertTrackModuleValue(value: unknown, source: string) {
  if (!isTrackModuleValue(value)) {
    throw new Error(`Selected export from "${source}" is not a track module or module array`);
  }
  return normalizeTrackModuleValue(value);
}

function isTrackModuleValue(value: unknown): value is AnyTrackModule | AnyTrackModule[] {
  return (
    isTrackModule(value) || (Array.isArray(value) && value.length > 0 && value.every(isTrackModule))
  );
}

function normalizeTrackModuleValue(value: AnyTrackModule | AnyTrackModule[]) {
  return Array.isArray(value) ? value : [value];
}

function isTrackModule(value: unknown): value is AnyTrackModule {
  return isObject(value) && typeof value.type === "string" && "createInputSchema" in value;
}

function writeSchema(contents: string, command: SchemaCommand, cwd: string) {
  if (command.outFile === "-") {
    process.stdout.write(contents);
    return;
  }

  const outPath = resolve(cwd, command.outFile);
  if (command.check) {
    let existing: string;
    try {
      existing = readFileSync(outPath, "utf8");
    } catch {
      throw new Error(`Schema is missing or unreadable: ${outPath}`);
    }
    if (existing !== contents) {
      throw new Error(`Schema is stale: ${outPath}. Run trackselect schema without --check.`);
    }
    console.log(`Schema is up to date: ${outPath}`);
    return;
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, contents);
  console.log(`Wrote ${outPath}`);
}

function reportModules(modules: AnyTrackModule[], outFile: string) {
  const message = `Loaded track modules: ${modules.map((module) => module.type).join(", ")}`;
  if (outFile === "-") console.error(message);
  else console.log(message);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function printHelp() {
  console.log(`Usage: trackselect schema --from <module[#export]> [options]

Generate TrackSelect JSON Schema from application track modules.

Options:
  --from <source>  Module exporting one track module or an array; repeatable
  -o, --out <file> Output file (default: ${defaultSchemaOutFile}; use - for stdout)
  --id <uri>       Add a JSON Schema $id
  --check          Fail when the output file is missing or stale
  -h, --help       Show this help`);
}

main().catch((error: unknown) => {
  console.error(`trackselect: ${errorMessage(error)}`);
  process.exitCode = 1;
});
