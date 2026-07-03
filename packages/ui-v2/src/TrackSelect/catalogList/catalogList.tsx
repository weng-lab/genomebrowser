import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import type { TrackSelectCatalog } from "../schema/catalogSchema";
import { trackSelectPanelHeight } from "../trackSelectConstants";
import { TrackSelectEmptyPanel } from "../trackSelectEmptyPanel";
import { CatalogCard } from "./catalogCard";

type CatalogListProps = {
  catalogs: TrackSelectCatalog[];
  onCatalogSelect: (catalogId: string) => void;
};

export function CatalogList({ catalogs, onCatalogSelect }: CatalogListProps) {
  if (catalogs.length === 0) {
    return <TrackSelectEmptyPanel>No track catalogs available</TrackSelectEmptyPanel>;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        height: trackSelectPanelHeight,
        overflow: "auto",
        borderWidth: 2,
      }}
    >
      <Stack spacing={2} sx={{ p: 2 }}>
        {catalogs.map((catalog) => (
          <CatalogCard
            key={catalog.id}
            catalog={catalog}
            onClick={() => onCatalogSelect(catalog.id)}
          />
        ))}
      </Stack>
    </Paper>
  );
}
