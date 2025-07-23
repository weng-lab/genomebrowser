# Genome Browser

A powerful, interactive React-based genome browser for visualizing genomic data. Built with TypeScript, Vite, and modern web technologies.

## Features

- 🧬 **Multiple Track Types**: BigWig, BigBed, BulkBed, Transcript, Motif, and Importance tracks
- 🎛️ **Interactive Controls**: Smooth pan and zoom with crisp SVG graphics, drag-and-drop track reordering
- 🔧 **Customizable**: Configurable colors, heights, display modes, and styling
- 📊 **Efficient Data Loading**: GraphQL-based API with intelligent batching
- 🖱️ **Rich Interactions**: Click and hover on genomic features with tooltips and real-time updates
- 📱 **Responsive**: Works across different screen sizes with consistently sharp graphics
- ⚡ **Performance**: Optimized rendering with React and Zustand state management
- 🎨 **SVG-Based**: Uses Scalable Vector Graphics (SVG) for crisp, resolution-independent rendering that scales beautifully
- 🔍 **Publication Ready**: Export high-quality SVG images suitable for papers and presentations

## Installation

```bash
npm install track-logic
```

```bash
yarn add track-logic
```

```bash
pnpm add track-logic
```

## Quick Start

```tsx
import React from "react";
import { Browser, Track, InitialBrowserState, createBrowserStore, createTrackStore, BrowserStoreInstance } from "track-logic";

function GenomeBrowserExample() {
  // Define your tracks
  const initialTracks: Track[] = [...];

  // Configure initial browser state
  const initialState: InitialBrowserState = {
    domain: {
      chromosome: "chr12",
      start: 53360037,
      end: 53400206,
    },
    marginWidth: 150,
    trackWidth: 1350,
    multiplier: 3, // a multiplier to fetch more data for smooth panning
  };

  // Create stores to hold browser data
  const browserStore = createBrowserStore(initialState)
  const trackStore = createTrackStore(initialTracks)

  return (
    <div style={{ width: "90%", margin: "0 auto" }}>
      <h1>My Genome Browser</h1>
      <DomainDisplay browserStore={browserStore} />
      <Browser browserStore={browserStore} trackStore={trackStore} />
    </div>
  );
}

// Use the stores to access information
function DomainDisplay({browserStore} : {browserStore: BrowserStoreInstance}) {
  // Zustand-like selectors for getting fields and functions
  const domain = browserStore((state) => state.domain)
  return (
    <h1>{domain.chromosome}:{domain.start}-{domain.end}</h1>
  )
}

```

## Browser Configuration

### State Example

```tsx
const initialState: InitialBrowserState = {
  domain: {
    chromosome: "chr1",
    start: 1000000,
    end: 2000000,
  },
  marginWidth: 150, // Width of the track margins
  trackWidth: 1350, // Width of the viewable track area
  multiplier: 3, // Data fetching multiplier for smooth panning
  highlights: [
    // Optional: initial highlights
    {
      id: "highlight1",
      color: "#ffaabb",
      domain: { chromosome: "chr1", start: 1500000, end: 1600000 },
    },
  ],
};
```

## Track Examples

### BigWig Tracks

Display continuous signal data (e.g., ChIP-seq, RNA-seq signals).

```tsx
{
  id: "signal",
  title: "Signal Data",
  trackType: TrackType.BigWig,
  displayMode: DisplayMode.Full, // Multiple display modes supported
  height: 100,
  color: "#3498db",
  url: "https://example.com/signal.bw",
}
```

### BigBed Tracks

Display discrete genomic regions (e.g., peaks, annotations).

```tsx
{
  id: "peaks",
  title: "Peak Calls",
  trackType: TrackType.BigBed,
  displayMode: DisplayMode.Dense,
  height: 20,
  color: "#e74c3c",
  url: "https://example.com/peaks.bigBed",
  onClick: (rect) => console.log("Clicked:", rect), // Mouse interactivitiy
  onHover: (rect) => console.log("Hovered:", rect),
  tooltip: (rect) => <text>{rect.name}</text>, // Custom svg tooltips
}
```

### BulkBed Tracks

Display multiple BigBed datasets in a single track.

```tsx
{
  id: "bulk-data",
  title: "Multiple Datasets",
  trackType: TrackType.BulkBed,
  displayMode: DisplayMode.Full,
  height: 40,
  gap: 2, // Gap between datasets
  color: "#9b59b6",
  datasets: [
    { name: "Dataset 1", url: "https://example.com/data1.bigBed" },
    { name: "Dataset 2", url: "https://example.com/data2.bigBed" },
  ],
}
```

### Transcript Tracks

Display gene annotations and transcripts.

```tsx
{
  id: "genes",
  title: "Gene Annotations",
  trackType: TrackType.Transcript,
  displayMode: DisplayMode.Squish,
  height: 50,
  color: "#2ecc71",
  assembly: "GRCh38", // "mm10" also supported
  version: 47, // GENCODE version
}
```

Explore our comprehensive [Storybook]() documentation for detailed information about additional track types and their configuration options.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run Storybook for component development
npm run storybook

# Build for production
npm run build

# Run linting
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions and support, please open an issue on GitHub.
