# API reference writing

## Reading experience

References support lookup and should retain complete technical contracts, including types, defaults, validation, and edge cases. Guides carry the step-by-step teaching flow. Improve reference readability without turning every API section into a tutorial or removing details needed to use it correctly.

Connect related sections so readers understand how built-in options lead to customization, or how parsing leads to validation.

Explain import paths when choosing among entry points matters. When similar names refer to different APIs, explain their purpose, ownership, and required context directly rather than simply warning readers not to confuse them.

## Ownership and coverage

Every public export needs a canonical page and heading, not a separate file. Maintain an export-to-reference index in `docs/reference/README.md`, including exported types, aliases, public subpaths, and related runtime symbols. Include public CLI commands and shipped schemas in reference navigation as applicable. Inspect package export maps and their source entry points; root exports alone are not the complete surface.

Give independently useful functions, hooks, and components focused pages when that improves lookup. Keep store actions together and supporting types with their owning capability. Each page should make sense when opened directly, with its purpose, import path, required context, and a focused example; link to other contracts instead of assuming the reader visited them first.

Group APIs by reader-facing capability:

- Core: `browserSetup`, `assembliesAndRegions`, `trackDefinition`, `rendererIntegration`, and `collectionsAndSchemas`. These areas contain focused pages for stores, hooks, components, module contracts, and tooling.
- Tracks: one reference per track module, plus focused shared references for coordinates/layout, signal processing, BED schemas, settings components, and tooltips.
- UI: independently usable components, with their related helpers and types.
- Reader: one reference per file format or data source, plus the common regional file contract.
- Starter: command usage, generated output, and constraints; generated application guides own running, customization, architecture, and deployment instructions.

These are grouping guidelines, not a frozen export inventory. Reconcile them with the current public surface during each package pass. Document public exports even when they are specialized; flag questionable exports separately rather than silently omitting them or changing the API during a docs cleanup.

For functions, hooks, stores, and modules, document signatures, inputs, defaults, results, failures, required context, lifetime, and important interactions. Store reference includes initialization options, observable public state, actions, and mutation-result semantics. Module reference includes creation, configuration, displays, source requirements, interactions, and related types. Keep each supporting type with its owning capability and link from other uses.

## Component pages

Give each independently usable public component its own reference page. Small cooperating parts may share a capability page, with a named section and complete API for every part. Do not duplicate a component's API table on a second page. Use this structure and omit sections that do not apply:

```md
# ComponentName

One or two sentences describing what the component does and when to use it.

## Usage

Minimal runnable example.

## Examples

Focused examples for important variants, states, and behaviors.

## API

Exhaustive public props, types, defaults, and callbacks.

## Accessibility

Verified semantics, keyboard behavior, labeling, and focus behavior.

## Notes

Limitations, constraints, or behavior that may surprise users.
```

The first example must be the smallest realistic example that works. Include required imports and props, enough surrounding code to understand it, and only public APIs. Do not lead with advanced configuration.

Add focused examples for important concepts such as variants, loading or disabled states, controlled behavior, callbacks, composition, styling, and responsive behavior. Each example should teach one main idea; do not document trivial prop combinations.

For components made from multiple parts, show the expected structure early. Explain which parts are required and optional.

### API Tables

Document every package-owned public prop and option that a user can interact with. For compound components, document the public props for each part. Do not enumerate all standard DOM attributes when a component forwards them; state what element receives them and note any exceptions.

Use this table shape:

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |

Include required props, behaviorally significant defaults, callbacks and when they run, controlled and uncontrolled relationships, non-obvious prop interactions, and deprecated props with replacements. Descriptions must explain behavior rather than repeat the prop name.

Use generated type information when reliable tooling exists, but do not publish an unreviewed type dump. Otherwise compare the table manually against the exported types. The table must remain exhaustive even when handwritten.

Check table structure after formatting: every row must retain the intended columns. Escape literal pipes in cells, including TypeScript unions inside inline code, or write alternatives as separate code spans joined by "or". Formatter success alone does not prove a table renders correctly.

### Accessibility

Document only behavior verified in the implementation or tests. Cover accessible names, semantic HTML or ARIA roles, keyboard interactions, focus placement and restoration, and disabled or read-only behavior when relevant. Never infer or promise unsupported accessibility behavior.

Before finishing, reconcile affected export-index entries and API sections with current entry points, types, defaults, and behavior. For a full package pass, cover the entire public surface, including subpaths; for a focused change, cover the affected APIs.
