# Pages and panels

A page is a `WorkspacePage` definition. It names the page, gives it a side bar icon, and lists the content for each of its panels. The workspace decides where those panels go, how wide they are, and when they animate.

## Choose a page's panels

Every page has a center panel. Add a left panel for navigation within the page, such as a list of saved items, and a right panel for a tool that works alongside the page, such as an assistant.

```tsx
const reportsPage: WorkspacePage = {
  id: "reports",
  label: "Reports",
  icon: <AssessmentOutlined />,
  panels: {
    left: { title: "Saved reports", content: ReportList },
    center: { title: OpenReportName, content: ReportView },
  },
};
```

A side panel is absent when the current page does not supply it, and collapsed when the page supplies it but the user has hidden it. An absent panel is closed and has no toggle. A collapsed panel's toggle stays in the header so the user can reopen it.

Side panels have fixed size limits. The left panel opens at 240 pixels and resizes between 180 and 480. The right panel opens at 360 pixels and resizes between 280 and 720. Users resize a panel by dragging its interior edge, the border facing the center panel, or by focusing that edge and pressing the arrow keys, Home, or End. Double-clicking the edge restores the default width. Widths and collapsed sides last until the workspace unmounts; they are not saved between visits.

`Ctrl+B` toggles the left panel and `Ctrl+Alt+B` toggles the right panel. Each shortcut applies only when the current page supplies that panel. Shortcuts ignore text inputs, textareas, selects, and editable content, and holding a key does not repeatedly toggle a panel.

## Write panel content

Panel content components take no props. They read what they need from the app's stores, context, or router hooks, the same way any component in the app would.

Render text through MUI `Typography`. The workspace theme trims `Typography` text so it centers correctly; [Styling and text](styling.md) explains why.

The center panel supplies scrolling and 8 pixels of padding. Side-panel content supplies its own scrolling and padding. For a side panel with a long list, use a container that can shrink inside the frame:

```tsx
import Box from "@mui/material/Box";

function ProjectList() {
  return (
    <Box sx={{ flexGrow: 1, minHeight: 0, overflow: "auto", p: 1.5 }}>
      {/* Render the project list here. */}
    </Box>
  );
}
```

The center `title` is a component rather than a string, so it can show live state:

```tsx
function OpenReportName() {
  const name = useReportStore((state) => state.openReport?.name);
  return name ?? "Untitled report";
}
```

## Share state between panels

A page's panels render in separate parts of the frame and receive no props. Keep state they share, such as the open report, in a store or a context provider above `Workspace`. With Zustand:

```tsx
import { create } from "zustand";

type Report = { id: string; name: string };
type ReportState = {
  openReport: Report | null;
  setOpenReport: (report: Report) => void;
};

const useReportStore = create<ReportState>((set) => ({
  openReport: null,
  setOpenReport: (report) => set({ openReport: report }),
}));

function ReportList() {
  const setOpenReport = useReportStore((state) => state.setOpenReport);
  return (
    <button onClick={() => setOpenReport({ id: "1", name: "First report" })}>Open report</button>
  );
}

function ReportView() {
  const report = useReportStore((state) => state.openReport);
  return <p>{report?.name ?? "Choose a report"}</p>;
}
```

## Reuse a panel across pages

Each side of the frame stays mounted while the user moves between pages. When two pages supply the same content component for a side, React keeps that component mounted, so its state, such as an unsent message, carries from one page to the other. Pass the same component, not a new wrapper, to get this behavior. Moving through a page with no panel on that side unmounts the content, so its state resets.

```tsx
const assistant = { title: "Assistant", content: AssistantPanel };

const pages: WorkspacePages = [
  { id: "reports", label: "Reports", icon, panels: { center, right: assistant } },
  { id: "data", label: "Data", icon, panels: { center: dataCenter, right: assistant } },
];
```

## Order pages in the side bar

Pages appear in the side bar in list order. Set `placement: "bottom"` to move a page to the bottom group, which suits settings and help pages. Use the workspace's `sideBarFooter` prop for controls below the bottom group that are not pages, such as an account menu.

The first page in the list is the fallback. The workspace shows it when `pageId` is missing or names no page, so the `WorkspacePages` type requires at least one page.

[Back to the docs home](../README.md)
