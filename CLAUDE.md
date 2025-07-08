# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- `npm run dev` - Start development server with HMR
- `npm run build` - Build the library (`tsc -b && vite build`)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview the built library
- `npm run storybook` - Run Storybook development server on port 6006
- `npm run build-storybook` - Build Storybook for deployment

## Testing

This project uses Vitest with Storybook integration and Playwright for browser testing:
- Tests run in browser environment with Playwright/Chromium
- Storybook stories are used as test files through `@storybook/addon-vitest`
- Test configuration is in `vitest.workspace.ts`

## Project Architecture

This is a React genome browser library built with TypeScript, Vite, and Zustand for state management. The library exports track components for visualizing genomic data.

### Core Architecture

**Main Entry Point**: `src/lib.ts` - exports all public components, types, and stores

**Browser Component**: The main `Browser` component (`src/components/browser/browser.tsx`) orchestrates the entire genome browser, taking tracks and initial state as props.

**State Management**: Uses Zustand with multiple specialized stores:
- **browserStore**: Browser configuration (width, genomic region, internal state)
- **trackStore**: Track configurations (display mode, track type, colors, props)
- **dataStore**: Track data indexed by track ID (avoids coupling data with track config)
- **contextMenuStore**: Context menu state (position, track ID)
- **modalStore**: Modal state (position, track ID)
- **themeStore**: Theme configuration

### Track System

The browser supports multiple track types:
- **bigWig**: Signal data visualization (dense/full modes)
- **bigBed**: Regions of interest (dense/squish modes)
- **transcript**: Gene/transcript visualization (pack/squish modes)
- **motif**: Motif data (dense/squish modes)
- **importance**: Importance scores
- **ruler**: Genomic coordinate ruler

Each track type has its own component in `src/components/tracks/` with specific configuration types exported from `types.ts` files.

### Data Flow

1. Tracks are configured through the `trackStore`
2. The browser spawns appropriate components based on track configuration
3. Data is fetched and stored in the `dataStore` using track IDs as keys
4. Components access both configuration and data through their respective stores
5. Browser interactions (panning, zooming) update the `browserStore` which triggers track updates

### Key Directories

- `src/components/tracks/` - Track-specific components and logic
- `src/store/` - Zustand stores for state management
- `src/api/` - Data fetching logic for different track types
- `src/hooks/` - Custom React hooks for browser interactions
- `src/utils/` - Utility functions (coordinates, colors, SVG helpers)
- `src/stories/` - Storybook stories for component development

### Library Build

The project builds as an ES module library with:
- Entry point: `src/lib.ts`
- External dependencies: React, React DOM
- Type definitions generated via `vite-plugin-dts`
- Excludes stories and main.tsx from build