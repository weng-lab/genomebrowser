# API reference writing

## Reading experience

Reference pages are for lookup. Keep the full technical contract intact, including types, defaults, validation, and edge cases. Leave step-by-step teaching to guides so reference pages stay easy to scan without dropping details readers need to get things right.

Link related sections when one leads naturally to another, such as built-in options linking to custom extensions, or parsing linking to validation.

Call out import paths whenever choosing the right entry point matters. When two APIs have similar names, state what each one does, what owns it, and what context it needs instead of warning readers not to mix them up.

## Coverage and organization

Every public export needs one canonical page and heading, not necessarily its own file. Keep `docs/03-reference/README.md` current as an index from every public export to its reference heading, covering functions, hooks, components, types, aliases, subpath exports, CLI commands, and shipped schemas. Check `package.json` export maps and every entry point, because the root entry point rarely exports everything.

Give standalone functions, hooks, and components their own pages when that makes lookup faster. Keep store actions together, and keep supporting types on the page of the capability that owns them. Every page should make sense if opened directly: state its purpose, import path, and required context, show a focused example, and link to related contracts rather than assuming the reader came from another page.

Group APIs by what the reader is trying to do:

- **Core:** `browserSetup`, `assembliesAndRegions`, `trackDefinition`, `rendererIntegration`, and `collectionsAndSchemas`, with focused pages for stores, hooks, components, module contracts, and tooling.
- **Tracks:** one page per track module, plus shared pages for coordinates and layout, signal processing, BED schemas, settings components, and tooltips.
- **UI:** one page per standalone component, alongside its helpers and types.
- **Reader:** one page per file format or data source, plus the shared regional file contract.
- **Starter (`create-genomebrowser`):** CLI usage, generated files, and constraints. Guides inside the generated app cover running, customizing, architecture, and deployment.

Treat these groupings as guidelines and reconcile them with the package's actual exports on each pass. Document specialized public exports too. If an export looks accidental or questionable, flag it separately rather than quietly omitting it or changing the API during a docs edit.

### What to document by API kind

- **Functions and hooks:** signature, inputs, defaults, return value, errors, required context, lifetime, and key interactions.
- **Stores:** initialization options, public state, actions, and what mutations return.
- **Track modules:** creation, configuration, display modes, source requirements, interactions, and supporting types.

Keep each supporting type with its owning capability and link there from other pages.

## Component pages

Give each standalone public component its own reference page. Small cooperating parts can share a capability page if each part gets a named section and its full API. Never repeat a component's prop table on a second page.

Use this layout and omit sections that do not apply:

```md
# ComponentName

One or two sentences explaining what the component does and when to use it.

## Usage

Minimal working example.

## Examples

Focused examples for important variants, states, and behaviors.

## API

Exhaustive public props, types, defaults, and callbacks.

## Accessibility

Verified semantics, keyboard behavior, labeling, and focus behavior.

## Notes

Limitations, constraints, or behavior that may surprise users.
```

Make the first example the smallest realistic setup that actually runs. Include required imports, props, and surrounding context, use only public APIs, and hold advanced configuration for later examples.

Add focused examples for behaviors that matter, such as variants, loading or disabled states, controlled usage, callbacks, composition, styling, and responsive layout. Teach one main idea per example and skip trivial prop combinations. For multi-part components, show the expected structure early and state which parts are required or optional.

### API tables

List every package-owned public prop and option users can pass. For compound components, include a table for each part. When a component forwards standard DOM attributes, state which element receives them and note any exceptions instead of listing every HTML attribute.

Use these columns:

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |

Cover required props, meaningful defaults, when callbacks run, controlled and uncontrolled behavior, non-obvious prop interactions, and deprecated props with their replacements. Explain what the prop actually does instead of rephrasing its name.

Generated type output is a fine starting point, but review it before publishing rather than dumping raw output. When writing tables by hand, compare them directly against the exported types so nothing is missed.

Check rendered table structure after formatting so every row keeps four columns. Escape literal `|` characters in cells, including TypeScript unions inside inline code, or split alternatives into separate code spans joined by "or". A clean formatter run does not guarantee the table renders properly.

### Accessibility

Document only behavior verified in the implementation or tests. Cover accessible names, HTML or ARIA roles, keyboard controls, focus placement and restoration, and disabled or read-only behavior where relevant. Never infer or promise accessibility behavior you have not verified.

## Before finishing

Reconcile affected entries in `docs/03-reference/README.md` and every touched API section against the current entry points, types, defaults, and behavior. For a full package pass, verify the entire public API including subpaths; for a targeted edit, verify the affected APIs.
