# Schema Validation

v2 validates external input at construction and track-store mutation boundaries, then lets internal fetch and render code rely on parsed track instances.

## Module schemas and defaults

Custom modules provide a Zod object under `configSchema`. `defineTrackModule` makes that object strict and combines it with browser-owned base and interaction schemas.

```ts
const exampleModule = defineTrackModule({
  type: "example",
  defaults: { height: 80, color: "#2266aa" },
  configSchema: z.object({
    url: fetchOnChange(z.string().min(1)),
    smoothing: z.number().default(0),
  }),
  fetch: fetchExample,
  render: { full: FullExample },
});
```

Use Zod `.default()` for module config defaults. Use module `defaults` for browser-owned `display`, `height`, and `color`. If omitted, height is `80`, color stays optional, and display is the first renderer key. Invalid defaults, an empty renderer map, and a default display not present in the renderer map fail when the module is defined.

`module.create(input, interaction?)` parses public create input and applies defaults. `module.validate(instance)` parses the full nested runtime shape. Both throw descriptive errors when input is invalid.

## Construction throws

Construction APIs fail synchronously because there is no valid object or store to return:

- `defineTrackModule(...)` throws for an invalid module definition.
- `module.create(...)` throws for invalid base fields, config, or callbacks.
- `createModuleRegistry(...)` throws for duplicate module types.
- `createBrowserStore(...)` throws for invalid startup input.
- `createTrackStore(...)` throws when an initial track is malformed, uses an unregistered type, or duplicates another track ID.

Catch these errors at dynamic input boundaries such as loading saved state. Static application setup should usually be allowed to fail during development.

## Runtime mutations return results

Once a track store exists, its mutators do not throw for expected validation failures. They return:

```ts
type TrackMutationResult = { ok: true } | { ok: false; error: string };
```

This applies to `setTracks`, `addTrack`, `removeTrack`, `applyTrackChanges`, `reorderTracks`, `updateBase`, `updateConfig`, and `updateInteraction`. Callers should surface `error` when a change came from user input.

Every failed mutation is atomic: validation completes before `set`, so tracks and order remain unchanged. `applyTrackChanges` validates the complete add/remove operation before applying any part of it, and `setTracks` validates the full replacement before replacing current state.

## Identity rules

Track IDs are unique within a store. Duplicate IDs are rejected during construction and mutation. A reorder must contain every current ID exactly once.

`updateBase(id, partial)` deliberately preserves the existing ID even if `partial.id` contains another value. Identity and `type` are immutable through update APIs. To change either, remove and create a track through the intended module; use `applyTrackChanges` when replacement must be atomic.

## Catalog input is not an instance

Catalog JSON uses top-level base fields plus `type`, `config`, and optional `metadata`. `createTrackFromEntry(registry, entry)` chooses the module and calls its `create` method. The resulting runtime instance nests parsed base fields under `base`, keeps module values under `config`, omits catalog metadata, and includes applied defaults.

Keep schema validation at these boundaries rather than repeatedly parsing values inside hooks and renderers.
