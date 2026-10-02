# Identity and security

Part of the [architecture](README.md). Decision: [0009](decisions/0009-device-flow-for-local-sign-in.md).

## Purpose

Who users are, how they and their agents prove it, what each can access, and how we protect the local and cloud servers. Sized for under 10k users: avoid custom auth code, and close the gaps specific to agents.

## Cloud sign-in

- **No passwords.** Users sign in with:
  - Google or GitHub
  - ORCID, which most researchers have and which gives a verified researcher identity
  - a one-time code or magic link by email, for everyone else
- **University single sign-on only when asked.** CILogon offers sign-in through most US universities (via InCommon) over standard OIDC.
- **Linking accounts.** Link two sign-in methods automatically only when both report the same verified email. Otherwise anyone who can claim an email at one provider could take over the account.
- **No 2FA of our own.** Users protect their Google, GitHub or ORCID account with that provider's 2FA.
- **Library.** Better Auth inside the API server, on our Postgres. Through plugins it covers social sign-in, email codes, the device flow and acting as an OAuth server for MCP. Check the current plugin list before committing. Third-party services such as Clerk or WorkOS also work, but they charge per active user and split identity across two systems.

## Local sign-in (device flow)

This is a later feature, planned for roadmap milestone 8. The initial local app works without an account and only opens local sessions. Later, signing in with a cloud account adds the user's cloud sessions (see [sessions-and-data.md](sessions-and-data.md#cloud-sessions-in-the-cli)).

Users sign in from a "Sign in" button in the local workspace, or with `gb login`. Both run the **OAuth 2.0 Device Authorization Grant** ([RFC 8628](https://www.rfc-editor.org/rfc/rfc8628)) in the local server, the same flow `gh auth login` uses:

1. The local server requests a code: `POST /oauth/device/code` with the CLI's client id. It gets back a `device_code`, a short `user_code` such as `WDJB-MJHT`, a `verification_uri`, an `expires_in` and a polling `interval`.
2. The local app shows the user code and the verification URL, and opens the URL in the browser. In the terminal, `gb login` prints them.
3. The user signs in on the cloud site if needed, checks that the code matches, and approves the device.
4. Meanwhile the local server polls `POST /oauth/token` with `grant_type=urn:ietf:params:oauth:grant-type:device_code` every `interval` seconds. It keeps waiting on `authorization_pending`, slows down on `slow_down`, and stops on `access_denied` or `expired_token`.
5. After approval it receives an access token and a refresh token, stores them in `~/.gb/` with owner-only file permissions, and refreshes the access token as needed.

Cloud-side rules:

- The approval page names what is asking for access (for example "gb CLI on lab-workstation") so users can spot a code someone else sent them.
- Codes expire after about 10 minutes, and the token endpoint rate-limits polling.
- Refresh tokens rotate on each use.
- The account page lists connected devices, each revocable.
- External MCP clients such as Claude Desktop use MCP's own OAuth flow (authorization code with PKCE). The device flow is only for `gb`.

## Sessions and tokens

- **Browser login.** An `httpOnly`, `Secure`, `SameSite=Lax` cookie pointing to a session row in the database, so it can be revoked at once. No long-lived JWTs in the browser.
- **JWTs only between services,** for example Eve calling the API server. They last a few minutes and carry an audience claim, so a token minted for one service can't be replayed against another. Eve gets one per user per turn, so a compromised Eve deployment can't act as everyone.
- **CSRF and CORS.** For every request that changes something, check the `Origin` header against an exact allowlist, in addition to `SameSite`. Never use a wildcard CORS origin with cookies.
- **One place to revoke access.** The account page lists browser sessions, connected `gb` devices and connected MCP clients, each revocable.

## Access control

- **Every browser session has an owner.** One function, `canAccess(user, session, "read" | "control")`, decides access, and every route and MCP tool calls it. No route checks ownership on its own.
- **Sharing comes later without a redesign:** per-session roles (viewer, editor), unguessable read-only share links, then lab or team groups.
- **MCP tokens carry scope:** the user, the sessions they cover, and whether the client may only read or also control. The consent screen shows exactly that.
- **Agent control is per session.** Tools only reach sessions where the user turned MCP on. Each session shows an "agent control on" indicator, a log of agent commands and an off switch.
- **Agent permissions** limit what each agent may do. See [agents-and-tools.md](agents-and-tools.md#agent-permissions).

## Abuse limits

- Rate limits per user and per token on `/mcp` and the sign-in endpoints.
- A cap on open SSE streams per user (for example 20).
- A daily Eve usage quota per user. Model cost is the easiest thing for one account to abuse.
- Bot protection (for example Cloudflare Turnstile) on sign-up, only if fake accounts appear.

## Local server security

- **Listen on `127.0.0.1` only.** That keeps out other machines.
- **Require the launch token.** On a shared lab server, other users on the same machine can reach `127.0.0.1` too. The random token the CLI prints at launch keeps them out. The first visit with `?token=` turns it into a login cookie named with the instance id, because cookies don't separate ports. On shared machines, `--socket` restricts access further. See [remote-access.md](remote-access.md).
- **Check `Origin` and `Host`.** Reject unexpected origins (the MCP spec requires this for local servers), and reject any `Host` header other than `localhost` or `127.0.0.1` (any port, for SSH forwarding) to block DNS rebinding. Without these checks, a website the user visits could send commands to the local server.
- **Token file.** When cloud sign-in is added, its token will live in `~/.gb/` with owner-only permissions. The OS keychain would need a native module, so it waits.
- **ACP agents run with the user's permissions.** Keep Approve and Deny on, and limit each agent to its `--cwd` folder.
- **Local files.** Only registered files inside allowed folders are served, never arbitrary paths. See [local-files.md](local-files.md#security).
- **Never listen on the network by default.** `--host 0.0.0.0` needs an explicit flag and prints a warning.

## Data and infrastructure

- **Session state is private.** Private track URLs often contain access tokens. Don't log full session state, and warn when sharing a session that includes signed URLs.
- **Account export and deletion.** We will have EU users. Deleting a user deletes their sessions, grants and devices.
- **GCP:**
  - secrets in Secret Manager
  - a least-privilege service account for Cloud Run
  - Cloud SQL over private IP or the Cloud SQL connector, never a public IP
  - automated backups with point-in-time recovery

## Not needed at this scale

A separate identity service, SAML enterprise single sign-on, our own 2FA, multiple regions or per-tenant databases. One API server with one auth library and one access-check function covers 10k users and well beyond.

## Open questions

Each question has a default. Build with the default unless it changes.

### SEC-1. Does Better Auth cover everything we need?

It needs to cover MCP OAuth (acting as an authorization server), the device grant, ORCID sign-in and account linking.

- **Better Auth (default).** Check all four at the start of the cloud API server milestone.
- Clerk, if one of the four is missing. WorkOS is the second fallback.

### SEC-2. Which email provider sends sign-in codes?

- **Resend (default).** Simple API, and its free tier covers sign-in codes at this scale.
- Postmark or SendGrid.
