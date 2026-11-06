import { create, type StoreApi, type UseBoundStore } from "zustand";
import { z } from "zod";
import { createAssemblyDefinition, type AssemblyDefinition } from "../../genome/assembly";
import { normalizeRegion, type GenomicRegion, type RegionErrorCode } from "../../genome/region";
import type { MutationFailure } from "../../mutation";
import {
  basePairDetailSchema,
  browserSettingsSchema,
  highlightSchema,
  selectionHighlightSchema,
  selectionModeSchema,
} from "../../schemas";
import { formatZodError, parsePublicInput } from "../../validation";

export type Highlight = z.output<typeof highlightSchema>;

export type BrowserSelectionMode = z.output<typeof selectionModeSchema>;
export type SelectionHighlightStyle = z.output<typeof selectionHighlightSchema>;

/** `maxVisibleBases` is the largest visible span eligible for base-pair data. Defaults to 100 bp. */
export type BasePairDetailSettings = z.output<typeof basePairDetailSchema>;

export type BasePairDetailMutationResult =
  | { ok: true }
  | MutationFailure<"INVALID_BASE_PAIR_DETAIL">;

export type BrowserStoreInput = {
  basePairDetail?: BasePairDetailSettings;
  assembly: AssemblyDefinition;
  region: GenomicRegion;
  marginWidth?: number;
  /** Logical track width used by fixed sizing; excludes the margin. Defaults to 1000. */
  trackWidth?: number;
  fontSize?: number;
  titleSize?: number;
  highlights?: Highlight[];
  selectionMode?: BrowserSelectionMode;
  selectionHighlight?: SelectionHighlightStyle;
};

export type BrowserRegionMutationErrorCode =
  | RegionErrorCode
  | "INVALID_ZOOM_FACTOR"
  | "INVALID_ZOOM_CENTER";

export type BrowserRegionMutationResult =
  | { ok: true; region: GenomicRegion; clamped: boolean }
  | MutationFailure<BrowserRegionMutationErrorCode>;

export type BrowserViewportMutationResult =
  | { ok: true; trackWidth: number }
  | MutationFailure<"INVALID_TRACK_WIDTH">;

export type BrowserSelectionMutationResult =
  | { ok: true }
  | MutationFailure<"INVALID_SELECTION_MODE" | "INVALID_SELECTION_HIGHLIGHT">;

export type BrowserHighlightMutationResult =
  | { ok: true }
  | MutationFailure<"INVALID_HIGHLIGHT" | "HIGHLIGHT_NOT_FOUND" | "DUPLICATE_HIGHLIGHT_ID">;

export type BrowserStore = {
  basePairDetail: BasePairDetailSettings;
  setBasePairDetail: (settings: BasePairDetailSettings) => BasePairDetailMutationResult;
  readonly assembly: AssemblyDefinition;
  region: GenomicRegion;
  marginWidth: number;
  trackWidth: number;
  fontSize: number;
  titleSize: number;
  highlights: Highlight[];
  selectionMode: BrowserSelectionMode;
  selectionHighlight: SelectionHighlightStyle;
  /**
   * True while a mounted browser is loading track data. Pointer interaction in
   * the browser is blocked meanwhile. Set by the browser; read it to disable
   * application controls until the browser has settled.
   */
  readonly isLoading: boolean;
  setSelectionMode: (mode: BrowserSelectionMode) => BrowserSelectionMutationResult;
  setSelectionHighlight: (style: SelectionHighlightStyle) => BrowserSelectionMutationResult;
  setRegion: (region: GenomicRegion) => BrowserRegionMutationResult;
  /** Set the configured logical width for fixed views; responsive views measure themselves. */
  setTrackWidth: (trackWidth: number) => BrowserViewportMutationResult;
  zoom: (factor: number, centerBase?: number) => BrowserRegionMutationResult;
  addHighlight: (highlight: Highlight) => BrowserHighlightMutationResult;
  /** Replaces the highlight with ID `id`, which may be renamed to an unused ID. */
  updateHighlight: (id: string, highlight: Highlight) => BrowserHighlightMutationResult;
  removeHighlight: (id: string) => void;
  clearHighlights: () => void;
};

export type BrowserStoreInstance = UseBoundStore<StoreApi<BrowserStore>>;

const browserStoreInputSchema = browserSettingsSchema.partial().extend({
  assembly: z.unknown().optional(),
  region: z.unknown().optional(),
});

