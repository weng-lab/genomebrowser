import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bigBedModule,
  bigWigModule,
  createModuleRegistry,
  methylCModule,
} from "@weng-lab/genomebrowser-v2";
import { generateTrackCatalogJsonSchema } from "../src/TrackSelect/schema/generateJsonSchema";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(packageRoot, "schemas/trackSelectCatalog.schema.json");
const registry = createModuleRegistry([bigWigModule, bigBedModule, methylCModule]);
const schema = {
  $id: "https://weng-lab.github.io/genomebrowser/schemas/trackSelectCatalog.schema.json",
  ...generateTrackCatalogJsonSchema(registry),
};

mkdirSync(dirname(schemaPath), { recursive: true });
writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
