"use client";

import { BedSchemaExample } from "../BedSchemaExample";

import { useState } from "react";
import { createBrowserStore, createTrackStore, hg38 } from "@weng-lab/genomebrowser";
import { bigBedModule, type BigBedRow } from "@weng-lab/genomebrowser-tracks/bigbed";
import { bulkBedModule } from "@weng-lab/genomebrowser-tracks/bulkbed";

const initialRegion = { chromosome: "chr1", start: 10_000_000, end: 10_100_000 };
const ccreSources = [
  { name: "Aggregate", url: "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed" },
  {
    name: "Adipose tissue",
    url: "https://downloads.wenglab.org/Registry-V4/ENCFF922YMQ.bigBed",
  },
];

export default function HumanCcreHarness() {
  const [selected, setSelected] = useState<BigBedRow | null>(null);
  const [useBrowserStore] = useState(() =>
    createBrowserStore({
      assembly: hg38,
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
      title="Human cCRE colors"
      description="Real SCREEN sources · GRCh38. Single track: aggregate cCREs. Bulk rows: aggregate and adipose tissue. Hover for labels; click an interval to inspect it."
      schemaHint="Choose bed3 to compare the track-color fallback, then restore ccre to recover interval colors."
      useBrowserStore={useBrowserStore}
      useTrackStore={useTrackStore}
      selected={selected}
      clearSelection={() => setSelected(null)}
    />
  );
}
