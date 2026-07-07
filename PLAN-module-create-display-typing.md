# Plan: Close module create/typing gaps

## Goal

Fix the three remaining module-boundary issues:

1. `module.create()` should only return instances that pass `module.validate()`.
2. Display modes should be narrowed in TypeScript to the module's renderer keys, while keeping the current runtime `z.enum`/JSON-schema behavior.
3. `defaults.config` should be honored by the JSON/catalog schema boundary, not just the runtime `create()` merge, so the two paths accept exactly the same input.

## Current state

The runtime boundary is mostly good: public create input is nested under `config`, interaction is separate, registry casting is localized, and display validation uses `z.enum`.

Three seams remain:

- `create()` parses create input but returns a manually constructed instance without validating the final instance.
- The display input/default types are currently `string`, so invalid display modes compile and only fail at runtime.
- `defaults.config` is merged into config at runtime inside `create()` (`defineTrackModule.ts:154-159`), but the generated JSON schema and `validateJson` are built from `createInputSchema.config` (= raw `configSchema`), which knows nothing about `defaults.config`. Zod `.default()` fields correctly become optional in the `io:"input"` JSON schema; `defaults.config` fields do not. The catalog boundary is therefore *stricter than the runtime contract*: a field covered only by `defaults.config` is optional via `create()` but required in the JSON schema and rejected by `validateJson` before `create()` runs.

## 1. Ensure `create()` returns validated instances

### Approach

Make `create()` construct the instance, then parse it with `instanceSchema` before returning.

This gives one clear invariant:

```ts
module.validate(module.create(input)) === module.create(input)
```

### Implementation steps

1. In `packages/v2/src/modules/defineTrackModule.ts`, change `create()` from directly returning the instance object to:

   ```ts
   const instance = {
     type: definition.type,
     base: {
       id: parsed.id,
       title: parsed.title,
       display: parsed.display,
       height: parsed.height,
       color: parsed.color ?? definition.defaults?.color,
     },
     config: parsed.config,
     ...(parsedInteraction ? { interaction: parsedInteraction } : {}),
   };

   return parsePublicInput(
     instanceSchema,
     instance,
     `${definition.type} instance`,
   );
   ```

2. Confirm this does not duplicate user-facing error paths for normal bad input:

   - bad create input should still throw `"<type> input is invalid"`
   - bad interaction should still throw `"<type> interaction is invalid"`
   - invalid module-authored defaults should throw `"<type> instance is invalid"`

3. Consider adding proactive default validation at module definition time later, but do not do that in this patch unless needed. Validating the created instance is the tighter minimal fix.

### Tests

Add/adjust tests in `packages/v2/test/modules/defineTrackModule.test.ts`:

- `create()` output passes `validate()` for normal valid input.
- invalid module-authored default applied after parsing is rejected by `create()`.
  - Best candidate: invalid `defaults.height`. Zod applies `.default()` without re-validating it in the same parse, so a bad height default sails through `createInputSchema` today and is only caught by the `instanceSchema` re-parse — this is the primary new coverage.
  - Secondary: invalid `defaults.color` forced with `as never`.
- error message should indicate instance validation, not input validation, for bad module defaults.

### Note: double-parsing config

The re-parse runs `config` through `configSchema` a second time (once via `createInputSchema`, again via `instanceSchema`). This is idempotent for plain object configs. If any module's `configSchema` later grows a `.transform()` or `.default()` whose output is not valid input, the second parse would break — flag if/when that happens; not a blocker today.

## 2. Restore display-mode TypeScript narrowing

### Approach

Keep runtime display schema as `z.enum(displays)`, but carry the renderer-key union through the public types.

The key is to make display type a generic, probably independent from the config schema:

```ts
type DisplayKey<Renderers> = Extract<keyof Renderers, string>;
```

Then thread that into `TrackCreateInput`, `TrackCreateInputSchema`, and `TrackModule`.

### Implementation steps

