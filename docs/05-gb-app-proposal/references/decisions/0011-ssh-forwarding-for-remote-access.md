# 0011. SSH port forwarding for remote access

Proposed 2026-10-01. Not final yet.

## Why this came up

Researchers keep data on lab workstations and clusters, and want to view it in a browser on their laptop. The local server must not be exposed to the network by default.

## What we chose

`gb` keeps listening on `127.0.0.1` (or a Unix socket with `--socket`). Users reach it through SSH port forwarding, and `gb` prints the exact `ssh -L` command and link when it runs inside an SSH session. Editors with automatic port forwarding (VS Code Remote-SSH and similar) work without extra steps.

## Other options

- **Listen on `0.0.0.0` by default.** Easy, but exposes the server to the whole network, often without TLS. Kept only behind an explicit flag with a warning.
- **A built-in tunnel service** (Cloudflare Tunnel, ngrok). Adds a third-party dependency and a public URL. Users can still run one themselves.
- **A cloud relay through our website.** Nothing to set up for users, but needs relay infrastructure and careful security work. Possible later.

## What this means

- Relies on SSH, which our users already use to reach these machines.
- The launch token becomes a login cookie on first visit, and cookie names include an instance id because cookies don't separate ports.
- `Host` and `Origin` checks accept `localhost` on any port.
- URLs are always built from the browser's origin, never the server's address.
