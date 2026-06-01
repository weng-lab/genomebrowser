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
