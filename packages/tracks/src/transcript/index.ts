import type { ModuleCreateInput, ModuleInstance } from "@weng-lab/genomebrowser";
import {
  defaultScreenGraphQlEndpoint,
  defineTrackModule,
  fetchOnChange,
} from "@weng-lab/genomebrowser";
import { z } from "zod";
import { defaultRowHeight, rowHeightSchema } from "../shared/layout/rowLayout";
import { hexColorSchema } from "../shared/schemas";
import { fetchTranscript } from "./fetch";
import { PackTranscript, SquishTranscript } from "./render";
import { TranscriptSettings } from "./settings";
import { TranscriptTooltip } from "./tooltip";
import type { Transcript } from "./types";

const configSchema = z.object({
  endpoint: fetchOnChange(z.string().trim().min(1).default(defaultScreenGraphQlEndpoint)),
  assembly: fetchOnChange(z.string().min(1)),
  version: fetchOnChange(z.number().int().positive()),
  geneName: z.string().optional(),
  canonicalColor: hexColorSchema.default("#000000"),
  highlightColor: hexColorSchema.default("#000000"),
  rowHeight: rowHeightSchema.default(defaultRowHeight),
});

export const transcriptModule = defineTrackModule<Transcript>()({
  type: "transcript",
  defaults: { height: 90, color: "#7a4fb3" },
  configSchema,
  fetch: fetchTranscript,
  render: { squish: SquishTranscript, pack: PackTranscript },
  settingsComponent: TranscriptSettings,
  tooltipComponent: TranscriptTooltip,
});

export type TranscriptCreateInput = ModuleCreateInput<typeof transcriptModule>;
export type TranscriptConfig = ModuleInstance<typeof transcriptModule>["config"];
export type {
  Exon,
  GenomicElement,
  RenderedTranscript,
  Transcript,
  TranscriptData,
  TranscriptDisplay,
  TranscriptInteraction,
  TranscriptList,
  TranscriptRow,
} from "./types";
