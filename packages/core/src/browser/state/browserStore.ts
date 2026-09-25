import { create, type StoreApi, type UseBoundStore } from "zustand";
import { z } from "zod";
import { createAssemblyDefinition, type AssemblyDefinition } from "../../genome/assembly";
import { normalizeRegion, type GenomicRegion, type RegionErrorCode } from "../../genome/region";
import type { MutationFailure } from "../../mutation";
import { formatZodError, parsePublicInput } from "../../modules/schemas";

export type Highlight = {
  id: string;
  region: {
    chromosome?: string;
    start: number;
    end: number;
  };
  color: string;
  opacity?: number;
  type?: "filled" | "outlined";
};

export type BrowserSelectionMode = "pan" | "zoom" | "highlight";
export type SelectionHighlightStyle = Pick<Highlight, "color" | "opacity" | "type">;

export type BrowserStoreInput = {
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

export type BrowserHighlightMutationResult = { ok: true } | MutationFailure<"INVALID_HIGHLIGHT">;

export type BrowserStore = {
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
  removeHighlight: (id: string) => void;
};

export type BrowserStoreInstance = UseBoundStore<StoreApi<BrowserStore>>;

const highlightSchema = z.object({
  id: z.string().min(1),
  region: z
    .object({
      chromosome: z.string().min(1).optional(),
      start: z.number().int(),
      end: z.number().int(),
    })
    .refine((region) => region.start < region.end, {
      message: "start must be less than end",
      path: ["start"],
    }),
  color: z.string().min(1),
  opacity: z.number().min(0).max(1).optional(),
  type: z.enum(["filled", "outlined"]).optional(),
});

const selectionModeSchema = z.enum(["pan", "zoom", "highlight"]);
const selectionHighlightSchema = highlightSchema.pick({ color: true, opacity: true, type: true });

const browserStoreInputSchema = z.object({
  assembly: z.unknown().optional(),
  region: z.unknown().optional(),
  marginWidth: z.number().positive().optional(),
  trackWidth: z.number().positive().optional(),
  fontSize: z.number().positive().optional(),
  titleSize: z.number().positive().optional(),
  highlights: z.array(highlightSchema).optional(),
  selectionMode: selectionModeSchema.optional(),
  selectionHighlight: selectionHighlightSchema.optional(),
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
        const result = highlightSchema.safeParse(highlight);
        if (!result.success)
          return {
            ok: false,
            code: "INVALID_HIGHLIGHT",
            error: `Highlight is invalid: ${formatZodError(result.error)}`,
          };
        const parsedHighlight = result.data;
        if (get().highlights.some((existing) => existing.id === parsedHighlight.id))
          return { ok: true };
        set((state) => ({ highlights: [...state.highlights, parsedHighlight] }));
        return { ok: true };
      },
      removeHighlight: (id) => {
        set((state) => ({
          highlights: state.highlights.filter((highlight) => highlight.id !== id),
        }));
      },
    };
  });
}
