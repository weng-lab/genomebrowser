# TrackSetSettings

Use this MUI dialog to manage a runtime track set. Core owns membership, order and fetch lifetimes; the dialog reads that browser's stores and mounts each child's existing settings form.

```tsx
import { GenomeBrowser } from "@weng-lab/genomebrowser";
import { TrackSetSettings } from "@weng-lab/genomebrowser-ui";

<GenomeBrowser
  browserStore={useBrowserStore}
  trackStore={useTrackStore}
  trackSetSettingsComponent={TrackSetSettings}
/>;
```

Create sets through `createTrackStore({ modules, tracks, trackSets })` or its `createTrackSet` action. Each set references the IDs of existing tracks. The parent header's Settings action opens this dialog. No application-owned dialog state is required.

## Controls

Show/hide the parent, independently enable children, choose a display mode supported by every child, pin or move the set, and ungroup it while retaining its tracks. Expand a child to edit its original module settings. Same-type batch actions within a child panel are scoped to members of this set, leaving unrelated tracks untouched.

Visibility controls remain available during loading so hiding a parent or child can cancel requests. Display changes and child configuration forms respect the browser's interaction gate. Parent visibility never overwrites child display modes or individual visibility choices.

## Props and context

This component accepts core's `TrackSetSettingsProps`: `trackSetId: string` and `closeSettings: () => void`. `GenomeBrowser` supplies both. Import the type from `@weng-lab/genomebrowser` when implementing a different settings surface. The component requires the hosting browser context and renders nothing when the selected set no longer exists.

The dialog uses the host's MUI theme and standard Dialog focus and keyboard handling. It does not persist state, create tracks or load a collection catalog. This first version supports one level of sets. The browser also supports dragging track margins to change membership and dragging parent titles to move whole sets; these controls complement the dialog's Move up/Move down buttons.
