---
name: genomebrowser-docs
description: Use when creating or revising documentation, including user guides, maintainer docs, package docs, examples, recipes, API-adjacent explanations, or docs affected by behavior changes. Exclude ADRs, commit messages, and code comments unless the user explicitly asks for them. Use only for documentation work in docs/ directories.
---

# Genome Browser Docs

Write Genome Browser documentation that is useful from the reader's point of view. Prefer mental models, workflows, examples, defaults, and sharp edges over restating TypeScript signatures.

## Collaboration Mode

Treat documentation work as collaborative drafting by default.

- If the user asks to design, discuss, review, or work through docs, do not edit files yet.
- Start by proposing the audience, structure, and content approach.
- Ask at most 1-2 focused questions when a decision affects the shape of the docs.
- Draft incrementally: outline first, then one page or section at a time.
- Prefer short working drafts over large polished documents unless the user asks for a full pass.
- Only create or update files after an explicit instruction such as "write this," "update the docs," "scaffold the files," or "apply that."
- After editing, summarize what changed and ask what to refine next.
- Treat this simlar to pair programming, and when the user makes changes themselves, read the file again.

## Audience First

Decide the audience before writing:

- User-facing package docs explain how to use the shipped package from its public surface.
- Maintainer docs explain internal decisions, ownership, tradeoffs, and ADR context.

Do not mix the two audiences casually. If a user page needs background from maintainer docs, duplicate the small user-relevant explanation instead of sending package readers into repo internals.

## Context Check

Before changing docs, do a proportional context check:

- Read repo instructions and style guidance.
- Read existing docs near the target page.
- For behavior/API docs, verify the behavior against the relevant source of truth before describing it as settled.
- For package docs, inspect the package's public entry points or current examples so imports and examples match what users can actually use.

Use implementation files to verify behavior, not as the organizing structure for the docs.

## Package Docs Contract

Package docs must work for someone reading them from an installed package:

- Keep package docs self-contained.
- Do not link upward into repository-only docs from package docs.
- Use public package exports in examples unless explicitly documenting an internal maintainer workflow.
- Use `YOUR_URL_HERE` for example track URLs unless reusing an existing URL already present in the repo.

## User Page Shape

For component, feature, track, and recipe pages, prefer this shape unless the page clearly needs something smaller:

1. Start with the user goal and when to use the feature.
2. Explain the mental model: ownership, lifecycle, data flow, or responsibility boundaries.
3. Show one minimal realistic example.
4. Explain important behavior that is not obvious from names or types.
5. Include common tasks, defaults, and sharp edges.
6. Mention related exports only when they clarify usage; do not generate API tables from types.

Keep the happy path approachable. Move advanced material into recipes, advanced sections, or separate pages instead of making the first page intimidating.

## Organization Guidance

Organize docs by reader-facing concepts and workflows, not source-file layout or current implementation boundaries.

Prefer small entry points that route readers to focused pages for getting started, core concepts, major features, recipes, and troubleshooting. Do not create a page only because a file, type, or function exists.

## Completion Check

Before finishing a docs change:

- Verify package docs are self-contained and install-safe.
- Verify examples import only public package exports unless explicitly documenting internals.
- Verify examples avoid hallucinated track URLs.
- Verify the docs explain at least one behavior, workflow, default, or sharp edge that is not obvious from TypeScript types.
- If behavior changed, name any docs that may need follow-up updates by exact path.
