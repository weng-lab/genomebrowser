# Core browser refactor

Keep `GenomeBrowser` props and visible behavior unchanged. Move ownership in small steps; each step needs an independent review before it is committed. The current baseline is 396 core tests in 36 files and 16 render-budget tests in 3 files.

Stage 2 implementation is ready for independent review: `usePanning` owns content offsets and pointer/wheel commits, while render-window geometry owns region expansion and overscan policy. The browser's provider lifetime and canvas ownership remain for the next stage.

## Behavior to protect

| Behavior                                                                                                                                      | Existing evidence                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Replacing either application store updates hosted renderers and fetched data; open settings survive; old requests cannot publish late results | `useGenomeBrowser.test.tsx`                                                                                     |
| Replacing a store releases the old controller's track resources                                                                               | `useGenomeBrowser.test.tsx`, added for this refactor                                                            |
| Unmount aborts requests and releases resources; separate browser instances own separate resources                                             | `dataLifecycle.test.tsx`                                                                                        |
| Responsive sizing waits for a usable width, keeps geometry current, debounces fetching, and cleans up in Strict Mode                          | `GenomeBrowserSizing.test.tsx`                                                                                  |
| Pointer and wheel pans commit or cancel correctly, including loaded-data and chromosome edges                                                 | `usePanController.test.tsx`, `perTrackData.test.tsx`, `GenomeBrowserRegions.test.tsx`, `trackTitlePan.test.tsx` |
| Region selection cancels on mode changes, blocking, SVG replacement, and unmount                                                              | `SelectRegion.test.tsx`                                                                                         |
| Highlights keep their paint order; track updates and UI overlays preserve render isolation                                                    | `highlightLayering.test.tsx`, `renders/genomeBrowser.renders.test.tsx`                                          |

`usePanController.test.tsx` tests private hooks because gesture timing and cancellation are hard to exercise deterministically through the browser. Once the deeper panning module exists, keep only cases that protect behavior absent from browser integration tests. Do not update render snapshots just because names move: compare each scenario's actual commits and investigate increases.

## Ownership decisions

1. **Panning.** `usePanning` in `viewport/` owns `useContentTransform`, `usePanController`, and wheel commit/cancel rules. Keep the native wheel listener in a small child of `BrowserCanvas` that subscribes to `isLoading` and `selectionMode`; reading either in `BrowserCanvas` would render the whole track tree on gate changes. Keep pointer gating in `PanTrack` for the same reason. `usePanning` exposes only the pan handlers and content registration needed by tracks and highlights. Preserve the current `SvgShell` attachment timing during this move.
2. **Pan drag status.** `useTooltip` needs a call-time answer while a pointer drag is active. Give `BrowserProvider` one mount-local mutable status object in its context. Let `usePanDrag` write that object and `useTooltip` read it through the existing context, without a React subscription. This removes the dependency that currently forces panning to be constructed before the provider. Reset it on pointer cancellation and unmount. Avoid a second context or global state.
3. **Browser lifetime.** Deepen `BrowserProvider` to create the private menu, settings, and tooltip stores once per mount and own the data controller for the current store pair. A change to either supplied store replaces the controller and context before children render; connecting and disconnecting remain in a layout effect. Do not key the browser by store identity because settings must stay open.
4. **Canvas.** `GenomeBrowser` retains scale validation, container measurement, and fixed/responsive sizing. `BrowserCanvas` owns SVG composition and shows filled highlights, tracks, then outlined highlights in that order. A track-layout hook may combine order, heights, row positions, and total height if it actually removes coordination from the canvas. Let `RegionSelection` and `Highlights` own their store wiring and placement, but keep their props ordinary and their render subscriptions below the track tree.
5. **Geometry.** Move `expandRegion` out of the React pan hook into `renderWindow.ts` or a nearby pure geometry file. Keep overscan policy shared by fetching and highlights without making either module import the other's implementation.

## Checks per step

Run the affected browser tests and render budgets after each ownership move. The independent review should check stale closures, active gestures during region or width changes, request/resource cleanup, instance-local state, and whether context or gate subscriptions trigger extra track renders. Run `pnpm verify`, `pnpm run doctor`, and a browser interaction pass before the PR handoff. Treat shared-store `isLoading` semantics and row-layout render optimization as separate behavior work.