1. Update `TrackCreateInput` in `packages/v2/src/modules/types.ts`:

   ```ts
   export type TrackCreateInput<
     ConfigInput,
     Display extends string = string,
   > = {
     id: string;
     title: string;
     display?: Display;
     height?: number;
     color?: string;
     config: ConfigInput;
   };
   ```

2. Update `TrackCreateInputSchema` to carry display type. This is **required**, not optional: the type-contract test below asserts on `ModuleCreateInput<M>` = `z.input<M["createInputSchema"]>`, so for display to narrow to `"full" | undefined` the schema's `display` field must be typed as the `Display` union:

   ```ts
   export type TrackCreateInputSchema<
     ConfigSchema extends z.ZodObject,
     Display extends string = string,
   > = z.ZodObject<
     {
       id: z.ZodString;
       title: z.ZodString;
       display: z.ZodDefault<z.ZodType<Display, Display>>;
       height: z.ZodDefault<z.ZodNumber>;
       color: z.ZodOptional<z.ZodString>;
       config: ConfigSchema;
     },
     z.core.$strict
   >;
   ```

3. Update `TrackModule` with a display generic:

   ```ts
   export type TrackModule<
     Type extends string,
     ConfigSchema extends z.ZodObject,
     Data,
     Item = unknown,
     Display extends string = string,
   > = {
     displays: Display[];
     create(
       input: TrackCreateInput<z.input<ConfigSchema>, Display>,
       interaction?: TrackInteraction<Item>,
     ): ...
   }
   ```

4. In `defineTrackModule.ts`, reintroduce:

   ```ts
   type DisplayKey<Renderers> = Extract<keyof Renderers, string>;
   ```

5. Make `ModuleDefaults` display-aware:

   ```ts
   type ModuleDefaults<
     ConfigSchema extends TrackConfigSchema,
     Display extends string,
   > = {
     display?: Display;
     ...
   };
   ```

6. Make `TrackModuleDefinition` use `DisplayKey<Renderers>` for defaults:

   ```ts
   defaults?: ModuleDefaults<ConfigSchema, DisplayKey<Renderers>>;
   ```

7. Make `defineTrackModule` return:

   ```ts
   TrackModule<
     Type,
     ConfigSchema,
     FetchData<Fetch>,
     Item,
     DisplayKey<Renderers>
   >
   ```

8. Expect a new localized narrowing cast. `z.enum(displays as [string, ...])` infers `input = string`, but the declared `TrackCreateInputSchema<…, Display>` carries the `Display` union, so `createTrackModule`'s return (and the `displays`/`defaultDisplay` values from `Object.keys`) will need a localized cast to `DisplayKey<Renderers>`. This is an accepted, narrowing cast — call it out so the "casts stay localized" criterion is understood to allow it, not violated by it.

9. Keep `AnyTrackModule` erased enough for registries.

   - It can use `Display extends string = string`.
   - Avoid reintroducing broad `any`.
   - The erased registry can still expose `displays: string[]` and `create(input: unknown, ...)`.

10. Ensure `createTrackFromEntry` still compiles.

    - Its localized cast may need to cast to `ModuleCreateInput<typeof module>`.
    - That is fine; catalog JSON remains runtime validated.

### Scope decision

Narrow display on **create input** and on **`defaults.display`**. Leave the returned instance's `base.display` as `string` — the runtime `z.enum` still guarantees validity, and threading the union all the way through `TrackInstance`/`TrackBase` is out of scope for this patch. Make this an explicit decision so the type-contract tests match intent.

### Tests

Add type-contract assertions in `packages/v2/test/modules/typeContracts.test.ts`:

- `ModuleCreateInput<typeof moduleA>["display"]` is `"full" | undefined` for a single-renderer module.
- For multi-renderer module, display is `"full" | "dense" | undefined`.
- Invalid display create input should be marked with `@ts-expect-error`.
- `defaults.display` rejects a non-renderer key with `@ts-expect-error`.

Runtime tests should continue to assert:

- invalid display throws at runtime
- JSON schema includes enum display values

## 3. Make the JSON/catalog boundary honor `defaults.config`

### Problem

