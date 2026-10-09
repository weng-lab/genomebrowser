# gb app glossary

Terms for the local `gb` app, the shell that uses [`@weng-lab/workspace`](../workspace/glossary.md) to render the genome browser's pages. The [project glossary](../../docs/glossary.md) covers browser and track terms.

## Pages

The gb app's pages live in `src/pages/`, one folder per page, and are listed in `src/pages/index.ts`.

### Browser page

The genome browser, at `/browser`. Its left panel is the **session panel**, which lists saved sessions, and its right panel is the agent panel. The breadcrumb title names the open session.

### Collections page

Track collections, at `/collections`. It has only a center panel.

### Settings page

App settings, at `/settings`, in the side bar's bottom group. It has only a center panel.

### Agent panel

The browser page's right panel: the agent conversation and message box, in `src/pages/browser/AgentPanel.tsx`. Other pages can show it by supplying it as their right panel, and its state carries between pages that do.

## Routing

### Page route

The URL path that shows a page. The first path segment is the page ID, so `/settings` shows the settings page. `src/App.tsx` reads the path, passes its first segment to `Workspace`, and pushes a new history entry when the user picks another page, so back, forward, reload, and direct links work. The root path and unknown paths show the first page.