export function createBrowserStore(input: BrowserStoreInput): BrowserStoreInstance {
  const parsedInput = parsePublicInput(browserStoreInputSchema, input, "Browser store input");
  const assembly = createAssemblyDefinition(parsedInput.assembly as AssemblyDefinition);
  const initialRegionResult = normalizeRegion(parsedInput.region as GenomicRegion, assembly);
  if (!initialRegionResult.ok) {
    throw new Error(
      `Browser store initial region is invalid (${initialRegionResult.code}): ${initialRegionResult.error}`,
    );
  }

  return create<BrowserStore>((set, get) => {
    function commitRegion(region: GenomicRegion): BrowserRegionMutationResult {
      const result = normalizeRegion(region, assembly);
      if (!result.ok) return result;
      set({ region: result.region });
      return result;
    }

    return {
      basePairDetail: parsedInput.basePairDetail ?? { maxVisibleBases: 100 },
      setBasePairDetail: (settings) => {
        const result = basePairDetailSchema.safeParse(settings);
        if (!result.success)
          return {
            ok: false,
            code: "INVALID_BASE_PAIR_DETAIL",
            error: `Base-pair detail settings are invalid: ${formatZodError(result.error)}`,
          };
        set({ basePairDetail: result.data });
        return { ok: true };
      },
      assembly,
      region: initialRegionResult.region,
      marginWidth: parsedInput.marginWidth ?? 50,
      trackWidth: parsedInput.trackWidth ?? 1000,
      fontSize: parsedInput.fontSize ?? 10,
      titleSize: parsedInput.titleSize ?? 12,
      highlights: parsedInput.highlights ?? [],

      selectionMode: parsedInput.selectionMode ?? "pan",
      selectionHighlight: parsedInput.selectionHighlight ?? {
        color: "#f59e0b",
        opacity: 0.25,
        type: "filled",
      },
      isLoading: false,
      setSelectionMode: (mode) => {
        const result = selectionModeSchema.safeParse(mode);
        if (!result.success)
          return {
            ok: false,
            code: "INVALID_SELECTION_MODE",
            error: `Selection mode is invalid: ${formatZodError(result.error)}`,
          };
        set({ selectionMode: result.data });
        return { ok: true };
      },
      setSelectionHighlight: (style) => {
        const result = selectionHighlightSchema.safeParse(style);
        if (!result.success)
          return {
            ok: false,
            code: "INVALID_SELECTION_HIGHLIGHT",
            error: `Selection highlight is invalid: ${formatZodError(result.error)}`,
          };
        set({ selectionHighlight: result.data });
        return { ok: true };
      },

      setRegion: commitRegion,
      setTrackWidth: (trackWidth) => {
        if (!Number.isFinite(trackWidth) || trackWidth <= 0) {
          return {
            ok: false,
            code: "INVALID_TRACK_WIDTH",
            error: "Track width must be a finite number greater than 0.",
          };
        }
        set({ trackWidth });
        return { ok: true, trackWidth };
      },
      zoom: (factor, centerBase) => {
        if (!Number.isFinite(factor) || factor <= 0) {
          return {
            ok: false,
            code: "INVALID_ZOOM_FACTOR",
            error: "Zoom factor must be a finite number greater than 0.",
          };
        }
        const region = get().region;
        const chromosomeLength = assembly.chromosomes[region.chromosome];
        if (
          centerBase !== undefined &&
          (!Number.isSafeInteger(centerBase) || centerBase < 0 || centerBase >= chromosomeLength)
        ) {
          return {
            ok: false,
            code: "INVALID_ZOOM_CENTER",
            error:
              `Zoom center must be a safe integer within chromosome "${region.chromosome}" ` +
              `bounds [0, ${chromosomeLength}).`,
          };
        }
        const center = centerBase ?? region.start + (region.end - region.start) / 2;
        const nextLength = Math.max(1, Math.round((region.end - region.start) * factor));
        const nextStart = Math.round(center - nextLength / 2);
        return commitRegion({
          chromosome: region.chromosome,
          start: nextStart,
          end: nextStart + nextLength,
        });
      },
      addHighlight: (highlight) => {
        const result = parseHighlight(highlight);
        if (!result.ok) return result;
        const parsedHighlight = result.highlight;
        if (get().highlights.some((existing) => existing.id === parsedHighlight.id))
          return { ok: true };
        set((state) => ({ highlights: [...state.highlights, parsedHighlight] }));
        return { ok: true };
      },
      updateHighlight: (id, highlight) => {
        const result = parseHighlight(highlight);
        if (!result.ok) return result;
        const parsedHighlight = result.highlight;
        const { highlights } = get();
        if (!highlights.some((existing) => existing.id === id))
          return {
            ok: false,
            code: "HIGHLIGHT_NOT_FOUND",
            error: `No highlight found for id: ${id}`,
          };
        if (
          parsedHighlight.id !== id &&
          highlights.some((existing) => existing.id === parsedHighlight.id)
        )
          return {
            ok: false,
            code: "DUPLICATE_HIGHLIGHT_ID",
            error: `Duplicate highlight id: ${parsedHighlight.id}`,
          };
        set({
          highlights: highlights.map((existing) =>
            existing.id === id ? parsedHighlight : existing,
          ),
        });
        return { ok: true };
      },
      removeHighlight: (id) => {
        set((state) => ({
          highlights: state.highlights.filter((highlight) => highlight.id !== id),
        }));
      },
      clearHighlights: () => {
        if (get().highlights.length > 0) set({ highlights: [] });
      },
    };
  });
}

function parseHighlight(
  highlight: Highlight,
): { ok: true; highlight: Highlight } | MutationFailure<"INVALID_HIGHLIGHT"> {
  const result = highlightSchema.safeParse(highlight);
  if (!result.success)
    return {
      ok: false,
      code: "INVALID_HIGHLIGHT",
      error: `Highlight is invalid: ${formatZodError(result.error)}`,
    };
  return { ok: true, highlight: result.data };
}
