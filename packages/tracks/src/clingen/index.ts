import {
  defineTrackModule,
  fetchOnChange,
  type ModuleCreateInput,
  type TrackFetchContext,
  type TrackSetInput,
} from "@weng-lab/genomebrowser";
import { clinGenConfigSchema, type ClinGenConfig } from "./schema";
import { fetchClinGen } from "./fetch";
import { DenseClinGen, PackedClinGen, FullClinGen } from "./render";
import { ClinGenSettings } from "./settings";
import { ClinGenTooltip } from "./details";
import type { ClinGenItem, ClinGenKind, ClinGenDisplay, ClinGenData } from "./types";

const sources = {
  haplo: "https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinGen/clinGenHaplo.bb",
  triplo: "https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinGen/clinGenTriplo.bb",
  "gene-disease": "https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinGen/clinGenGeneDisease.bb",
  cspec: "https://hgdownload.soe.ucsc.edu/gbdb/hg38/bbi/clinGen/clinGenCspec.bb",
} as const;

function defineClinGenModule<const Type extends string>(type: Type, kind: ClinGenKind) {
  return defineTrackModule<ClinGenItem>()({
    type,
    defaults: { height: 18, color: "#000000" },
    configSchema: clinGenConfigSchema.extend({
      url: fetchOnChange(clinGenConfigSchema.shape.url.default(sources[kind])),
    }),
    fetch: (context: TrackFetchContext<ClinGenConfig>): Promise<ClinGenData> =>
      fetchClinGen(context, kind),
    render: { pack: PackedClinGen, dense: DenseClinGen, full: FullClinGen },
    settingsComponent: ClinGenSettings,
    tooltipComponent: ClinGenTooltip,
  });
}

export const clinGenHaploModule = defineClinGenModule("clingen-haplo", "haplo");
export const clinGenTriploModule = defineClinGenModule("clingen-triplo", "triplo");
export const clinGenGeneDiseaseModule = defineClinGenModule("clingen-gene-disease", "gene-disease");
export const clinGenCspecModule = defineClinGenModule("clingen-cspec", "cspec");

/** Independent instances and core membership; each child retains its own runtime. */
export function createClinGenTrackSet({
  id = "clingen",
  title = "ClinGen",
  display = "pack",
}: { id?: string; title?: string; display?: ClinGenDisplay } = {}) {
  const tracks = [
    clinGenHaploModule.create({
      base: { id: `${id}-haplo`, title: "ClinGen Haploinsufficiency", display },
      config: {},
    }),
    clinGenTriploModule.create({
      base: { id: `${id}-triplo`, title: "ClinGen Triplosensitivity", display },
      config: {},
    }),
    clinGenGeneDiseaseModule.create({
      base: { id: `${id}-gene-disease`, title: "ClinGen Gene-Disease Validity", display },
      config: {},
    }),
    clinGenCspecModule.create({
      base: { id: `${id}-cspec`, title: "ClinGen VCEP Specifications", display },
      config: {},
    }),
  ];
  const trackSets: TrackSetInput[] = [
    { id, title, trackIds: tracks.map((track) => track.base.id), allowTrackTransfer: false },
  ];
  return { tracks, trackSets };
}

export type ClinGenHaploCreateInput = ModuleCreateInput<typeof clinGenHaploModule>;
export type ClinGenTriploCreateInput = ModuleCreateInput<typeof clinGenTriploModule>;
export type ClinGenGeneDiseaseCreateInput = ModuleCreateInput<typeof clinGenGeneDiseaseModule>;
export type ClinGenCspecCreateInput = ModuleCreateInput<typeof clinGenCspecModule>;
export type { ClinGenConfig } from "./schema";
export type { ClinGenItem, ClinGenData, ClinGenDisplay } from "./types";
