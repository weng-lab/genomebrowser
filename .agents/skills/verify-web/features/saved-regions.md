# Saved regions and groups

Saved regions and groups lets a user bookmark the current genomic view or custom coordinates in the browser's left panel, jump back to saved regions, organize them into colored collapsible groups, toggle highlight visibility, and delete individual regions, groups, or all regions.

## Sub-features

- `regions-add-current` saves the current browser view as a named highlight in the `Saved regions` list.
- `regions-add-coordinates` saves a region by entering explicit start and end positions on the current chromosome.
- `regions-jump` clicking a saved region row moves the genome browser to that region and marks the row `aria-current="location"`.
- `regions-group` creates a colored group containing selected regions, collapses/expands it, and toggles group highlight visibility.
- `regions-delete` deletes a single region, a group with its regions, or all regions via confirmation dialog.

## How to get to it (user POV)

- Open a session at `/browser/<id>` with the left `Genome Browser` panel open (toggle with the left sidebar button or `Ctrl+B` if collapsed).
- Under `Regions`, click `Add region` (`+`) or `Add group` (folder icon).
- Click any saved region row in `Saved regions` to navigate there, or open `Actions for region <name>` to rename, recolor, edit coordinates, hide/show, move to a group, or delete.
- On a group header, click its title to collapse/expand, click `Hide highlights in <group>` / `Show highlights in <group>`, or open `Actions for group <name>`.
- Click `Delete all regions` at the bottom of the left panel and confirm `Delete all`.

## Driving it with verify-web

Preconditions:

- `@weng-lab/web` is healthy (`verify-web.mjs doctor` passes) and a fresh `hg38` session is open at `/browser/<id>` with the left panel expanded showing `No regions yet`.

- **Add current region.** Click `Add region`, enter a name, and save. Run `verify-web.mjs browser find role button click --name "Add region" --exact`, `verify-web.mjs browser find role textbox fill --name "Region name" "Promoter A"`, and `verify-web.mjs browser find role button click --name "Add current region"`. The form closes, `Promoter A` appears inside the `Saved regions` list with its coordinates, and `All changes saved` appears.
- **Add region by coordinates.** Open `Add region` again, expand coordinates, and apply. Run `verify-web.mjs browser find role button click --name "Add region" --exact`, `verify-web.mjs browser find role textbox fill --name "Region name" "Enhancer B"`, `verify-web.mjs browser find role button click --name "Add by coordinates"`, `verify-web.mjs browser find role textbox fill --name "Start" "53380000"`, `verify-web.mjs browser find role textbox fill --name "End" "53395000"`, and `verify-web.mjs browser find role button click --name "Apply"`. `Enhancer B` appears in `Saved regions`.
- **Jump to saved region.** Click `Enhancer B` in `Saved regions` (`verify-web.mjs browser find text "Enhancer B" click`). Confirm the toolbar region updates to the saved `chr12` coordinates and the `Enhancer B` row becomes the current location.
- **Create, collapse, and hide a group.** Open `Add group`: `verify-web.mjs browser find role button click --name "Add group" --exact`. Name it `Regulatory`: `verify-web.mjs browser find role textbox fill --name "Group name" "Regulatory"`. Check `Promoter A` and `Enhancer B` from the `Add regions` checkboxes (locate via `verify-web.mjs browser snapshot -i`), then click `verify-web.mjs browser find role button click --name "Create group"`. Confirm the `Regulatory` group header shows count `2` with both regions underneath. Click `verify-web.mjs browser find role button click --name "Hide highlights in Regulatory" --exact` and confirm both rows append `· Hidden`.
- **Confirm persistence.** Wait for `All changes saved` (`verify-web.mjs browser wait --text "All changes saved"`), reload (`verify-web.mjs browser reload`), and confirm the `Regulatory` group and both hidden regions persist.
- **Delete all regions.** Click `verify-web.mjs browser find role button click --name "Delete all regions"`, confirm the `Delete all regions?` dialog opens, and click `verify-web.mjs browser find role button click --name "Delete all"`. Confirm `No regions yet` returns and `Delete all regions` becomes disabled.
- **Proof.** Capture a `.webm` recording of the add/group/hide/delete flow or screenshots before and after grouping: `verify-web.mjs screenshot regions/grouped`, `verify-web.mjs snapshot regions/grouped`, and `verify-web.mjs screenshot regions/cleared`.

## Gotchas

- `Add by coordinates` submits via the `Apply` button inside the `Coordinates` fieldset, whereas saving the current view submits via `Add current region`.
- Pressing `Escape` inside the `Coordinates` fieldset closes only the coordinate fields, not the whole `Add region` form.
- Panel open/closed state persists across reloads; if the left panel was collapsed earlier, reopen it (`Show left panel` or `Ctrl+B`) before looking for `Add region`.
- Saved regions and groups autosave with the session; wait for `All changes saved` before reloading to assert persistence.
