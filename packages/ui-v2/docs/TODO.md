## Polish

- Colored indicators etc. for rows.
- Stronger typing on metadata, specifying the exact terms that can be used. (assay is one of ccre, atac, dnase etc, and the datagrid filter options reflect these terms)

## Sol critique

1. Medium: View updates can leave stale grid state. CatalogDataGrid is keyed only by catalog/view IDs and initializes
   columnVisibilityModel once. Updating grouping, leaf, or hidden columns while retaining those IDs updates the grid props but not
   visibility state. See packages/ui-v2/src/TrackSelect/catalog/catalogGrid.tsx:45 and packages/ui-v2/src/TrackSelect/catalog/
   catalogGrid.tsx:58.

2. Medium: Catalog invariants are incompletely and inconsistently validated. validateJson accepts duplicate track and view IDs.
   TrackSelect separately checks track IDs, while duplicate view IDs remain accepted; because view lookup uses find, the second
   duplicate view is unreachable and also creates duplicate React keys. See packages/ui-v2/src/TrackSelect/schema/
   catalogSchema.ts:19, packages/ui-v2/src/TrackSelect/TrackSelect.tsx:32, and packages/ui-v2/src/TrackSelect/catalog/
   catalogViews.ts:12.

3. Medium: Core workflows have no automated coverage. The package has five schema tests, but none cover draft selection, ID
   qualification, catalog/view switching, limits, clear/reset, selection diffs, failed submission, or store application. The
   highest-risk coordinator is packages/ui-v2/src/TrackSelect/session/useTrackSelectState.ts:108.

4. Low: ConfirmDialog represents two implicit modes. Omitting onConfirm turns it into an informational alert and also changes its
   buttons and color. Separate explicit confirmation/alert variants would make this composition easier to extend. See packages/ui-
   v2/src/TrackSelect/dialogs/confirmDialog.tsx:13.

5. Low: The grid selection handler unnecessarily erases MUI’s type. The callback is already typed with an ids set, but it is cast to
   an optional shape with a silent empty fallback. This weakens compile-time protection against API changes. See packages/ui-v2/src/
   TrackSelect/catalog/catalogGrid.tsx:86.

6. Low: Style compliance is inconsistent. The TrackSelect/TrackSelect.tsx path and private DEFAULT\_\* constants do not follow the
   repository’s camelCase guidance in docs/style.md:1. The formatter also flags packages/ui-v2/src/TrackSelect/schema/
   catalogSchema.ts:52.
