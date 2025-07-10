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
import { Browser, Track, TrackType, DisplayMode, InitialBrowserState, useBrowserStore } from "track-logic";

function GenomeBrowserExample() {
  // example interactions with the browserStore
  const addHighlight = useBrowserStore((state) => state.addHighlight);
  const removeHighlight = useBrowserStore((state) => state.removeHighlight);

  // Define your tracks
  const tracks: Track[] = [
    {
      id: "signal-track",
      title: "DNase Signal",
      trackType: TrackType.BigWig,
      displayMode: DisplayMode.Full,
      height: 100,
      color: "#3498db",
      url: "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
    },
    {
      id: "peaks-track",
      title: "cCREs",
      trackType: TrackType.BigBed,
      displayMode: DisplayMode.Dense,
      height: 20,
      color: "#e74c3c",
      url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
      onClick: (rect) => {
        addHighlight({
          id: `${rect.name}-clicked`,
          domain: { start: rect.start, end: rect.end },
          color: "#f39c12",
        });
      },
      onHover: (rect) => {
        addHighlight({
          id: rect.name || "hover",
          domain: { start: rect.start, end: rect.end },
          color: "#f39c12",
        });
      },
      onLeave: (rect) => {
        removeHighlight(rect.name || "hover");
      },
    },
    {
      id: "genes-track",
      title: "Genes",
      trackType: TrackType.Transcript,
      displayMode: DisplayMode.Squish,
      height: 50,
      color: "#2ecc71",
      assembly: "GRCh38",
      version: 47,
    },
    {
      id: "bulk-chip-data",
      title: "ChIP-seq Data",
      trackType: TrackType.BulkBed,
      displayMode: DisplayMode.Full,
      height: 30,
      gap: 2,
      color: "#9b59b6",
      datasets: [
        {
          name: "H3K4me3",
          url: "https://downloads.wenglab.org/ChIP_ENCSR000AKA-ENCSR000AKC-ENCSR000AKF-ENCSR000AKE-ENCSR000AKD-ENCSR000AOX.bigBed",
        },
        {
          name: "H3K27ac",
          url: "https://downloads.wenglab.org/ChIP_ENCSR000EWA-ENCSR000AKP-ENCSR000EWC-ENCSR000DWB-ENCSR000EWB-ENCSR000APE.bigBed",
        },
      ],
      tooltip: (rect) => (
        <g>
          <rect width={160} height={45} fill="white" stroke="black" />
          <text x={10} y={20} fontSize={12} fontWeight="bold">
            {rect.name}
          </text>
          <text x={10} y={35} fontSize={12}>
            Dataset: {rect.datasetName}
          </text>
        </g>
      ),
    },
  ];

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

  return (
    <div style={{ width: "90%", margin: "0 auto" }}>
      <h1>My Genome Browser</h1>
      <Browser state={initialState} tracks={tracks} />
    </div>
  );
}

export default GenomeBrowserExample;
```

## Track Types

### BigWig Tracks

Display continuous signal data (e.g., ChIP-seq, RNA-seq signals).

```tsx
{
  id: "signal",
  title: "Signal Data",
  trackType: TrackType.BigWig,
  displayMode: DisplayMode.Full, // or DisplayMode.Dense
  height: 100,
  color: "#3498db",
  url: "https://example.com/signal.bw",
  range: [0, 100], // Optional: custom Y-axis range
}
```

### BigBed Tracks

Display discrete genomic regions (e.g., peaks, annotations).

```tsx
{
  id: "peaks",
  title: "Peak Calls",
  trackType: TrackType.BigBed,
  displayMode: DisplayMode.Dense, // or DisplayMode.Squish
  height: 20,
  color: "#e74c3c",
  url: "https://example.com/peaks.bigBed",
  onClick: (rect) => console.log("Clicked:", rect),
  onHover: (rect) => console.log("Hovered:", rect),
  tooltip: (rect) => <text>{rect.name}</text>,
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
  displayMode: DisplayMode.Squish, // or DisplayMode.Pack
  height: 50,
  color: "#2ecc71",
  assembly: "GRCh38", // or "mm10"
  version: 47, // GENCODE version
}
```

Explore our comprehensive [Storybook]() documentation for detailed information about additional track types and their configuration options.

## Browser Configuration

### Initial State

```tsx
const initialState: InitialBrowserState = {
  domain: {
    chromosome: "chr1",
    start: 1000000,
    end: 2000000,
  },
  marginWidth: 150, // Width of track labels
  trackWidth: 1350, // Width of track data area
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

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

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
