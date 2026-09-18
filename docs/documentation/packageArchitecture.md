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
      <area>/               Related capabilities, when grouping helps browsing
        README.md           Area purpose and page navigation
        <apiOrTopic>.md     Focused API contract and examples
    troubleshooting.md      Symptoms, causes, and remedies
```

Use these categories consistently, but create directories only when they contain useful pages. A small package may need only one getting-started page. The starter's generated application docs explain that application, not the library API, and need not imitate the library tree.

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

Use `gettingStarted/` for sequential learning, `guides/` for independent tasks and concepts, and troubleshooting for diagnosis. Track configuration belongs in the track's reference page. Explain concepts, workflows, examples, defaults, and limitations instead of repeating API tables.

Build the explanation around a minimal realistic example. Keep examples focused on the concept being taught. Use local data to explain fetch and render contracts; introduce services, URL construction, and response validation when those are the subject. Introduce the required pieces, what each does, and why they fit together before presenting their code. For a setup with several cooperating parts, develop the example in connected steps and make clear how the snippets form a working file or application.

Place ownership, lifecycle, configuration, and constraints alongside the concept they explain. Avoid a large copy-and-paste example followed by a separate explanation dump, or a recurring pattern of code followed by unrelated one-sentence tips. Text after an example should interpret its result or lead into the next step. Integrate necessary details into the relevant explanation and put optional extensions in focused sections or further-reading links; not every example needs a trailing paragraph.

Integration guides teach browser features and their use in an application. Explain a core feature independently before introducing optional UI. For example, describe collections and direct loading before recommending TrackSelect for user selection. Prefer focused library calls and provided components over walkthroughs for building custom forms, toolbars, or other generic React UI. Explain application-owned state only where it is part of the feature contract, such as a dialog's open state or a track picker's draft and committed selection.

Keep the happy path approachable. Move advanced material into focused guides or advanced sections instead of making the first page intimidating.

## Maintaining the structure

Update the affected canonical pages and export index when behavior changes. Reorganize a whole package only when that broader scope is intended. Existing placement is not a reason to move unrelated pages during a focused edit.

Retire legacy pages after their useful tutorial, guide, or troubleshooting content has a current home or has deliberately been retired, and update inbound links. Complete export coverage alone does not replace those workflows.

For API grouping and completeness, see [API reference writing](apiReference.md). Repository-only guidance follows [Maintainer documentation](maintainerDocs.md).
