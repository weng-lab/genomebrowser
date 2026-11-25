# Package documentation architecture

Package docs follow this layout. Do not move unrelated pages during a focused edit.

```text
packages/<package>/
  README.md                  Purpose, installation, first example, docs links
  docs/
    README.md                Learning path and topic navigation
    01-gettingStarted/       Ordered, cumulative tutorials
      README.md              Chapter navigation
      01-firstTopic.md       First tutorial chapter
    02-guides/               Independent tasks and concepts
      README.md              Guide navigation
    03-reference/
      README.md              API topic navigation and public export index
      <number>-<area>/       Related capabilities in a suggested order
        README.md            Area purpose and page navigation
        <apiOrTopic>.md      Focused API contract and examples
    04-troubleshooting.md    Symptoms, causes, and remedies
```

Create only the sections a package actually needs; small packages may need just one getting-started page, and gaps in numbering are fine. The starter's generated app docs explain that app rather than a library API and use `01-running.md`, `02-architecture.md`, `03-customization.md`, and `04-deployment.md` under an unnumbered docs root.

## Naming and navigation

- **Indexes:** Keep `README.md` unnumbered at every level. Each index states the folder's purpose, lists its immediate pages or subsections in reading order, and links to its parent. Root indexes may also link directly to tutorial chapters. READMEs route readers rather than growing into reference dumps.
- **Numbering:** Reserve `01-gettingStarted`, `02-guides`, `03-reference`, and `04-troubleshooting.md` across library packages. Number tutorial chapters with two-digit prefixes starting at `01` per folder. Number reference area folders when a reading order helps (core, tracks, UI); leave reader's format areas, standalone guides, and API pages unnumbered. Numbers indicate reading order only, never versions or API names, and never appear in page titles or link text.
- **Filenames:** Use `camelCase` for topic files (such as `browserStore.md`) and `PascalCase` for standalone component pages after any numeric prefix. Avoid catch-all files like `helpers.md` or `recipes.md`; small related APIs can share a clearly named page.
- **Reference structure:** Keep small references flat and split larger ones into shallow `camelCase` area folders organized by reader task rather than source layout. The reference root lists areas and holds the full export index, each area README lists its pages, and pages link to related contracts and back to their area.

## Core's learning path

Core's bundled docs own the main integration tutorial, with two explicit entry points: generating an app with the starter or embedding in an existing React app. Keep each path's continuation clear so starter users do not repeat manual setup.

Carry one cumulative example through four milestones:

1. **Render a first browser:** install, assembly, stable stores, a data track, ruler, and responsive container.
2. **Add and configure tracks:** track types, ordering, settings, data sources, and interactions.
3. **Navigate and select:** panning, zooming, highlights, and provided controls.
4. **Use track collections:** define and share collections, load tracks directly, and offer selection with `TrackSelect`.

Each chapter states its required setup, expected working result, and next step. Keep package-specific quick starts standalone. Treat custom track-module authoring as an advanced guide rather than a prerequisite for onboarding.

## Writing tutorials and guides

Use `01-gettingStarted/` for sequential tutorials, `02-guides/` for standalone tasks and concepts, and `04-troubleshooting.md` for symptom diagnosis. Leave exhaustive track options on the track's reference page instead of repeating API tables.

- **Build around focused examples:** Use local data when teaching fetch and render contracts; introduce remote services, URLs, and response validation when those are the topic. Explain what the required pieces do before showing code, and build multi-part setups in connected steps so readers see how the snippets form a working file.
- **Keep details next to the concept:** Explain ownership, lifecycle, and constraints alongside the step that introduces them rather than dumping a long code block followed by scattered notes. Use text after an example to interpret the result or move to the next step, and push optional extensions into focused sections or links.
- **Teach core before optional UI:** Show direct collection loading before recommending `TrackSelect`, and prefer library calls and provided components over generic React UI walkthroughs. Cover app-owned state only when it is part of the feature contract, such as dialog open state or a track picker's draft and committed selection. Keep the happy path approachable and move advanced topics into dedicated guides.

## Maintaining the structure

- Update affected canonical pages and the export index when behavior changes. Only reorganize a whole package when that broader scope is intended.
- When renaming a file, update relative links, heading anchors, repo and `node_modules` path references, agent instructions, and skill links. Verify package inclusion and starter navigation, and leave no filename aliases.
- Retire legacy pages only after their useful tutorials, guides, or troubleshooting have a current home (or are deliberately dropped) and inbound links are updated. Export coverage alone does not replace those workflows.

For API grouping and completeness, see [API reference writing](api-reference.md). Repository-only guidance lives in the [knowledge base](../README.md).
