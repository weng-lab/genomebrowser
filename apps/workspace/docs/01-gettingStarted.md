# Getting started

This tutorial builds a small app with two pages: a projects page with a project list on the left and an assistant on the right, and a settings page with only a center panel. It ends by connecting the side bar to the URL.

## Install

Add the workspace and its peer dependencies to the app. Inside this repository, use the workspace protocol:

```json
{
  "dependencies": {
    "@weng-lab/workspace": "workspace:*",
    "@emotion/react": "catalog:",
    "@emotion/styled": "catalog:",
    "@mui/icons-material": "catalog:",
    "@mui/material": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

The workspace exports TypeScript source, so the app's bundler compiles it. Vite does this without configuration. In Next.js, add `@weng-lab/workspace` to `transpilePackages`.

## Render a first page

A page has an ID, a side bar label and icon, and its panels. Only the center panel is required. Each panel's `content` is a component that takes no props.

```tsx
// src/pages.tsx
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import type { WorkspacePages } from "@weng-lab/workspace";

function ProjectsView() {
  return <p>Pick a project.</p>;
}

export const pages: WorkspacePages = [
  {
    id: "projects",
    label: "Projects",
    icon: <FolderOutlined />,
    panels: {
      center: { content: ProjectsView },
    },
  },
];
```

```tsx
// src/App.tsx
import { Workspace } from "@weng-lab/workspace";
import { pages } from "./pages";

export function App() {
  return <Workspace pages={pages} pageId="projects" />;
}
```

The workspace fills the window. It shows the Projects icon in the side bar and "Projects" in the center panel's title row.

## Add side panels

In `src/pages.tsx`, define the side-panel components, then replace the projects page's `panels` field. Give the projects page a left panel with a project list, a right panel with an assistant, and a breadcrumb title. Side panels need a `title`, which the workspace shows in the panel's title row. The center `title` is a component, so it can show live state such as the open project's name.

```tsx
function ProjectList() {
  return <p>No projects yet.</p>;
}

function AssistantPanel() {
  return <p>No assistant connected.</p>;
}
```

```tsx
panels: {
  left: { title: "All projects", content: ProjectList },
  center: { title: () => "Untitled project", content: ProjectsView },
  right: { title: "Assistant", content: AssistantPanel },
},
```

Each side panel now has a collapse toggle in the header, and dragging its edge resizes it. The workspace owns these controls; the page only supplies content.

## Add a second page

Add a settings page to the bottom of the side bar. It has only a center panel, so the workspace hides both side panels and their toggles while it is shown.

```tsx
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";

function SettingsView() {
  return <p>Settings</p>;
}

export const pages: WorkspacePages = [
  {
    id: "projects",
    label: "Projects",
    icon: <FolderOutlined />,
    panels: {
      left: { title: "All projects", content: ProjectList },
      center: { title: () => "Untitled project", content: ProjectsView },
      right: { title: "Assistant", content: AssistantPanel },
    },
  },
  {
    id: "settings",
    label: "Settings",
    icon: <SettingsOutlined />,
    placement: "bottom",
    panels: { center: { content: SettingsView } },
  },
];
```

Moving between pages swaps the panels instantly. Panel widths and collapsed sides carry over to the next page that has those panels.

## Connect the URL

The side bar renders each page as a link to `/<page id>`. With a fixed `pageId`, clicking a link loads that URL, but the workspace keeps showing the projects page. Read the page from the URL and pass a `navigate` function so links change pages without reloading:

```tsx
import { Workspace } from "@weng-lab/workspace";
import { useSyncExternalStore } from "react";
import { pages } from "./pages";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function readPageId() {
  return window.location.pathname.split("/")[1];
}

function navigate(href: string) {
  window.history.pushState(null, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function App() {
  const pageId = useSyncExternalStore(subscribe, readPageId);
  return <Workspace pages={pages} pageId={pageId} navigate={navigate} />;
}
```

`/projects` and `/settings` now show their pages, and back and forward work. The root path and unknown paths show the first page. Apps with a router pass its values instead; [Routing](02-guides/routing.md) shows Next.js and TanStack Router.

## Next steps

- [Pages and panels](02-guides/pages.md) covers sharing state between a page's panels and reusing a panel across pages.
- [Styling and text](02-guides/styling.md) explains how the workspace aligns text and how to render text in panel content.

[Back to the docs home](README.md)
