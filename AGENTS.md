# Genomebrowser Monorepo

For package specific scripts, refer to it's package.json file. (build, dev etc.)

## Refer to Docs

ALWAYS refer to docs/${PACKAGE} for up to date ADRs and documentation about said package.

## ADRs are the source of truth

A package's ADR documents are the source of truth for high level decisions. DO NOT stray from them. If you find it necessary, ask first and explain why before doing.

## Never run `pnpm run dev`

user will run the dev server manually.

## Don't hallucinate track URLs

use `"YOUR_URL_HERE"` or existing URLs when making track configs.

## Architecture guidelines

- Build deep modules.
- Import/use each module only at its natural seam.
- Keep the number of integration points low.

## KISS (keep it simple stupid)

Don't overengineer anything and don't add extra features or logic to a feature unless explicitly told to. If I ask for a feature about fetching data, don't worry about edge cases and canceling preflight fetches etc. Just do the minimum and cleanly to get the feature working, then we work on those edge cases later.
