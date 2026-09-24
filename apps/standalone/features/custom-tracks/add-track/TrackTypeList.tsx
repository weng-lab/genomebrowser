import { Box, Card, CardActionArea, Stack, Typography } from "@mui/material";
import type { AnyTrackModule } from "@weng-lab/genomebrowser";
import { getCatalogEntry, isAvailableForAssembly } from "../catalog";
import { TrackPreview } from "./TrackPreview";

/** Track types that can be created, with schematic previews. */
export function TrackTypeList({
  modules,
  assemblyId,
  onSelect,
}: {
  modules: readonly AnyTrackModule[];
  assemblyId: string;
  onSelect: (module: AnyTrackModule) => void;
}) {
  return (
    <Stack component="ul" spacing={1.5} sx={{ p: 0, m: 0, listStyle: "none" }}>
      {modules.map((module) => {
        const entry = getCatalogEntry(module.type);
        if (!entry || !module.settingsComponent) return null;
        const unavailable = !isAvailableForAssembly(entry, assemblyId);
        return (
          <Card component="li" key={module.type} variant="outlined">
            <CardActionArea
              disabled={unavailable}
              onClick={() => onSelect(module)}
              aria-label={`Add ${entry.label}`}
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                textAlign: "left",
                opacity: unavailable ? 0.5 : 1,
              }}
            >
              <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography component="h3" variant="subtitle1" fontWeight={600}>
                  {entry.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {entry.description}
                </Typography>
              </Box>
              <TrackPreview kind={entry.preview} />
            </CardActionArea>
          </Card>
        );
      })}
    </Stack>
  );
}
