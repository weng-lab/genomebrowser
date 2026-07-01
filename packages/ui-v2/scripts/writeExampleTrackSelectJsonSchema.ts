import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bigBedModule, bigWigModule } from "@weng-lab/genomebrowser-v2";
import { generateTrackSelectFolderJsonSchema } from "../src/TrackSelect/schema/generateJsonSchema";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(
  packageRoot,
  "schemas/trackSelectFolder.example.schema.json",
);
const schema = {
  $id: "https://weng-lab.github.io/genomebrowser/schemas/trackSelectFolder.example.schema.json",
  ...generateTrackSelectFolderJsonSchema([bigWigModule, bigBedModule]),
};

mkdirSync(dirname(schemaPath), { recursive: true });
writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