`defaults.config` is applied only inside the runtime `create()` merge, so the catalog validation boundary (generated JSON schema + `validateJson`, both derived from `createInputSchema.config` = raw `configSchema`) is stricter than what `create()` actually accepts. A config field that a module makes optional via `defaults.config` is still reported as required to JSON/catalog authors and rejected before `create()` runs.

### Decision (settled)

Each module owns its schema, but `defaults.config` still earns its keep as an **override layer**: modules may set different defaults on similarly-named fields, including fields that come from reused/imported schema fragments where the intrinsic Zod `.default()` cannot be per-module. Dropping `defaults.config` would force those defaults to be baked into each schema and would break the moment a schema fragment is reused.

So keep `defaults.config` as a first-class override, and make it feed `createInputSchema` construction so the JSON/catalog boundary honors the same defaults the runtime path does. One source of truth; override layer preserved; both paths agree.

### Chosen approach: collapse onto one source of truth

Build `defaults.config` into `createInputSchema` at construction time by applying each key as a Zod `.default()` on the config shape, rather than merging at runtime:

```ts
// in createTrackModule, before building createInputSchema
const configWithDefaults = applyConfigDefaults(configSchema, definition.defaults?.config);
// createInputSchema uses configWithDefaults for its `config` field
```

Where `applyConfigDefaults` walks the top-level keys of `defaults.config` (which is `Partial<z.input<ConfigSchema>>`) and does `configSchema.extend({ k: configSchema.shape[k].default(v) })` per key. Semantics stay shallow/top-level, matching both the current merge (`{ ...defaults.config, ...inputConfig }`) and `Partial<z.input>`.

This yields:

- **One source of truth.** Both the runtime path and the JSON/catalog path derive optionality from the same schema.
- **Correct JSON schema for free.** `io:"input"` turns the injected `.default()`s into optional fields.
- **The manual shallow merge in `create()` (`defineTrackModule.ts:154-159`) becomes deletable** — the schema now carries the defaults.

### Rejected alternatives

- **Drop `defaults.config`, require Zod `.default()` in `configSchema`.** Simpler and needs no `applyConfigDefaults` helper, but loses the per-module override layer — a module can no longer set its own default on a reused/imported schema fragment without forking the schema. Not chosen.
- **Document `defaults.config` as runtime-only.** The worst option: keeps two mechanisms with different reach and leaves the stricter-than-runtime JSON boundary as a latent footgun. Not chosen.

### Interaction with Part 1

None. The Part 1 re-parse sees `parsed.config` with defaults already filled (whether they arrive via the runtime merge or via injected `.default()`s), so it is unaffected either way.

### Tests

- Generated JSON schema marks a `defaults.config`-covered field as optional (not required).
- `validateJson` accepts a catalog entry that omits a `defaults.config`-covered field.
- `create()` still fills that field with the default (unchanged behavior).
- If the runtime merge is removed, confirm existing `create()` default-merge tests still pass against the schema-driven defaults.

## Risks / tradeoffs

- Threading `Display` through `TrackModule` may cause type fallout in registry/browser code. Keep browser code using erased `AnyTrackModule` rather than trying to preserve display precision there.
- Zod enum/default type signatures may be finicky. Do not overfit the schema type; prioritize the public `create()` input type and runtime schema correctness. Expect one localized narrowing cast in `createTrackModule` (see 2.8).
- This restores compile-time precision for code users, but JSON/catalog users still rely on runtime/schema validation, which is expected.
- Part 3's `applyConfigDefaults` only covers top-level config keys, matching current shallow-merge semantics. Nested defaults remain shallow — if deep per-key defaults are ever needed, that is a separate change.

## Success criteria

- `create()` never returns an instance that `validate()` rejects.
- Runtime display enum behavior remains unchanged.
- Generated TrackSelect JSON schema still includes display enums.
- TS users get display autocomplete and compile errors for invalid display values.
- Existing registry boundary cast remains localized; any new cast introduced (display narrowing) is localized and narrowing only.
- The JSON/catalog validation boundary accepts exactly what `create()` accepts — no field is required by the schema but optional via `defaults.config`.
