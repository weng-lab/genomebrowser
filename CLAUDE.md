# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **track-logic**, a React-based genome browser library for visualizing genomic data. It's built as a reusable npm package that provides interactive genomic visualization components with support for multiple track types (BigWig, BigBed, Transcript, etc.).

## Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build library for production (outputs to dist/)
npm run build

# Run ESLint for code quality checks
npm run lint

# Start Storybook for component development
npm run storybook

# Build Storybook for deployment
npm run build-storybook

# Preview built library
npm run preview
```

## Architecture Overview

### State Management
- **Zustand stores**: Multiple specialized stores instead of single global state
- **Store factories**: `createBrowserStore()` and `createTrackStore()` for creating instances
- **React Context**: `BrowserContext.tsx` provides store access to components
- **Key stores**:
  - `browserStore.ts`: Viewport, navigation, highlights, canvas dimensions
  - `trackStore.ts`: Track configuration, ordering, heights, layout
  - `dataStore.ts`: Cached genomic data and loading states
  - UI stores: `modalStore.ts`, `tooltipStore.ts`, `contextMenuStore.ts`

### Component Architecture
```
Browser (main entry point)
├── DataFetcher (Apollo GraphQL orchestration)
├── SVGWrapper (SVG canvas setup)
│   ├── SelectRegion (region selection)
│   ├── Ruler (coordinate display)
│   ├── DisplayTrack[] (dynamic track rendering)
│   ├── Highlights (genomic region highlights)
│   └── Tooltip (interactive tooltips)
├── ContextMenu (right-click interactions)
└── Modal (configuration dialogs)
```

### Track System
The library supports multiple genomic data visualization types:
- **BigWig**: Continuous signal data (Full/Dense modes)
- **BigBed**: Discrete genomic regions (Dense/Squish modes) 
- **BulkBed**: Multiple BigBed datasets in one track
- **Transcript**: Gene annotations (Pack/Squish modes)
- **Motif**: DNA sequence motifs
- **Importance**: Nucleotide-level importance scores
- **LDTrack**: Linkage disequilibrium data

Each track type has its own component directory under `src/components/tracks/[tracktype]/`.

### Data Fetching
- **Apollo Client**: GraphQL-based data fetching in `src/api/`
- **DataFetcher.tsx**: Main orchestration component that manages all track data requests
- **Query builders**: Modular query construction in `src/api/requestBuilder.ts`
- **Caching**: Zustand dataStore manages cached genomic data with loading states

### Key Directories
- `src/components/browser/`: Main browser wrapper components
- `src/components/tracks/`: Track-specific rendering components
- `src/components/modal/`: Configuration modal dialogs 
- `src/components/tooltip/`: Interactive tooltip system
- `src/store/`: Zustand state management stores
- `src/hooks/`: Custom React hooks for browser interactions
- `src/utils/`: Utility functions for coordinates, colors, SVG manipulation
- `src/api/`: GraphQL data fetching infrastructure

### Library Entry Points
- **Public API**: `src/lib.ts` exports all public components, types, and store factories
- **Development**: `src/main.tsx` provides demo application for testing
- **Build output**: ES modules in `dist/` directory with TypeScript declarations

### Browser Context Pattern
Components access stores through React Context instead of direct imports:
```tsx
const browserStore = useBrowserStore();
const trackStore = useTrackStore();
```

This allows multiple browser instances with isolated state in the same application.

### SVG-Based Rendering
All visualization uses SVG for crisp, scalable graphics. Track components render directly to SVG elements with coordinate transformations handled by custom hooks (`useXTransform.ts`, `useBrowserScale.ts`).

### Testing and Development
- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing  
- **Storybook**: Component development and documentation
- **TypeScript**: Strict type checking with separate build configs

### Special Instructions
- Never ask to run `npm run dev`. I will test the library manually. You may run `npm run lint` but try to avoid it if you can.