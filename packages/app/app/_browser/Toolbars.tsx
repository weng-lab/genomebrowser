import { Box, Typography, Button } from "@mui/material";
import {
  AssemblyDefinition,
  BrowserRegionMutationResult,
  GenomicRegion,
} from "@weng-lab/genomebrowser";
import { BrowserNavigationControls } from "@weng-lab/genomebrowser-ui";
import { Result, GenomeSearch } from "@weng-lab/ui-components";

export function NavigationControls({
  assembly,
  region,
  setRegion,
}: {
  assembly: AssemblyDefinition;
  region: GenomicRegion;
  setRegion: (region: GenomicRegion) => BrowserRegionMutationResult;
}) {
  function handleSearchSubmit(result: Result) {
    if (result.domain) setRegion(result.domain);
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
      <GenomeSearch
        assembly={"GRCh38"}
        graphqlUrl="/api/screen-graphql"
        onSearchSubmit={handleSearchSubmit}
        queries={["Gene", "SNP", "cCRE", "Coordinate"]}
        size="small"
        sx={{ width: "33.333%" }}
      />
      <BrowserNavigationControls assembly={assembly} region={region} onRegionChange={setRegion} />
    </Box>
  );
}

export function BrowserHeader({ onSelectTracks }: { onSelectTracks: () => void }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography variant="h4">UMass Chan Genome Browser</Typography>
      <Button variant="contained" onClick={onSelectTracks}>
        Select tracks
      </Button>
    </Box>
  );
}
