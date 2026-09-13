# Public API cleanup notes

Snapshot from the API review on September 13, 2026, excluding types. Use these categories as the structure for the next documentation organization pass. This is a planning reference, not the authoritative current export inventory.

Follow-up notes:

- The SCREEN GraphQL endpoint was removed in #230; omit the snapshot's integration-constant category from the future public API organization.
- Context-menu access is internal. The `useContextMenuStore`, `ContextMenuStore`, and `ContextMenuPosition` public exports have been removed; omit the snapshot's context-menu category from the future public API organization.
- Preserve the grouping below when reorganizing the documentation.

| Group                       | Export                                  | What you use it for                                                                                                 |
| --------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Browser setup**           | `GenomeBrowser`                         | Render the browser with your stores and track modules.                                                              |
|                             | `createBrowserStore`                    | Own viewport state, navigation, selection, highlights, and display settings.                                        |
|                             | `createTrackStore`                      | Own track instances, their registry, updates, ordering, and pinning.                                                |
|                             | `useGenomeBrowser`                      | Access the hosting browser’s two stores from a renderer, settings component, or tooltip.                            |
| **Assemblies and regions**  | `createAssemblyDefinition`              | Define an assembly and its chromosome lengths.                                                                      |
|                             | `hg38`, `mm10`, `ce11`, `dm6`, `tair10` | Use a built-in assembly definition.                                                                                 |
|                             | `parseRegion`                           | Parse a region string.                                                                                              |
|                             | `normalizeRegion`                       | Validate a region against an assembly and clamp overlapping coordinates to chromosome bounds.                       |
| **Track definition**        | `defineTrackModule`                     | Define a track’s configuration, fetching, renderers, settings, and tooltip behavior.                                |
|                             | `fetchOnChange`                         | Mark configuration fields whose changes require fetching again.                                                     |
| **Renderer integration**    | `useInteraction`                        | Access the track instance’s item interaction callbacks, with runtime context already bound.                         |
|                             | `useTooltip`                            | Show and hide the module’s tooltip for an item.                                                                     |
|                             | `useAutoTrackHeight`                    | Update track height based on the renderer’s row count.                                                              |
|                             | `TrackOverlay`                          | Draw annotations fixed within the visible plot during horizontal panning.                                           |
|                             | `TrackLabel`                            | Place a styled text annotation at a plot edge or corner.                                                            |
| **Context menus**           | `useContextMenuStore`                   | Read, open, or close the hosting browser’s built-in track menu.                                                     |
| **Collections and schemas** | `validateTrackCollection`               | Validate collection input, including duplicate IDs and metadata references, while preserving authored track inputs. |
|                             | `generateTrackCollectionJsonSchema`     | Generate JSON Schema for collection authoring and editor tooling.                                                   |
| **Integration constant**    | `defaultScreenGraphQlEndpoint`          | Access the default SCREEN GraphQL endpoint.                                                                         |

The store factories also expose substantial functionality through their returned objects:

| Returned API  | Available operations                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Browser store | Set region, zoom, configure width and selection, add/remove highlights.                                                 |
| Track store   | Add/remove/replace/update tracks, batch additions and removals, reorder, pin, retrieve tracks, and access the registry. |
| Both stores   | Selector subscriptions, `getState()`, `subscribe()`, and unrestricted `setState()`.                                     |
