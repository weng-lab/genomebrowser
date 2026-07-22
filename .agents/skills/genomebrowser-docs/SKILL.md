---
name: genomebrowser-docs
description: Use when creating or revising documentation, or when implementation changes affect public behavior, components, APIs, options, configuration, examples, accessibility, contributor guidance, or documented decisions. Covers package docs and root maintainer docs. Exclude ADRs, commit messages, TODO.md files, and code comments unless the user explicitly asks for them.
---

# Genome Browser Docs

Write Genome Browser documentation that is accurate, practical, and useful from the reader's point of view. Documentation affected by an implementation change is part of that change.

## Collaboration Mode

Treat documentation work as collaborative drafting by default.

- If the user asks to design, discuss, review, or work through docs, do not edit files yet.
- Start by proposing the audience, structure, and content approach.
- Ask at most 1-2 focused questions when a decision affects the shape of the docs.
- Draft incrementally: outline first, then one page or section at a time.
- Prefer short working drafts over large polished documents unless the user asks for a full pass.
- Create or update files after an explicit documentation instruction such as "write this," "update the docs," "scaffold the files," or "apply that."
- When the user requests an implementation change, treat documentation required by that change as already in scope; do not wait for a separate documentation request.
- After editing, summarize what changed and ask what to refine next.
- Treat this similarly to pair programming, and when the user makes changes themselves, read the file again.

## Audience First

Decide the audience before writing:

- User-facing package docs explain how to use the shipped package from its public surface.
- Maintainer docs give agents and contributors the decisions, patterns, constraints, ownership, and workflows needed to work in the repository.

Do not mix the two audiences casually. If a user page needs background from maintainer docs, duplicate the small user-relevant explanation instead of sending package readers into repo internals.

## Context Check

Before changing docs, do a proportional context check:

- Read repo instructions and style guidance.
- Read existing docs near the target page.
- Read the relevant implementation and exported types before documenting behavior or APIs.
- Check existing tests, stories, and examples for supported states and intended usage.
- Inspect the package's public entry points so imports and examples match what users can actually use.
- Verify defaults, callbacks, composition, constraints, and accessibility behavior against code.
- Run or type-check examples when practical.

Use implementation files to verify behavior, not as the organizing structure for the docs.
If behavior cannot be confirmed, omit it or clearly mark it as needing verification. Never invent props, defaults, behavior, accessibility support, imports, or usage recommendations.

## Package Docs Contract

Package docs must work for someone reading them from an installed package:

- Keep package docs self-contained.
- Do not link upward into repository-only docs from package docs.
- Use public package exports in examples unless explicitly documenting an internal maintainer workflow.
- Use `YOUR_URL_HERE` for example track URLs unless reusing an existing URL already present in the repo.

## Component Pages

Give each public component its own package documentation page. Use this structure and omit sections that do not apply:

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

### Accessibility

Document only behavior verified in the implementation or tests. Cover accessible names, semantic HTML or ARIA roles, keyboard interactions, focus placement and restoration, and disabled or read-only behavior when relevant. Never infer or promise unsupported accessibility behavior.

## Broader User Docs

Use getting-started, concept, workflow, recipe, track, and troubleshooting pages for system-level guidance that spans components or explains complete user tasks. Prefer mental models, workflows, examples, defaults, and sharp edges over repeating component API tables.

For these pages:

1. Start with the user goal and when to use the feature.
2. Explain ownership, lifecycle, data flow, or responsibility boundaries when relevant.
3. Show one minimal realistic example.
4. Explain important behavior that is not obvious from names or types.
5. Include common tasks, defaults, constraints, and sharp edges.

Keep the happy path approachable. Move advanced material into recipes, advanced sections, or separate pages instead of making the first page intimidating.

## Maintainer Docs

Keep root maintainer docs lightweight and actionable. Record decisions, repository patterns, constraints, contributor workflows, ownership, and implementation guidance that agents and maintainers need to change the code safely. Do not turn maintainer docs into user guides or duplicate package API references.

ADRs remain the source of truth for high-level decisions. Use the ADR skill when creating or changing one.

## Writing Style

- Use direct, concise sentences and address the reader as "you" when giving instructions.
- Use sentence-case headings and the same terminology as the public API.
- Prefer concrete descriptions and practical examples over marketing language.
- Explain why or when something is useful, not only how to configure it.
- Avoid repeating information already clear from the example or API table.
- Do not describe planned or undocumented behavior as existing behavior.

## Organization Guidance

Organize docs by reader-facing concepts and workflows, not source-file layout or current implementation boundaries.

Prefer small entry points that route readers to focused pages for getting started, core concepts, major features, recipes, and troubleshooting. Do not create a page only because a file, type, or function exists.

## Completion Check

Before finishing a docs change:

- Verify every affected public component has a page and an exhaustive API table for its package-owned public props and options.
- Compare component API tables with current exported types and defaults.
- Verify package docs are self-contained and install-safe.
- Verify examples import only public package exports unless explicitly documenting internals.
- Verify examples avoid hallucinated track URLs.
- Verify examples match supported behavior and type-check or run them when practical.
- Verify accessibility guidance is supported by the implementation.
- Verify limitations and surprising behavior are documented where relevant.
- Complete all documentation updates required by the change rather than merely suggesting them as follow-up work.
- In the final response, name the documentation files changed or state why the implementation has no documentation impact.
