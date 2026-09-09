import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { BrowserStoreInstance } from "@weng-lab/genomebrowser";
import { HighlightForm } from "./highlightForm";

export function AddHighlightForm({ browserStore }: { browserStore: BrowserStoreInstance }) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        "&::before": { display: "none" },
        bgcolor: "action.selected",
        borderRadius: "8px !important",
        mt: 1.25,
        overflow: "hidden",
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, px: 1.5 }}>
        <Box sx={{ alignItems: "center", display: "flex", gap: 0.75 }}>
          <AddIcon color="action" />
          <Typography fontWeight={700}>Add New Highlight</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: "background.paper", p: 1.5 }}>
        <HighlightForm browserStore={browserStore} />
      </AccordionDetails>
    </Accordion>
  );
}
