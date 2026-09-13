# Schema CLI

The package provides the `genomebrowser schema` command. Point it at a JavaScript or TypeScript module that exports your supported track module or array:

```ts
// trackModules.ts
import { bigWigModule } from "@weng-lab/genomebrowser-tracks/bigwig";
export const trackModules = [bigWigModule];
```

```sh
pnpm exec genomebrowser schema --from ./trackModules.ts#trackModules --out ./trackCollection.schema.json
pnpm exec genomebrowser schema --from ./trackModules.ts#trackModules --out ./trackCollection.schema.json --check
```

| Option               | Default                       | Behavior                                                                                                                                              |
| -------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--from <source>`    | Required                      | Import a module or non-empty module array. Repeat to combine sources.                                                                                 |
| `--out <file>`, `-o` | `trackCollection.schema.json` | Write formatted JSON with a trailing newline. `-` writes to stdout. Parent directories are created.                                                   |
| `--id <uri>`         | Omitted                       | Add a JSON Schema `$id`. Must be non-empty; the CLI does not validate URI syntax.                                                                     |
| `--check`            | `false`                       | Compare the generated text with an existing file and fail if missing, unreadable, or different. Does not write it. Cannot be combined with `--out -`. |
| `--help`, `-h`       | `false`                       | Print usage. Running without a command also prints usage.                                                                                             |

Sources can be package specifiers or local relative/absolute paths. Relative paths and output files resolve from the working directory. Append `#exportName` to select a named export. Without it, the loader accepts a module value, a suitable default export, or the only suitable named export; ambiguous named exports require explicit selection. Duplicate module types across combined sources fail schema generation.

Importing a source executes its code in Node. Keep module definitions importable without application startup or browser-only side effects. Import, argument, generation, and file errors are reported on stderr with exit code 1. With stdout output, the loaded-module summary goes to stderr so stdout contains only the schema.

Set `$schema` in your collection JSON to the generated file's relative location. This helps an editor interpret the file; runtime validation still uses your supplied modules.

See [this reference area](README.md) or the [complete export index](../README.md#public-export-index) for related APIs.
