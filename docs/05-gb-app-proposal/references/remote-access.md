# Remote access

Part of the [architecture](README.md). Status: **Draft**, still being worked out. Decision: [0011](decisions/0011-ssh-forwarding-for-remote-access.md) (proposed).

## Purpose

Researchers often keep their data on a lab workstation or cluster, not their laptop. They should be able to run `gb` there and open the browser on their laptop:

```
laptop                              remote server
browser ── localhost:8080 ══SSH══►  gb on 127.0.0.1:<port>
                                     ├── reads data files on the server
                                     └── runs Codex on the server
```

Everything except the page itself stays on the remote server: the data files, the database, ACP agents and the MCP endpoint.

## Design: SSH port forwarding

`gb` keeps listening on `127.0.0.1` on the remote machine. The user's existing SSH connection carries the traffic. No firewall changes, no public port, and SSH provides encryption and login.

```bash
# on the laptop
ssh -L 8080:127.0.0.1:4100 me@workstation

# on the workstation, in that SSH session
gb run --port 4100
```

When `gb` detects an SSH session (the `SSH_CONNECTION` environment variable is set), it prints the exact command and link:

```
gb is running on workstation:4100

From your laptop, forward the port:
  ssh -L 8080:127.0.0.1:4100 me@workstation
Then open:
  http://localhost:8080/?token=7f3a...
```

### Editors that forward ports

VS Code Remote-SSH, Cursor and similar editors forward ports automatically. If `gb` runs in their terminal, they detect the URL and offer to open it, so no manual `ssh -L` is needed.

### Clusters

On clusters where jobs run on compute nodes behind a login node, use SSH's jump host:

```bash
ssh -J me@login.cluster -L 8080:127.0.0.1:4100 me@node042
```

Many clusters also run Open OnDemand, which may be a better fit later. See the open questions.

### Shared machines and Unix sockets

