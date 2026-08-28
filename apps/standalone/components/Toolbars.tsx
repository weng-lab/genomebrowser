import { Box, Button, Tooltip, Typography } from "@mui/material";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { BrowserNavigationButton, type BrowserNavigationAction } from "@weng-lab/genomebrowser-ui";
import { Result, GenomeSearch } from "@weng-lab/ui-components";

type NavigationButtonDefinition = {
  action: BrowserNavigationAction;
  label: string;
  name: string;
};

const panButtons: readonly NavigationButtonDefinition[] = [
  { action: { type: "pan", fraction: -1 }, label: "← 1", name: "Pan left by one viewport" },
  { action: { type: "pan", fraction: -0.5 }, label: "← ½", name: "Pan left by half a viewport" },
  {
    action: { type: "pan", fraction: -0.25 },
    label: "← ¼",
    name: "Pan left by a quarter viewport",
  },
  {
    action: { type: "pan", fraction: 0.25 },
    label: "¼ →",
    name: "Pan right by a quarter viewport",
  },
  { action: { type: "pan", fraction: 0.5 }, label: "½ →", name: "Pan right by half a viewport" },
  { action: { type: "pan", fraction: 1 }, label: "1 →", name: "Pan right by one viewport" },
];

const zoomButtons: readonly NavigationButtonDefinition[] = [
  { action: { type: "zoom", factor: 10 }, label: "− 10×", name: "Zoom out 10×" },
  { action: { type: "zoom", factor: 3 }, label: "− 3×", name: "Zoom out 3×" },
  { action: { type: "zoom", factor: 1.5 }, label: "− 1.5×", name: "Zoom out 1.5×" },
  { action: { type: "zoom", factor: 1 / 1.5 }, label: "+ 1.5×", name: "Zoom in 1.5×" },
  { action: { type: "zoom", factor: 1 / 3 }, label: "+ 3×", name: "Zoom in 3×" },
  { action: { type: "zoom", factor: 0.1 }, label: "+ 10×", name: "Zoom in 10×" },
];

export function NavigationControls({ browserStore }: { browserStore: BrowserStoreInstance }) {
  const useBrowserStore = browserStore;

  function handleSearchSubmit(result: Result) {
    if (result.domain) useBrowserStore.getState().setRegion(result.domain);
  }

  return (
    <Box
      sx={{
        alignItems: { xs: "stretch", md: "center" },
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 2,
        justifyContent: "space-between",
      }}
    >
      <GenomeSearch
        assembly={"GRCh38"}
        graphqlUrl="/api/screen-graphql"
        onSearchSubmit={handleSearchSubmit}
        queries={["Gene", "SNP", "cCRE", "Coordinate"]}
        size="small"
        sx={{ width: { xs: "100%", md: "33.333%" } }}
      />
      <Box
        aria-label="Browser navigation"
        role="toolbar"
        sx={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: { xs: "flex-start", md: "flex-end" },
        }}
      >
        <Box aria-label="Pan" role="group" sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {panButtons.map(({ action, label, name }) => (
            <Tooltip key={name} title={name}>
              <Box component="span" sx={{ display: "inline-flex" }}>
                <BrowserNavigationButton
                  action={action}
                  aria-label={name}
                  browserStore={useBrowserStore}
                  size="small"
                  sx={{ minHeight: 40, minWidth: 44 }}
                  variant="outlined"
                >
                  {label}
                </BrowserNavigationButton>
              </Box>
            </Tooltip>
          ))}
        </Box>
        <Box aria-label="Zoom" role="group" sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {zoomButtons.map(({ action, label, name }) => (
            <Tooltip key={name} title={name}>
              <Box component="span" sx={{ display: "inline-flex" }}>
                <BrowserNavigationButton
                  action={action}
                  aria-label={name}
                  browserStore={useBrowserStore}
                  size="small"
                  sx={{ minHeight: 40, minWidth: 56 }}
                  variant="outlined"
                >
                  {label}
                </BrowserNavigationButton>
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Box>
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
