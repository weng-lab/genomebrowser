# 0009. Device flow for local sign-in

Decided 2026-10-01.

## Why this came up

Local users should be able to sign in with their cloud account to reach cloud sessions. The local server runs on a changing port, sometimes on a remote machine over SSH, and can't hold a client secret.

## What we chose

The local app signs in with the OAuth 2.0 Device Authorization Grant (RFC 8628). External MCP clients keep using MCP's own OAuth flow (authorization code with PKCE).

## Other options

- **Authorization code with a redirect to localhost.** Familiar, but needs a registered redirect URL for a port that changes, and fails when the browser runs on a different machine from `gb`.
- **Pasting an API key from the website.** Simple, but long-lived keys are easy to leak and hard to scope.

## What this means

- Works over SSH and on lab servers, and users can approve from any browser.
- The cloud side needs a device approval page, code expiry, polling rate limits and a connected-devices list.
- Users can be tricked into approving someone else's code, so the approval page must say what is asking.
