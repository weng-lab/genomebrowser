# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- `npm run dev` - Start development server with HMR (NEVER run this - user will test manually)
- `npm run build` - Build the library (`tsc -b && vite build`)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview the built library
- `npm run storybook` - Run Storybook development server on port 6006
- `npm run build-storybook` - Build Storybook for deployment

**IMPORTANT**: Never attempt to run `npm run dev` - the user will handle all manual testing of the website.

## Data Fetching Architecture

The project uses a **clean, trigger-based data fetching system**:

**DataStore Controls Fetching**: The `dataStore` contains:
- `shouldFetch: boolean` flag to control when fetching occurs
- `triggerFetch()` action to initiate data fetching
- `setShouldFetch(false)` to reset after completion

**CleanDataFetcher Component** (`src/api/cleanDataFetcher.tsx`):
- Replaces the complex `LegacyDataFetcher` with clean, maintainable code
- Single useEffect with all fetch logic contained within (no dependency cycles)
- Uses existing API request builders and GraphQL queries
- Maintains existing BigWig/BigBed batching efficiency
- Triggers on: track count changes, domain changes, or `shouldFetch` flag

**Fetch Flow**:
1. Track count increases OR domain changes OR `triggerFetch()` called
2. `shouldFetch` flag set to true
3. Single useEffect executes with loading guards to prevent concurrent fetching
4. All track types fetched concurrently using existing batching
5. Results populate `dataStore` via separate results processing useEffect
6. `shouldFetch` flag reset to false

## Testing

This project uses Vitest with Storybook integration and Playwright for browser testing:
- Tests run in browser environment with Playwright/Chromium
- Storybook stories are used as test files through `@storybook/addon-vitest`
- Test configuration is in `vitest.workspace.ts`
- Manual testing is done through the development server (`npm run dev`)
- Test page located at `src/main.tsx` with example track configurations

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
- **bulkBed**: Multiple stacked BigBed instances with configurable gaps and dataset naming
- **transcript**: Gene/transcript visualization (pack/squish modes)
- **motif**: Motif data (dense/squish modes)
- **importance**: Importance scores
- **ruler**: Genomic coordinate ruler

Each track type has its own component in `src/components/tracks/` with specific configuration types exported from `types.ts` files.

#### BulkBed Track Implementation

The BulkBed track type displays multiple BigBed datasets stacked vertically within a single track wrapper:

**Key Features**:
- Efficient batching of multiple BigBed URLs through existing GraphQL BigRequest system
- Configurable gap spacing between stacked instances
- Dataset naming system for enhanced tooltips showing both dataset name and rect name
- Modal form for adjusting gap settings and viewing dataset list

**Architecture**:
- `src/components/tracks/bulkbed/types.ts` - Type definitions (BulkBedConfig, BulkBedDataset, BulkBedRect)
- `src/components/tracks/bulkbed/bulkbed.tsx` - Main component with enhanced handlers for dataset-aware tooltips
- `src/api/requestBuilder.ts` - buildBulkBedRequests function with legacy URL support
- `src/api/resultsProcessor.ts` - processBulkBedResults enriches data with dataset names
- `src/components/modal/bulkbed/` - Modal form components (gap.tsx, datasetList.tsx)

**Data Flow**:
1. BulkBed tracks configured with datasets array containing name and URL
2. Request builder creates batched GraphQL requests for all URLs
3. Results processor enriches returned data with dataset names
4. Component renders stacked DenseBigBed instances with configurable gaps
5. Enhanced handlers ensure tooltips receive BulkBedRect objects with datasetName

### Data Flow

1. Tracks are configured through the `trackStore`
2. The browser spawns appropriate components based on track configuration
3. Data is fetched and stored in the `dataStore` using track IDs as keys
4. Components access both configuration and data through their respective stores
5. Browser interactions (panning, zooming) update the `browserStore` which triggers track updates

### Key Directories

- `src/components/tracks/` - Track-specific components and logic
  - `src/components/tracks/bulkbed/` - BulkBed track implementation
- `src/components/modal/` - Modal form components for track configuration
  - `src/components/modal/shared/` - Reusable form components (Form, Value, Height)
  - `src/components/modal/bulkbed/` - BulkBed-specific modal components
- `src/store/` - Zustand stores for state management
- `src/api/` - Data fetching logic for different track types
  - `cleanDataFetcher.tsx` - Clean, trigger-based data fetching system
  - `requestBuilder.ts` - GraphQL request builders including BulkBed batching
  - `resultsProcessor.ts` - Data processing including BulkBed dataset enrichment
- `src/hooks/` - Custom React hooks for browser interactions
- `src/utils/` - Utility functions (coordinates, colors, SVG helpers)
- `src/stories/` - Storybook stories for component development

### Library Build

The project builds as an ES module library with:
- Entry point: `src/lib.ts`
- External dependencies: React, React DOM
- Type definitions generated via `vite-plugin-dts`
- Excludes stories and main.tsx from build

## Modal System

The browser includes a comprehensive modal system for track configuration:

**Core Components**:
- `src/components/modal/modal.tsx` - Main modal with draggable functionality and track-specific forms
- `src/components/modal/shared/` - Reusable form components:
  - `Form` - Standardized form wrapper with title and styling
  - `Value` - Number input with validation, debouncing, and error handling
  - `Height` - Height adjustment component (20-300px range)
  - `Display` - Display mode selection component

**Track-Specific Forms**:
- BigWig: Range adjustment
- Transcript: Version selection and gene name filtering
- BulkBed: Gap adjustment (0-20 range) and dataset list display

**Modal Features**:
- Right-click context menu to open track configuration
- Draggable modal with handle
- Escape key to close
- Real-time validation with custom error messages
- Debounced input updates (500ms delay, 2s for empty values)

## UI Interaction System

**Context Menu**: Right-click on tracks opens context menu with "Configure" option
**Tooltips**: SVG-based tooltips with track-specific information
**Highlights**: Temporary visual highlights for genomic regions
**Draggable Modals**: Configuration forms can be repositioned by dragging the header

## Development Guidelines

- Always use existing patterns and components when adding new features
- Follow TypeScript strict typing with proper interfaces
- Use Zustand stores for state management, avoid prop drilling
- SVG-based rendering for all genome browser visualizations
- Maintain backward compatibility when adding new track features
- Modal forms should use shared components (Form, Value) for consistency