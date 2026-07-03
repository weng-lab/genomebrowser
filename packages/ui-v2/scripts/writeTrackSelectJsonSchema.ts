import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { TrackSelectCatalogSchema } from "../src/TrackSelect/schema/catalogSchema";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(packageRoot, "schemas/trackSelectCatalog.schema.json");
const schema = {
  $id: "https://weng-lab.github.io/genomebrowser/schemas/trackSelectCatalog.schema.json",
  ...z.toJSONSchema(TrackSelectCatalogSchema, { io: "input" }),
};

mkdirSync(dirname(schemaPath), { recursive: true });
writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
