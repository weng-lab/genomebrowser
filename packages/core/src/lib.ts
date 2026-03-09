import Browser from "./components/browser/browser";
export { Browser };

// Core types
import type { Track, TrackDefinition, TrackDimensions } from "./components/tracks/types";
export type { Track, TrackDefinition, TrackDimensions };

// Registry
import { registerTrack, getDefinition, getRegisteredTracks } from "./components/tracks/registry";
export { registerTrack, getDefinition, getRegisteredTracks };

// --- Track Definitions & Factories ---

// BigWig
import { BigWigDefinition, createBigWigTrack, type BigWigTrack } from "./components/tracks/bigwig/definition";
export { BigWigDefinition, createBigWigTrack, type BigWigTrack };

// BigBed
import { BigBedDefinition, createBigBedTrack, type BigBedTrack } from "./components/tracks/bigbed/definition";
export { BigBedDefinition, createBigBedTrack, type BigBedTrack };

// Transcript
import {
  TranscriptDefinition,
  createTranscriptTrack,
  type TranscriptTrack,
} from "./components/tracks/transcript/definition";
export { TranscriptDefinition, createTranscriptTrack, type TranscriptTrack };

// MethylC
import { MethylCDefinition, createMethylCTrack, type MethylCTrack } from "./components/tracks/methylC/definition";
export { MethylCDefinition, createMethylCTrack, type MethylCTrack };

// --- Track Data Types (for renderers / consumers) ---

import type { Rect } from "./components/tracks/bigbed/types";
export type { Rect };

import type {
  FullBigWigProps,
  DenseBigWigProps,
  ValuedPoint,
  BigWigData,
  BigZoomData,
  YRange,
} from "./components/tracks/bigwig/types";
export type { FullBigWigProps, DenseBigWigProps, ValuedPoint, BigWigData, BigZoomData, YRange };

import type { TranscriptList, Transcript } from "./components/tracks/transcript/types";
export type { TranscriptList, Transcript };

import type { MotifRect } from "./components/tracks/motif/types";
export type { MotifRect };

import type { ImportanceTrackData } from "./components/tracks/importance/types";
export type { ImportanceTrackData };

import type { SNP } from "./components/tracks/ldtrack/types";
export type { SNP };

import type { BulkBedDataset, BulkBedRect } from "./components/tracks/bulkbed/types";
export type { BulkBedDataset, BulkBedRect };

import type { MethylCColors, MethylCUrls, MethylData } from "./components/tracks/methylC/types";
export type { MethylCColors, MethylCUrls, MethylData };

import type { ManhattanPoint } from "./components/tracks/manhattan/types";
export type { ManhattanPoint };

// Store Factory Functions
import {
  createBrowserStore,
  createBrowserStoreMemo,
  type InitialBrowserState,
  type BrowserStoreInstance,
} from "./store/browserStore";
export { createBrowserStore, createBrowserStoreMemo, type InitialBrowserState, type BrowserStoreInstance };

import { createTrackStore, createTrackStoreMemo, type TrackStoreInstance } from "./store/trackStore";
export { createTrackStore, createTrackStoreMemo, type TrackStoreInstance };

import { createDataStore, createDataStoreMemo, type DataStoreInstance } from "./store/dataStore";
export { createDataStore, createDataStoreMemo, type DataStoreInstance };

// Misc.
import { Highlight } from "./components/highlight/types";
export type { Highlight };

import { Vibrant, Pastels } from "./utils/color";
export { Vibrant, Pastels };

import { Domain, Chromosome } from "./utils/types";
export type { Domain, Chromosome };

import GQLWrapper from "./components/browser/GQLWrapper";
export { GQLWrapper };

import Cytobands from "./components/cytoband/cytobands";
export { Cytobands };

import useCustomData from "./hooks/useCustomData";
export { useCustomData };

import { useBrowserStore, useTrackStore, useDataStore, BrowserProvider } from "./store/BrowserContext";
export { useBrowserStore, useTrackStore, useDataStore, BrowserProvider };

import { type RectType, useTooltipStore, TooltipProvider } from "./store/TooltipContext";
export { type RectType, useTooltipStore, TooltipProvider };

import { useContextMenuStore, type MenuStore, ContextMenuProvider } from "./store/ContextMenuContext";
export { useContextMenuStore, type MenuStore, ContextMenuProvider };

import { useTheme, ThemeProvider, createThemeStore, createThemeStoreMemo, type ThemeStoreInstance } from "./store/themeStore";
export { useTheme, ThemeProvider, createThemeStore, createThemeStoreMemo, type ThemeStoreInstance };
