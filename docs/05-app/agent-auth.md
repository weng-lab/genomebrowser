# Agent authentication and user-scoped tools

Proposed direction; authentication and Eve integration are not implemented yet. Keep `@weng-lab/mcp` independent of persistence, with the same user ownership checks for external clients and the embedded agent panel.

## Two ways to authorize an agent

External MCP clients use the standard MCP OAuth flow through Clerk: the user signs in and grants access, and the client receives a token intended for our MCP server.

The planned embedded panel will use [Vercel Eve](https://eve.dev). It should reuse the user's existing Clerk app session without another sign-in or consent screen. Sharing the frontend location does not itself authenticate MCP requests.

Both paths produce verified user identity and permissions. Tools never accept an acting `userId` from the agent. Keep credential verification and transport wiring behind injected capabilities, reusing existing session models and command contracts.

## Eve integration

Eve's [Next.js integration](https://eve.dev/docs/guides/frontend/nextjs) uses `withEve()` and `useEveAgent()`. Requests share the app origin and carry its cookies, but the agent runs as a separate service. Configure its channel with a custom `AuthFn` that verifies Clerk credentials and returns a user principal. Do not assume Next.js middleware protects the agent service.

For outbound access, use `defineMcpClientConnection` with a non-interactive, user-scoped auth provider (`credentialOwner: "user"`). Its `getToken` resolves a short-lived MCP credential from the verified principal. Eve supports this [per-user credential pattern](https://eve.dev/docs/patterns/multi-tenant-auth); our application owns credential issuance and renewal. Keep tokens out of prompts and session metadata. External clients will use OAuth against the same MCP server.

Eve [route authentication does not enforce conversation ownership](https://eve.dev/docs/guides/auth-and-route-protection). Our integration must check ownership for conversation continuation, history streams, and control operations. An Eve conversation and a saved browser session are distinct resources; keep their authorized association explicit. Use the app's stable mock identities locally so account isolation remains testable.

## Saved data and live browser control

Only `set_region` exists today. The discovery tools and all authorization described below are proposed.

| Tool                                           | Responsibility                                                          | Open browser required? |
| ---------------------------------------------- | ----------------------------------------------------------------------- | ---------------------- |
| `get_sessions`, `get_session`                  | Call the existing Next.js session feature through an authenticated API. | No                     |
| `get_connected_sessions`, `get_active_session` | Discover the user's authorized browser connections.                     | Yes, for a live result |
| `set_region`                                   | Execute the existing action in an authorized browser tab.               | Yes                    |

Next.js retains database access and session ownership checks. MCP-to-app requests need authenticated delegation intended for the app API; do not simply forward an incoming MCP token or trust an unsigned user ID.

Browser attachments and command replies also require authorization. Next.js can check session ownership and issue a short-lived attachment credential. MCP binds that connection to the verified user and session, checks access before dispatch, and handles expiry and disconnects. A session ID alone grants no access.

## Which session is active?

Bind an Eve run to the session from which it started. Switching sessions must not silently redirect that run's commands to another browser.

For an external client without an explicit target, define active as connected with agent control enabled: return no active session when none is connected, use the sole connected session when there is one, and require an explicit selection when several are connected. Keep connection state ephemeral rather than adding a global active-session field to the user record.

Before implementation, choose credential issuance, renewal/revocation for durable runs, conversation ownership storage, and MCP-to-app delegation. Check the installed Eve version's bundled docs before coding. Start with authentication, authorized browser attachment, and session discovery before adding more tools.

[Back to app direction](README.md)
