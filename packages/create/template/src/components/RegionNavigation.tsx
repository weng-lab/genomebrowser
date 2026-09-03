import { Box, Typography } from "@mui/material";
import { GenomeSearch, type Result } from "@weng-lab/ui-components";

import { useBrowserStore } from "../stores";

export default function RegionNavigation() {
  const region = useBrowserStore((state) => state.region);

  function handleSearchSubmit(result: Result) {
    if (result.domain) {
      useBrowserStore.getState().setRegion(result.domain);
    }
  }

  return (
    <Box
      sx={{
        alignItems: { xs: "stretch", sm: "center" },
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: 2,
      }}
    >
      <GenomeSearch
        assembly="GRCh38"
        graphqlUrl="/api/screen-graphql"
        onSearchSubmit={handleSearchSubmit}
        queries={["Gene", "SNP", "cCRE", "Coordinate"]}
        size="small"
        sx={{ width: { xs: "100%", sm: 420 } }}
      />
      <Typography variant="body2">
        {region.chromosome}:{region.start.toLocaleString()}-{region.end.toLocaleString()}
      </Typography>
    </Box>
  );
}
