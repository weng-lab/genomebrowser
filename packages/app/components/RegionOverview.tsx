import { Box, ButtonBase, Typography } from "@mui/material";
import { GenomicRegion } from "@weng-lab/genomebrowser";
import { Cytobands } from "@weng-lab/genomebrowser-ui";
import { useObservedWidth } from "../hooks/useObservedWidth";

export function RegionOverview({ region }: { region: GenomicRegion }) {
  const [cytobandContainerRef, cytobandWidth] = useObservedWidth<HTMLDivElement>();
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
        {cytobandWidth > 0 ? (
          <Cytobands
            assembly={"GRCh38"}
            chromosome={region.chromosome}
            colors={{ negative: "#e0e0e0" }}
            currentRegion={region}
            height={18}
            width={cytobandWidth}
          />
        ) : null}
      </Box>
    </Box>
  );
}

function formatRegion(region: GenomicRegion) {
  return `${region.chromosome}:${region.start.toLocaleString("en-US")}–${region.end.toLocaleString("en-US")}`;
}
