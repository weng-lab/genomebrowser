import { create, type StoreApi, type UseBoundStore } from "zustand";
import { z } from "zod";
import { createAssemblyDefinition, type AssemblyDefinition } from "../../genome/assembly";
import { normalizeRegion, type GenomicRegion, type RegionErrorCode } from "../../genome/region";
import { parsePublicInput } from "../../modules/schemas";

export type Highlight = {
  id: string;
  region: {
    chromosome?: string;
    start: number;
    end: number;
  };
  color: string;
  opacity?: number;
};

export type BrowserStoreInput = {
  assembly: AssemblyDefinition;
  region: GenomicRegion;
  marginWidth?: number;
  trackWidth?: number;
  fontSize?: number;
  titleSize?: number;
  highlights?: Highlight[];
};

export type BrowserRegionMutationErrorCode =
  | RegionErrorCode
  | "INVALID_ZOOM_FACTOR"
  | "INVALID_ZOOM_CENTER";

export type BrowserRegionMutationResult =
  | { ok: true; region: GenomicRegion; clamped: boolean }
  | { ok: false; code: BrowserRegionMutationErrorCode; error: string };

export type BrowserViewportMutationResult =
  | { ok: true; trackWidth: number }
  | { ok: false; code: "INVALID_TRACK_WIDTH"; error: string };

export type BrowserStore = {
  readonly assembly: AssemblyDefinition;
  region: GenomicRegion;
  marginWidth: number;
  trackWidth: number;
  fontSize: number;
  titleSize: number;
  highlights: Highlight[];
  setRegion: (region: GenomicRegion) => BrowserRegionMutationResult;
  setTrackWidth: (trackWidth: number) => BrowserViewportMutationResult;
  zoom: (factor: number, centerBase?: number) => BrowserRegionMutationResult;
  addHighlight: (highlight: Highlight) => void;
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
});

const browserStoreInputSchema = z.object({
  assembly: z.unknown().optional(),
  region: z.unknown().optional(),
  marginWidth: z.number().positive().optional(),
  trackWidth: z.number().positive().optional(),
  fontSize: z.number().positive().optional(),
  titleSize: z.number().positive().optional(),
  highlights: z.array(highlightSchema).optional(),
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
      marginWidth: parsedInput.marginWidth ?? 120,
      trackWidth: parsedInput.trackWidth ?? 1000,
      fontSize: parsedInput.fontSize ?? 10,
      titleSize: parsedInput.titleSize ?? 12,
      highlights: parsedInput.highlights ?? [],

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
        const parsedHighlight = parsePublicInput(highlightSchema, highlight, "Highlight");
        if (get().highlights.some((existing) => existing.id === parsedHighlight.id)) return;
        set((state) => ({ highlights: [...state.highlights, parsedHighlight] }));
      },
      removeHighlight: (id) => {
        set((state) => ({
          highlights: state.highlights.filter((highlight) => highlight.id !== id),
        }));
      },
    };
  });
}
