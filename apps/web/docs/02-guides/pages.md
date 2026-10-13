# Pages and panels

A route owns its title, optional side panels, and center content. The generic workspace components own their placement, sizing, and animation. Keep domain components beside the route's `page.tsx`; `components/workspace/` must not import them or browser stores.

## Add a page

Create a normal Next.js server page at `app/(workspace)/reports/page.tsx`. Import interactive client components where needed and pass their elements to `WorkspacePage`:

```tsx
import { WorkspacePage } from "../../../components/workspace/WorkspacePage";
import { ReportList } from "./ReportList";
import { ReportView } from "./ReportView";

export default function ReportsPage() {
  return (
    <WorkspacePage title="Reports" left={{ title: "Reports", children: <ReportList /> }}>
      <ReportView />
    </WorkspacePage>
  );
}
```

Add the route's link to `app/(workspace)/navigation.tsx` using `href`, `label`, `icon`, and optional `placement: "bottom"`. Entries appear in list order within their group. Titles and panel elements stay in the route. No central page registry or export is required.

Every route has center content. Use a left panel for navigation within the page and a right panel for a tool used alongside it. An absent side panel has no toggle. A supplied panel can be collapsed and reopened by the user.

## Content and shared state

The center panel supplies scrolling and padding. Side-panel content supplies its own scrolling and padding. A long list needs a container that can shrink:

```tsx
import Box from "@mui/material/Box";

<Box sx={{ flexGrow: 1, minHeight: 0, overflow: "auto", p: 1.5 }}>
  {/* Render the list here. */}
</Box>;
```

Use MUI `Typography` for text so the workspace theme applies consistently. See [Styling and text](styling.md).

State shared by a route's panels belongs in its domain components or an appropriate store or provider. State that must survive navigation belongs above those routes, as the browser session does in `AppProviders`. Do not depend on page component state surviving a Next.js route change. Panel widths and collapsed state persist in the shared workspace layout, separately from panel content state.

For widths, shortcuts, and resize controls, see the [component reference](../03-reference.md#side-panel-behavior).

[Back to the docs home](../README.md)
