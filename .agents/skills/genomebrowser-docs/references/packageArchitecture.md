# Package documentation architecture

This is the target architecture. Existing files may not have migrated yet; do not treat their current placement as precedent or move unrelated docs during a focused edit.

```text
packages/<package>/
  README.md                 Purpose, installation, first example, documentation links
  docs/
    README.md               Learning path and topic navigation
    gettingStarted/         Ordered, cumulative tutorials
    guides/                 Independent tasks and conceptual explanations
    reference/
      README.md             API topic navigation and public export index
    troubleshooting.md      Symptoms, causes, and remedies
```

Use these categories consistently, but create directories only when they contain useful pages. A small package may need only one getting-started page. The starter's generated application docs explain that application, not the library API, and need not imitate the library tree.

READMEs route readers rather than collecting growing reference sections. Reference may include focused examples but should not repeat entire workflows.

Follow repository naming conventions: camelCase for topic filenames and PascalCase for independently documented components. Use descriptive names such as `browserStore.md`; avoid catch-all files such as `helpers.md` or a growing `recipes.md`. A related group of small APIs can share a well-named page.

## Learning path

Core's bundled docs own the main integration tutorial. Offer two entrances: create a new application with the starter, or embed in an existing React application. Use one cumulative example through these milestones:

1. Render a first browser: installation, assembly, stable stores, a data track, ruler, and responsive container.
2. Build a useful track display: track types, ordering, settings, data sources, and interactions.
3. Add application controls: navigation, selection, highlights, and cytobands.
4. Let users choose tracks: collections, TrackSelect, initial/default selections, and saving committed choices.

State the dependencies and setup required by each chapter, the expected working result, and the next step. Keep package-specific quick starts independently usable. Custom module authoring is an advanced guide, not a prerequisite for completing this path. Document only supported capabilities; do not invent an integration API to simplify a tutorial.

## Writing tutorials and guides

Use `gettingStarted/` for sequential learning, `guides/` for independent tasks and concepts, and troubleshooting for diagnosis. Track configuration belongs in the track's reference page. Prefer mental models, workflows, examples, defaults, and sharp edges over repeating API tables.

For these pages:

1. Start with the user goal and when to use the feature.
2. Explain ownership, lifecycle, data flow, or responsibility boundaries when relevant.
3. Show one minimal realistic example.
4. Explain important behavior that is not obvious from names or types.
5. Include common tasks, defaults, constraints, and sharp edges.

Keep the happy path approachable. Move advanced material into focused guides or advanced sections instead of making the first page intimidating.

## Package-by-package migration

For an authorized documentation cleanup, work package by package, then finish with maintainer docs. The default sequence is core, tracks, UI, reader, starter/generated guides and app READMEs, then root maintainer docs. Adjust when the user chooses another order. Do not begin the next package merely because the current package is complete unless the broader migration is authorized.

For each package:

1. Inventory existing pages, inbound links, package contents, and public exports. Map each page/topic to keep, move, merge, rewrite, or retire; identify missing reference coverage.
2. Establish the page map and canonical ownership before writing. An accepted architecture does not need to be reapproved for routine placement decisions.
3. Correct stale claims against source, consolidate useful material, and fill the learning-path and reference gaps. Preserve useful behavioral explanations when splitting or merging pages.
4. Update indexes and affected links, including inbound repository links to moved pages. Check that documentation remains included in the published package.
5. Validate coverage, examples, and links; report what is complete and any material uncertainty. Distinguish planned pages from finished documentation.

For a focused implementation change, update the affected canonical pages and export index without turning the task into a package-wide migration.

For API grouping and completeness, read [API reference writing](apiReference.md). For the final maintainer pass, read [Maintainer documentation](maintainerDocs.md).