On a shared server, other users can reach `127.0.0.1:<port>` too. The launch token keeps them out (see [identity-and-security.md](identity-and-security.md#local-server-security)).

For stronger isolation, `gb run --socket` listens on a Unix socket in `~/.gb/` with owner-only permissions instead of a TCP port. Other users can't connect at all, and ports can't collide. OpenSSH can forward a laptop port to a remote socket:

```bash
ssh -L 8080:/home/me/.gb/gb.sock me@workstation
```

### Keeping `gb` running

An SSH disconnect would stop `gb` if it runs in the foreground. Options:

- Run it in `tmux` or `screen` (works today).
- `gb run --detach` starts it in the background, and `gb status` prints the URL and token again.
- An idle timeout (for example, stop after 12 hours with no open tab) frees resources on shared machines.

## Connecting agents

Agents can reach a remote `gb` from three places. All of them use the same `/mcp` on the server, so permissions and the command log treat them the same way.

| Where the agent runs | How it connects |
| --- | --- |
| On the server (Codex or Claude Code CLI in the same SSH session) | `http://127.0.0.1:4100/mcp` with the launch token, or the `gb mcp` command below |
| In the chat panel (ACP) | `gb` starts the agent on the server. Nothing to configure. |
| On the laptop (Codex, Claude Code, Claude Desktop, Cursor) | Through the SSH tunnel at `http://localhost:8080/mcp` with the launch token, or `ssh me@workstation gb mcp` as a command |

### `gb mcp`: a command-based connection

Many MCP clients can launch a command and talk to it over stdin and stdout. `gb mcp` is a small bridge: it finds the running `gb` on that machine, reads its token from `~/.gb/`, and forwards MCP messages to it.

- On the server, an agent configured with the command `gb mcp` needs no URL or token.
- On the laptop, an agent configured with the command `ssh me@workstation gb mcp` reaches the remote `gb` through SSH's own login. It needs no port forwarding and no token. It does need SSH keys, because the agent can't answer a password prompt.

`gb mcp config <client>` could print the setup snippet for Codex, Claude Code, Claude Desktop and Cursor.

### Several agents on one session

A user might drive one session from Codex on the laptop and from the chat panel at the same time. Commands reach the tab one at a time in arrival order, and the command log shows which agent sent each one. Whether to go further (locks, or one agent at a time) is question [AG-3](agents-and-tools.md#ag-3-what-happens-when-several-agents-drive-one-session-at-once).

## What this means for the rest of the design

- **The launch token becomes a cookie.** The first visit to `/?token=...` sets a login cookie and removes the token from the address bar. The token isn't sent again.
- **Cookies don't separate ports.** Two `gb` instances seen as `localhost:8080` and `localhost:8081` share the browser's cookies for `localhost`. Each instance names its cookie with its own id (for example `gb_session_<instance>`) so they don't overwrite each other.
- **The `Host` and `Origin` checks** accept `localhost` and `127.0.0.1` on any port, because the forwarded port on the laptop is the user's choice.
- **URLs are built from the browser's origin.** Local file URLs and API calls use `location.origin`, never the server's own address. See [local-files.md](local-files.md#saving-sessions-that-use-local-files).
- **MCP clients on either side work.** Claude Desktop on the laptop uses `http://localhost:8080/mcp`. Codex on the server uses `http://127.0.0.1:4100/mcp`. Both send the launch token.
- **Later cloud sign-in will work over SSH.** The device flow was chosen partly for this: the user approves on any browser (see [decision 0009](decisions/0009-device-flow-for-local-sign-in.md)).

## Not the default

- **Listening on all interfaces.** `gb run --host 0.0.0.0` exposes the server to the network. It stays possible behind an explicit flag, with a warning, the token still required, and a recommendation to put TLS in front. Never the default.
- **Tunnel services** such as Tailscale, Cloudflare Tunnel or ngrok. Users can point them at `gb` themselves. Tailscale fits a permanent lab workstation well. We document these but don't build them in.

## Later: a cloud relay

`gb` could connect outward to the cloud site after sign-in, and the cloud site would relay the page to the user's laptop, like VS Code tunnels. It would need no SSH and no open ports. It also needs relay infrastructure, signed-in users and careful security review, so it needs its own design if SSH proves too hard for users.

## Open questions

Each question has a default. Build with the default unless it changes.

### RA-1. Default port: fixed or random?

- **Fixed with a fallback (default).** For example 4100, or the next free port if taken. The `ssh -L` command and editor forwarding stay the same between runs.
- **Random.** No collisions on shared machines, but the SSH command changes every time.

### RA-2. Ship `gb run --detach` in the first release?

- **`tmux` or `screen` first (default).** Works today and costs nothing to build.
- **Detach from the start.** Friendlier, but needs process management, `gb status` and `gb stop`.

### RA-3. Support Open OnDemand on clusters?

Many university clusters run Open OnDemand, which can launch web apps on compute nodes without SSH tunnels.

- **Find out first (default).** Ask users whether their clusters run it.
- **Build an Open OnDemand app.** Better cluster experience, more to maintain.

### RA-4. Idle timeout on shared machines

- **Off by default, available as a flag (default).**
- **On by default.** Frees resources, but surprises users whose `gb` stops overnight.
- Don't try to detect shared machines; document the flag (default).

### RA-5. How do HTTP MCP clients send the launch token?

- **`Authorization: Bearer <token>` header (default).** Standard, and kept out of logs and browser history.
- **Token in the URL** (`/mcp?token=...`). Works with any client, but leaks into logs and shell history.
- **A small OAuth flow on the local server,** where the user approves the client in the open workspace. Matches the MCP spec and works with clients that only support OAuth, but is more to build.
- Check which target clients can set custom headers during the CLI milestone. Clients that can't use `gb mcp` (default).

### RA-6. Ship the `gb mcp` command bridge in the first release?

- **Yes (default).** It is small, works with every client that can launch a command, and over SSH it avoids tunnels and tokens.
- **Later.** HTTP with the token covers the same cases with more setup.
