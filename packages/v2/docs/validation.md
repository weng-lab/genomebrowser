# Schema Validation - WIP

v2 uses Zod for runtime validation at package boundaries and before runtime behavior depends on config shape.

The goal is to fail early with useful errors while keeping browser internals typed after input is parsed.

## Shared helpers

Shared validation helpers live in `src/modules/schemas.ts`:

- `parsePublicInput` wraps `schema.safeParse` and throws a readable `Error`
- `formatZodError` turns Zod issues into compact messages
- `trackConfigBaseSchema` validates the shared track config fields
- `validateTrackConfigBase` and `validateTrackConfigBaseList` validate track store input

## Where validation happens

Validation is used in a few places:

- browser store input is parsed when the browser store is created
- region input is parsed by the region utilities
- track store input and updates are checked against the base track config shape
- each track module validates its own full config before fetching or rendering

## Track module schemas

Track modules should define schemas for their own config shape. The common pattern is:

1. define an input schema for public config
2. apply defaults in that schema
3. extend it with the module's fixed `type`
4. use `create` for public input
5. use `validate` for runtime configs

Example shape:

```ts
const trackInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  display: z.enum(["full", "dense"]).default("full"),
  height: z.number().positive().default(80),
});

const trackConfigSchema = trackInputSchema.extend({
  type: z.literal("example"),
});
```

This keeps module-specific validation near the module-specific behavior.

## Design direction

Use schemas at boundaries, not everywhere. Once input has been parsed, prefer passing typed values through the browser, hooks, and modules.
