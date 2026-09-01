import { Box, ButtonBase, Typography } from "@mui/material";
import { GenomicRegion } from "@weng-lab/genomebrowser";
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
}: {
  region: GenomicRegion;
  chromosomeLength: number;
}) {
  const [cytobandContainerRef, cytobandWidth] = useObservedWidth<HTMLDivElement>();
  const cytobands = useHg38Cytobands();
  const regionLabel = formatRegion(region);
  const regionWidthLabel = `${(region.end - region.start).toLocaleString("en-US")} bp`;

  function copyRegion() {
    if (navigator.clipboard) void navigator.clipboard.writeText(regionLabel);
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 2,
        alignItems: "center",
      }}
    >
      <ButtonBase
        aria-label="Copy current region to clipboard"
        onClick={copyRegion}
        sx={{ gap: 1, justifySelf: "start", whiteSpace: "nowrap" }}
      >
        <Typography component="span" variant="subtitle2">
          {regionLabel}
        </Typography>
        <Typography component="span" variant="caption" color="text.secondary">
          {regionWidthLabel}
        </Typography>
      </ButtonBase>
      <Box ref={cytobandContainerRef} sx={{ height: 18, lineHeight: 0, minWidth: 0 }}>
        {cytobandWidth > 0 && cytobands.status === "ready" ? (
          <Cytobands
            bands={cytobands.bands}
            chromosome={region.chromosome}
            chromosomeLength={chromosomeLength}
            colors={{ negative: "#e0e0e0" }}
            currentRegion={region}
            height={18}
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
