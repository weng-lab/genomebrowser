import { Box, ButtonBase, Typography } from "@mui/material";
import type { GenomicRegion, Highlight } from "@weng-lab/genomebrowser";
import { Cytobands } from "@weng-lab/genomebrowser-ui";
import { readCytobands, type Cytoband } from "@weng-lab/genomic-reader";
import { useEffect, useState } from "react";
import { useObservedWidth } from "../hooks/useObservedWidth";

type CytobandState =
  | { status: "loading" }
  | { status: "ready"; bands: readonly Cytoband[] }
  | { status: "error"; message: string };

export function RegionOverview({
  region,
  chromosomeLength,
  highlights,
}: {
  region: GenomicRegion;
  chromosomeLength: number;
  highlights: readonly Highlight[];
}) {
  const [cytobandContainerRef, cytobandWidth] = useObservedWidth<HTMLDivElement>();
  const cytobands = useHg38Cytobands();
  const regionLabel = formatRegion(region);

  function copyRegion() {
    if (navigator.clipboard) void navigator.clipboard.writeText(regionLabel);
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 450,
        minWidth: 0,
        alignItems: "center",
      }}
    >
      <ButtonBase
        aria-label="Copy current region to clipboard"
        onClick={copyRegion}
        sx={{ maxWidth: "100%", overflowWrap: "anywhere" }}
      >
        <Typography component="span" variant="body1">
          {regionLabel}
        </Typography>
      </ButtonBase>
      <Box
        ref={cytobandContainerRef}
        sx={{ minHeight: 20, width: "100%", lineHeight: 0, minWidth: 0 }}
      >
        {cytobandWidth > 0 && cytobands.status === "ready" ? (
          <Cytobands
            bands={cytobands.bands}
            chromosome={region.chromosome}
            chromosomeLength={chromosomeLength}
            currentRegion={region}
            highlights={highlights}
            height={20}
            width={cytobandWidth}
          />
        ) : cytobands.status === "error" ? (
          <Typography color="error" variant="caption">
            {`Unable to load cytobands: ${cytobands.message}`}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

function useHg38Cytobands(): CytobandState {
  const [state, setState] = useState<CytobandState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL("/data/hg38.cytoBand.txt", window.location.href).href;
    void readCytobands({ url, signal: controller.signal }).then(
      (bands) => setState({ status: "ready", bands }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      },
    );
    return () => controller.abort();
  }, []);

  return state;
}

function formatRegion(region: GenomicRegion) {
  return `${region.chromosome}:${region.start.toLocaleString("en-US")}–${region.end.toLocaleString("en-US")}`;
}
