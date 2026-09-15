# Collection JSON schema

The package ships `@weng-lab/genomebrowser-tracks/trackCollection.schema.json`, generated from all modules in `firstPartyTrackModules`. It describes track collections and each track's create-input config, including the supported `bedSchema` keys.

For a collection JSON file in your project root, enable editor validation and completion with:

```json
{
  "$schema": "./node_modules/@weng-lab/genomebrowser-tracks/schemas/trackCollection.schema.json"
}
```

This snippet shows the schema reference only; your collection still needs its required fields. Adjust the relative path for nested collection files. Tooling can resolve the public package subpath directly. Custom modules require a schema generated from your own module list using the `genomebrowser schema` CLI from `@weng-lab/genomebrowser`.

The schema provides editor validation. To validate a collection at runtime, call core's `validateTrackCollection` with the same module list.

Return to [Area index](README.md) or [Tracks API reference](../README.md).
