# Package documentation architecture

This is the target architecture. Existing files may not have migrated yet; do not treat their current placement as precedent or move unrelated docs during a focused edit.

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

Use these categories consistently, but create directories only when they contain useful pages. A small package may need only one getting-started page. The starter's generated application docs explain that application, not the library API, and need not imitate the library tree.

Keep `README.md` unnumbered at every level, including package and docs roots. Each folder index explains its purpose, lists its immediate pages or subsections in the intended order, and links to its parent. Root indexes may also link directly to tutorial chapters. Keep titles and link labels free of ordering prefixes.

Reserve `01-gettingStarted`, `02-guides`, `03-reference`, and `04-troubleshooting.md` across library packages. Omit sections without content and allow gaps. Number tutorial chapters with two-digit prefixes, starting at `01` within each folder. Number reference area folders when a suggested browsing order helps, as in core, tracks, and UI. Reader's format-specific areas remain unnumbered. Independent guides and API pages remain unnumbered.

Preserve camelCase topic names and PascalCase component names after any prefix. Numbers express reading order, not versions or API identifiers. README navigation should match numbered folder and chapter order. For generated application docs, use `01-running.md`, `02-architecture.md`, `03-customization.md`, and `04-deployment.md` under an unnumbered docs root.

READMEs route readers rather than collecting growing reference sections. Reference may include focused examples but should not repeat entire workflows.

Organize larger references into shallow area folders named in camelCase; small references can remain flat. The reference root lists areas and maintains the complete export index. Each area index lists its pages, and individual pages link to related contracts and back to their area. Categories organize APIs by reader need rather than mirroring source directories.

Follow repository naming conventions: camelCase for topic filenames and PascalCase for independently documented components. Use descriptive names such as `browserStore.md`; avoid catch-all files such as `helpers.md` or a growing `recipes.md`. A related group of small APIs can share a well-named page.

## Learning path

Core's bundled docs own the main integration tutorial. Offer two entrances: create a new application with the starter, or embed in an existing React application. Use one cumulative example through these milestones:

1. Render a first browser: installation, assembly, stable stores, a data track, ruler, and responsive container.
2. Add and configure tracks: track types, ordering, settings, data sources, and interactions.
3. Use browser navigation and selection: panning, zooming, highlights, and provided controls.
4. Use track collections: define and share collections, load tracks directly, and offer selection through TrackSelect.

State the dependencies and setup required by each chapter, the expected working result, and the next step. Present starter generation and manual installation as explicit alternatives, with a clear continuation for each; readers should not infer that a generated project needs the manual setup repeated. Keep package-specific quick starts independently usable. Custom module authoring is an advanced guide, not a prerequisite for completing this path. Document only supported capabilities; do not invent an integration API to simplify a tutorial.

## Writing tutorials and guides

Use `01-gettingStarted/` for sequential learning, `02-guides/` for independent tasks and concepts, and troubleshooting for diagnosis. Track configuration belongs in the track's reference page. Explain concepts, workflows, examples, defaults, and limitations instead of repeating API tables.

Build the explanation around a minimal realistic example. Keep examples focused on the concept being taught. Use local data to explain fetch and render contracts; introduce services, URL construction, and response validation when those are the subject. Introduce the required pieces, what each does, and why they fit together before presenting their code. For a setup with several cooperating parts, develop the example in connected steps and make clear how the snippets form a working file or application.

Place ownership, lifecycle, configuration, and constraints alongside the concept they explain. Avoid a large copy-and-paste example followed by a separate explanation dump, or a recurring pattern of code followed by unrelated one-sentence tips. Text after an example should interpret its result or lead into the next step. Integrate necessary details into the relevant explanation and put optional extensions in focused sections or further-reading links; not every example needs a trailing paragraph.

Integration guides teach browser features and their use in an application. Explain a core feature independently before introducing optional UI. For example, describe collections and direct loading before recommending TrackSelect for user selection. Prefer focused library calls and provided components over walkthroughs for building custom forms, toolbars, or other generic React UI. Explain application-owned state only where it is part of the feature contract, such as a dialog's open state or a track picker's draft and committed selection.

Keep the happy path approachable. Move advanced material into focused guides or advanced sections instead of making the first page intimidating.

## Maintaining the structure

When renaming documentation, update relative links, heading targets, repository and installed-package path references, agent instructions, and skill links. Check package inclusion and generated application navigation. Do not leave aliases for old filenames.

Update the affected canonical pages and export index when behavior changes. Reorganize a whole package only when that broader scope is intended. Existing placement is not a reason to move unrelated pages during a focused edit.

Retire legacy pages after their useful tutorial, guide, or troubleshooting content has a current home or has deliberately been retired, and update inbound links. Complete export coverage alone does not replace those workflows.

For API grouping and completeness, see [API reference writing](apiReference.md). Repository-only guidance follows [Maintainer documentation](maintainerDocs.md).
