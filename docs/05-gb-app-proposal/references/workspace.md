# Workspace

`apps/workspace` contains the app interface: header, session picker, genome browser, chat panel, and settings. Local and cloud should look and behave nearly identically. Build these components once and render them from both entry points.

## What belongs here

- The shared layout, header, session picker, and settings.
- The genome browser and its stores.
- Command handlers that call the library's browser actions.
- The connection that receives commands from the API server and returns results.
- The chat panel, agent status, command log, and control to disable agent access for a session.
- Approval prompts, when the relevant agent features are added.

The server owns storage and permission enforcement. The workspace displays state and prompts, and applies browser commands. See [agents and tools](agents-and-tools.md) for command and approval behavior, and [API server](api-server.md#tab-connections) for the connection protocol.

## Two builds, one interface

The local Vite page and cloud Next.js page are small entry points, called shells. Each renders the same workspace and supplies its API connection, chat provider, and navigation. Keep workspace layout and interactions out of the shells so a UI change only needs to be made once.

The two builds package the same React code differently. The local build produces static files served by `gb`. The cloud build includes the workspace in the website. They do not need separate versions of the header, session picker, or chat panel.

## Cloud sign-in

Use one `cloudSignInEnabled` prop to control cloud account features. Initially it is `false` locally and `true` on the website. When disabled, hide sign-in and account controls and do not start cloud authentication requests. Local sessions and agent connections still work.

This flag is separate from the credentials used to connect to the API server. Local `gb` still uses its launch token and cookie. The server enforces access regardless of which controls the UI shows.

This illustrates the intended inputs, not a finalized component API:

```tsx
<Workspace
  apiBaseUrl={apiBaseUrl}
  auth={auth}
  cloudSignInEnabled={cloudSignInEnabled}
  chatProviders={chatProviders}
  sessionId={sessionId}
  onNavigate={navigate}
/>
```

Keep account UI shared. The shell supplies the sign-in connection appropriate to that version. Initially, the local app only lists local sessions and the website only lists cloud sessions. Adding local cloud sign-in later also requires the device flow and cloud session access; turning on the flag alone does not implement those features.

## Chat providers

The cloud shell supplies Eve; the local shell supplies ACP. Each provider translates its messages into a shared format. Keep Eve and ACP protocol types out of the chat UI so the same components work with either provider.

## React boundaries

Keep Next.js imports out of `apps/workspace`. Navigation uses the shell's callback. Enforce the import boundary with a lint rule.

Render the workspace only in the browser. The Next.js shell must disable server rendering for it; marking a component with `"use client"` alone does not do that.

Use the same Tailwind configuration and CSS variables in both shells.

## Open questions

This choice still needs confirmation before implementing multiple-tab behavior.

### WS-1. How do several tabs on one session stay in sync in the UI?

The current proposal is that all tabs show the same region, tracks, and highlights. An alternative is to share tracks and highlights while letting each tab navigate independently.

Mirroring everything gives a session one shared view, but moving in one tab also moves the others. We still need rules for simultaneous changes; see [sessions and data](sessions-and-data.md#browser-sessions-and-tabs).

[Shared workspace decision](decisions/0008-shared-workspace-package.md) · [Back to the app guide](README.md)
