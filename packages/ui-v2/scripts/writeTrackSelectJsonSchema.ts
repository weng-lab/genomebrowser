import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { TrackSelectFolderSchema } from "../src/TrackSelect/schema/folderSchema";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(packageRoot, "schemas/trackSelectFolder.schema.json");
const schema = {
  $id: "https://weng-lab.github.io/genomebrowser/schemas/trackSelectFolder.schema.json",
  ...z.toJSONSchema(TrackSelectFolderSchema, { io: "input" }),
};

mkdirSync(dirname(schemaPath), { recursive: true });
writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
