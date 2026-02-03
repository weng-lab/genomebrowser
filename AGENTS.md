# AGENTS.md

This file provides guidance to AI coding agents working in this repository.

## Project Overview

**@weng-lab/genomebrowser-monorepo** - A React-based genome browser library for visualizing genomic data. Built as a pnpm monorepo with reusable npm packages.

**Tech Stack:** TypeScript, React 19, Vite, Zustand, Apollo Client (GraphQL), MUI, Storybook

## Monorepo Structure

```
packages/
├── core/     # @weng-lab/genomebrowser - Main browser library
└── ui/       # @weng-lab/genomebrowser-ui - UI components (MUI-based)
```

## Build/Lint/Test Commands

```bash
# Root level
pnpm build              # Build all packages
pnpm build:core         # Build core package only
pnpm lint               # Lint all packages

# Core package (packages/core)
pnpm run build          # TypeScript + Vite build
pnpm run lint           # ESLint
pnpm run format         # Prettier formatting
pnpm run storybook      # Start Storybook (port 6006)
```

### Testing

Testing is done via Storybook stories - no traditional unit test files exist.
Stories are located in `packages/core/src/stories/**/*.stories.tsx`

## Code Style Guidelines

### Formatting (Prettier)

- Print width: 120 characters
- 2-space indentation, no tabs
- Double quotes for strings and JSX
- Semicolons required
- Trailing commas: ES5 style
- Line endings: LF

### TypeScript

- **Strict mode** enabled
- Target: ES2020
- No unused locals/parameters
- Prefer explicit types over `any` (warning level)

### ESLint

- TypeScript-ESLint recommended rules
- React Hooks recommended rules
- `@typescript-eslint/no-explicit-any`: warn

## Naming Conventions

### Files

- Components: `camelCase.tsx` (e.g., `browser.tsx`, `displayTrack.tsx`)
- Stores: `camelCase.ts` (e.g., `browserStore.ts`)
- Types: `types.ts` in component directories
- Hooks: `use*.ts` (e.g., `useXTransform.ts`)
- Stories: `*.stories.tsx`

### Code

- **Components**: PascalCase (`Browser`, `DisplayTrack`)
- **Hooks**: camelCase with `use` prefix (`useBrowserStore`)
- **Store factories**: `create*Store` / `create*StoreMemo`
- **Types/Interfaces**: PascalCase (`BrowserStore`, `Track`)
- **Enums**: PascalCase values (`TrackType.BigWig`, `DisplayMode.Full`)
- **Functions**: camelCase (`fetchBigWig`)
- **Constants**: UPPER_SNAKE_CASE (`RULER_HEIGHT`)

## Import Organization

1. React imports (`import { useMemo } from "react"`)
2. External libraries (`import { create } from "zustand"`)
3. Internal stores (`from "../store/BrowserContext"`)
4. Internal components/hooks
5. Local types/helpers (`from "./types"`)

## Error Handling Patterns

### Data Fetching

- Use `Promise.allSettled()` for parallel fetches with graceful failure
- Track data state: `{ data: T | null, error: string | null }`
- Track loading with `isFetching` boolean in data store

```typescript
const results = await Promise.allSettled(
  tracks.map(async (track) => {
    const fetcher = trackFetchers[track.trackType];
    if (!fetcher) throw new Error(`No fetcher for: ${track.trackType}`);
    return await fetcher({ track, domain, ... });
  })
);
```

## Architecture Patterns

### State Management (Zustand)

- Factory functions: `createBrowserStore()`, `createTrackStore()`
- Memoized versions: `createBrowserStoreMemo()`, `createTrackStoreMemo()`
- Context-based access via `BrowserProvider`

### Key Stores

- `browserStore`: Viewport, navigation, highlights, dimensions
- `trackStore`: Track configuration, ordering, heights
- `dataStore`: Cached genomic data, loading states

### Track Types

`BigWig`, `BigBed`, `BulkBed`, `Transcript`, `Motif`, `Importance`, `LDTrack`, `MethylC`, `Manhattan`

### Display Modes

`Full`, `Dense`, `Squish`, `Pack`, `Combined`, `Split`, `Scatter`

## Special Instructions

- **Never ask to run `pnpm run dev`** - the user will test manually
- **You may run `pnpm run lint --quiet`** but try to avoid it
- **Don't hallucinate URLs for tracks** - use existing URLs or `"YOUR_URL_HERE"`
- All visualization uses SVG with coordinate transformations via custom hooks

## Key Directories

```
packages/core/src/
├── api/           # GraphQL data fetching
├── components/
│   ├── browser/   # Main browser wrapper
│   ├── tracks/    # Track renderers (one dir per type)
│   ├── modal/     # Configuration dialogs
│   └── tooltip/   # Tooltip system
├── hooks/         # Custom React hooks
├── store/         # Zustand stores
├── utils/         # Utilities (coordinates, colors, SVG)
├── stories/       # Storybook stories
└── lib.ts         # Public API entry point
```

## Library Exports

Public API defined in `packages/core/src/lib.ts` - export all public components, types, and store factories from there.
