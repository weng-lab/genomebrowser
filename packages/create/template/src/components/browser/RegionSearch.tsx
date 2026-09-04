import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { GenomeSearch, type Result } from "@weng-lab/ui-components";
import { useBrowserStore } from "../../stores";

export default function RegionSearch() {
  const assemblyId = useBrowserStore((state) => state.assembly.id);
  const [error, setError] = useState<string | null>(null);
  const searchAssembly =
    assemblyId === "hg38" || assemblyId === "GRCh38"
      ? "GRCh38"
      : assemblyId === "mm10"
        ? "mm10"
        : null;

  function handleSearchSubmit(result: Result) {
    if (!result.domain) return;
    const update = useBrowserStore.getState().setRegion(result.domain);
    setError(update.ok ? null : update.error);
  }

  return (
    <Box sx={{ width: "100%", minWidth: 0, maxWidth: 420 }}>
      {searchAssembly ? (
        <GenomeSearch
          assembly={searchAssembly}
          graphqlUrl="/api/screen-graphql"
          onSearchSubmit={handleSearchSubmit}
          queries={["Gene", "SNP", "cCRE", "Coordinate"]}
          size="small"
          slotProps={{ input: { label: "Search genome", error: Boolean(error) } }}
        />
      ) : (
        <Typography color="text.secondary" variant="body2">
          Search is unavailable for {assemblyId}. You can still pan and zoom.
        </Typography>
      )}
      {error && (
        <Typography color="error" role="alert" variant="caption">
          {error}
        </Typography>
      )}
    </Box>
  );
}
