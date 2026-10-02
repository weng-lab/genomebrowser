# 0008. A shared workspace package with a Vite shell for the CLI

Decided 2026-10-01.

## Why this came up

The cloud site uses Next.js for routing and site UI. The CLI only needs the workspace and should stay small.

## What we chose

The workspace is a React package with no Next.js imports. The cloud site imports it into Next.js pages. The CLI serves it from a small Vite build.

## Other options

- **Ship the Next.js app in the CLI.** One shell, but a Next.js production server in every CLI install, run next to the API server.
- **Two separate frontends.** Duplicate work, and the two would drift.

## What this means

- The workspace is built and tested once.
- The workspace can't use Next.js features. Navigation goes through callbacks.
- Both shells must share Tailwind config and CSS variables.
