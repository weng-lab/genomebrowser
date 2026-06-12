import { create, type StoreApi, type UseBoundStore } from "zustand";
import { z } from "zod";
import { parsePublicInput } from "../modules/schemas";
import { parseRegion, type BrowserRegion } from "../utils/region";

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
  region: BrowserRegion | string;
  marginWidth?: number;
  trackWidth?: number;
  fontSize?: number;
  titleSize?: number;
  highlights?: Highlight[];
};

export type BrowserStore = {
  region: BrowserRegion;
  marginWidth: number;
  trackWidth: number;
  fontSize: number;
  titleSize: number;
  highlights: Highlight[];
  setRegion: (region: BrowserRegion | string) => void;
  setTrackWidth: (trackWidth: number) => void;
  zoom: (factor: number, centerBase?: number) => void;
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
  region: z.union([
    z.string().min(1),
    z.object({
      chromosome: z.string().min(1),
      start: z.number().int(),
      end: z.number().int(),
    }),
  ]),
  marginWidth: z.number().positive().optional(),
  trackWidth: z.number().positive().optional(),
  fontSize: z.number().positive().optional(),
  titleSize: z.number().positive().optional(),
  highlights: z.array(highlightSchema).optional(),
});

export function createBrowserStore(input: BrowserStoreInput): BrowserStoreInstance {
  const parsedInput = parsePublicInput(browserStoreInputSchema, input, "Browser store input");
  return create<BrowserStore>((set, get) => ({
    region: parseRegion(parsedInput.region),
    marginWidth: parsedInput.marginWidth ?? 120,
    trackWidth: parsedInput.trackWidth ?? 1000,
    fontSize: parsedInput.fontSize ?? 10,
    titleSize: parsedInput.titleSize ?? 12,
    highlights: parsedInput.highlights ?? [],

    setRegion: (region) => set({ region: parseRegion(region) }),
    setTrackWidth: (trackWidth) => set({ trackWidth }),
    zoom: (factor, centerBase) => {
      if (factor <= 0) throw new Error("Zoom factor must be greater than 0");
      const region = get().region;
      const center = centerBase ?? Math.round((region.start + region.end) / 2);
      const nextLength = Math.max(1, Math.round((region.end - region.start) * factor));
      const nextStart = Math.max(0, Math.round(center - nextLength / 2));
      set({
        region: {
          chromosome: region.chromosome,
          start: nextStart,
          end: nextStart + nextLength,
        },
      });
    },
    addHighlight: (highlight) => {
      const parsedHighlight = parsePublicInput(
        highlightSchema,
        highlight,
        "Highlight",
      );
      if (get().highlights.some((existing) => existing.id === parsedHighlight.id)) return;
      set((state) => ({ highlights: [...state.highlights, parsedHighlight] }));
    },
    removeHighlight: (id) => {
      set((state) => ({ highlights: state.highlights.filter((highlight) => highlight.id !== id) }));
    },
  }));
}
