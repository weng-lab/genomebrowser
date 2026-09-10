"use client";

import { BedSchemaExample } from "./BedSchemaExample";

import { useState } from "react";
import { createBrowserStore, createTrackStore, mm10 } from "@weng-lab/genomebrowser";
import { bigBedModule, type BigBedRow } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";

const initialRegion = { chromosome: "chr1", start: 10_000_000, end: 10_100_000 };
const chromHmmSources = [
  { name: "Forebrain E11.5", url: "https://downloads.wenglab.org/Registry-V4/ENCFF330GHF.bigBed" },
  { name: "Forebrain E12.5", url: "https://downloads.wenglab.org/Registry-V4/ENCFF739VQW.bigBed" },
];
const ccreSources = [
  { name: "Aggregate", url: "https://downloads.wenglab.org/mm10-cCREs.DCC.bigBed" },
  {
    name: "Brown adipose tissue",
    url: "https://downloads.wenglab.org/Registry-V4/ENCFF409WOB_ENCFF476CKA.bigBed",
  },
];

export default function BedSchemaHarness() {
  const [selected, setSelected] = useState<BigBedRow | null>(null);
  const [useBrowserStore] = useState(() =>
    createBrowserStore({
      assembly: mm10,
      region: initialRegion,
      marginWidth: 210,
      trackWidth: 1000,
    }),
  );
  const [useTrackStore] = useState(() =>
    createTrackStore({
      modules: [bigBedModule, bulkBedModule],
      tracks: [
        bigBedModule.create(
          {
            id: "chromhmm",
            title: "ChromHMM · single",
            config: {
              url: chromHmmSources[0].url,
              bedSchema: "bed9",
              rowHeight: 28,
            },
          },
          { onClick: setSelected },
        ),
        bulkBedModule.create(
          {
            id: "bulk-chromhmm",
            title: "ChromHMM · bulk",
            config: {
              datasets: chromHmmSources,
              bedSchema: "bed9",
              rowHeight: 28,
              gap: 4,
            },
          },
          { onClick: setSelected },
        ),
        bigBedModule.create(
          {
            id: "ccres",
            title: "cCREs · single",
            config: {
              url: ccreSources[0].url,
              bedSchema: "ccre",
              rowHeight: 28,
            },
          },
          { onClick: setSelected },
        ),
        bulkBedModule.create(
          {
            id: "bulk-ccres",
            title: "cCREs · bulk",
            config: {
              datasets: ccreSources,
              bedSchema: "ccre",
              rowHeight: 28,
              gap: 4,
            },
          },
          { onClick: setSelected },
        ),
      ],
    }),
  );
  return (
    <BedSchemaExample
      title="Mouse ChromHMM and cCRE colors"
      description="Real SCREEN sources · mm10. Bulk ChromHMM rows: forebrain E11.5 and E12.5. Bulk cCRE rows: aggregate and brown adipose tissue. Hover for labels; click an interval to inspect it."
      schemaHint="Choose bed3 to compare the track-color fallback, then restore bed9 for ChromHMM or ccre for cCREs. Selecting ccre on a ChromHMM source exercises the missing-column error; restore bed9 to recover."
      useBrowserStore={useBrowserStore}
      useTrackStore={useTrackStore}
      selected={selected}
      clearSelection={() => setSelected(null)}
    />
  );
}
