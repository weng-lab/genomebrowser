# Project direction

Build the app on `@weng-lab/genomebrowser`, with these priorities guiding the design. The [architecture](architecture.md) describes how the pieces fit together; the [roadmap](roadmap.md) gives the implementation order.

## Local first, cloud next

Start with `gb` running on a laptop or lab server, with no account required. Get file loading, saved sessions, and agent control working before adding cloud accounts and hosting.

Both versions share the workspace UI and server logic. Local and cloud supply their own storage, sign-in, and agent connections. Keep genome browsing capabilities in the library so other applications can use them too.

## One browser, with or without an agent

The workspace must work through ordinary UI controls. Agents use the same browser actions, and their changes appear in the user's open tab. The tab owns live browser state; the server saves snapshots.

All agents use the same MCP tools, including the agent in the chat panel. Keep the UI independent of the agent provider, and enforce app permissions on the server.

Save browser sessions independently of chat conversations. Switching agents or starting a new conversation should not discard the user's tracks, region, or highlights.

## Keep local files under the user's control

Read files from the machine running `gb`, including a lab server reached over SSH. Do not automatically upload them. Connecting a remote AI provider is a separate data-sharing choice; running `gb` locally does not make that provider local.

## Keep the first release focused

Prioritize file loading, navigation, and track configuration. Scientific analysis tools, such as signal summaries and sample comparisons, and embedding the workspace inside other AI applications are later goals.

Multi-user live collaboration and a general-purpose science workbench are outside the project scope.

[Back to the app guide](README.md)
