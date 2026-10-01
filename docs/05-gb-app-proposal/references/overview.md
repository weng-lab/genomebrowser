# Building the gb app

This is the development guide for a standalone genome browser app built on our existing `@weng-lab/genomebrowser` library. Researchers will use it to explore genomic data, save their work, and ask an AI agent to help control the browser.

## What we're building

The app has two versions that share the same React interface, called the **workspace**. It contains the genome browser, a chat panel, and the controls around them.

- **Local:** a command called `gb` starts the app on a laptop or lab server. Users open it in their web browser and load files from that machine. No account is required. They can connect their own AI agent.
- **Cloud:** a website where users sign in, save browser sessions, and chat with Eve, our cloud agent.

The current plan is to build the local version first, then add the cloud version. The browser must also work without an agent. See the [product vision](vision.md) for the intended users and examples.

A **browser session** is saved work: the region, tracks, and highlights. It is separate from an agent's chat conversation.

## How it fits together

![System overview: the GB workspace reads genomic files and exchanges commands and results with the backend, which connects to AI agents through MCP, a database, and authentication services.](images/system-overview.png)

There are three main parts to understand:

1. **The genome browser library** draws tracks and handles genome browsing. It already lives in `packages/`.
2. **The workspace** is the shared React UI we plan to build in `apps/workspace`.
3. **The API server** saves sessions and connects agents to the workspace. Its shared code will live in `apps/server`.

The local app and cloud website each combine the workspace with the server. They supply the parts that differ, such as storage and sign-in.

When an agent asks to move to a region, its request goes through the server to an open browser tab. The tab calls the genome browser library and returns the result. The live browser state belongs to that tab; the server stores saved snapshots.

Agents use **MCP**, a protocol for calling tools provided by another application. All agents use the same genome browser tools, including the agent in our chat panel. The [architecture](architecture.md) explains the command flow, planned folders, and shared rules.

## Where to start

Read the [roadmap](roadmap.md), then the design page for the part you're working on. You don't need to read every page before starting.

The first milestone is a local workspace that an external agent can control. It gives the team a working path from an agent request to a visible change in the browser before adding saved sessions, local file loading, and cloud services.

| When you're working on… | Read |
| --- | --- |
| The React interface and chat panel | [Workspace](workspace.md) |
| Agent commands, tools, and permissions | [Agents and tools](agents-and-tools.md) |
| Sending commands between agents and tabs | [API server](api-server.md) |
| Saving work and handling multiple tabs | [Sessions and data](sessions-and-data.md) |
| Starting and packaging the local app | [Local CLI](local-cli.md) |
| Loading files from disk | [Local files](local-files.md) |
| Opening an app running on a lab server | [Remote access](remote-access.md) |
| Accounts and access control | [Identity and security](identity-and-security.md) |
| Deploying the website and server | [Cloud](cloud.md) |
| Connecting to other AI applications | [Integrations](integrations.md) |

The [glossary](glossary.md) explains unfamiliar terms. The [decision records](decisions/README.md) explain why particular approaches were chosen.

## What is settled, and what still needs discussion?

The decision index labels choices as **Decided** or **Proposed**. Each design page keeps its remaining questions under **Open questions**, with a suggested default. Those defaults are starting points for implementation, not confirmed decisions. Read them before building the relevant feature.

The plan leaves multi-user collaboration, automatic file uploads, and offline copies of cloud sessions out of scope. Other ideas, such as embedding the browser inside an AI chat application, are listed separately in the roadmap so they don't hold up the local app.

As work progresses, update the relevant design page and roadmap in the same PR. When a question is resolved, put the answer into the design and remove the question. Record significant architecture changes in [decisions/](decisions/README.md).

[Back to reference notes](README.md)
