# @weng-lab/workspace

A full-window app frame for React. The workspace draws a side bar of pages, resizable and collapsible left and right panels, and a center panel with breadcrumbs. Each page supplies its panels' content; the workspace places, sizes, and animates them. It has no domain code, so any app can use it. The local `gb` app in `apps/local` is the first.

```tsx
import { Workspace, type WorkspacePages } from "@weng-lab/workspace";
import HomeOutlined from "@mui/icons-material/HomeOutlined";

const pages: WorkspacePages = [
  {
    id: "home",
    label: "Home",
    icon: <HomeOutlined />,
    panels: { center: { content: () => <p>Hello</p> } },
  },
];

export function App() {
  return <Workspace pages={pages} pageId="home" />;
}
```

The package is private to this repository and is consumed from source. It needs React 19.2 or newer, MUI 7, and Emotion in the app that renders it.

## Documentation

- [Docs home](docs/README.md): the learning path and topic list.
- [Getting started](docs/01-gettingStarted.md): build a workspace with pages and routing.
- [Reference](docs/03-reference.md): props, types, and exports.
- [Glossary](glossary.md): the workspace's terms, such as frame, title row, and page link.
