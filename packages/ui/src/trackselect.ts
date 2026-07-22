#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { createJiti } from "jiti";
import { createModuleRegistry } from "@weng-lab/genomebrowser";
import type { AnyTrackModule } from "@weng-lab/genomebrowser";
import { generateTrackCatalogJsonSchema } from "./TrackSelect/schema/generateJsonSchema";
import type { TrackSelectCliConfig } from "./cli";

const configFileName = "trackselect.config.ts";
const defaultSchemaOutFile = "trackSelectCatalog.schema.json";

async function main() {
  const [command] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command !== "schema") {
    throw new Error(`Unknown command "${command}". Run trackselect --help for usage.`);
  }

  await writeSchema(process.cwd());
}

async function writeSchema(cwd: string) {
  const configPath = resolve(cwd, configFileName);

  try {
    await access(configPath);
  } catch {
    throw new Error(`Could not find ${configFileName} in ${cwd}`);
  }

  const config = await loadConfig(configPath);
  assertConfig(config);

  const registry = createModuleRegistry([...config.modules]);
  const generatedSchema = generateTrackCatalogJsonSchema(registry);
  const schema = config.schema?.id
    ? { $id: config.schema.id, ...generatedSchema }
    : generatedSchema;
  const outFile = config.schema?.outFile ?? defaultSchemaOutFile;
  const outPath = resolve(cwd, outFile);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);

  console.log(`Wrote ${outPath}`);
}

async function loadConfig(configPath: string): Promise<unknown> {
  const jiti = createJiti(import.meta.url);
  const imported = await jiti.import(configPath);

  return getDefaultExport(imported);
}

function getDefaultExport(imported: unknown) {
  if (isObject(imported) && "default" in imported) {
    return imported.default;
  }

  return imported;
}

function assertConfig(config: unknown): asserts config is TrackSelectCliConfig {
  if (!isObject(config)) {
    throw new Error(`${configFileName} must export a config object`);
  }

  if (!Array.isArray(config.modules)) {
    throw new Error(`${configFileName} must export a modules array`);
  }

  for (const module of config.modules) {
    assertTrackModule(module);
  }

  if (config.schema !== undefined && !isObject(config.schema)) {
    throw new Error(`${configFileName} schema must be an object when provided`);
  }

  if (
    isObject(config.schema) &&
    config.schema.outFile !== undefined &&
    typeof config.schema.outFile !== "string"
  ) {
    throw new Error(`${configFileName} schema.outFile must be a string`);
  }

  if (
    isObject(config.schema) &&
    config.schema.id !== undefined &&
    typeof config.schema.id !== "string"
  ) {
    throw new Error(`${configFileName} schema.id must be a string`);
  }
}

function assertTrackModule(module: unknown): asserts module is AnyTrackModule {
  if (!isObject(module) || typeof module.type !== "string" || !("createInputSchema" in module)) {
    throw new Error(`${configFileName} modules must contain track modules`);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function printHelp() {
  console.log(`Usage: trackselect schema

Commands:
  schema    Generate TrackSelect JSON Schema from ./trackselect.config.ts`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`trackselect: ${message}`);
  process.exitCode = 1;
});
