import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import { TrackTooltip } from "../shared/tooltips/trackTooltip";
import { useGenomeBrowser, type TrackRuntimeContext } from "@weng-lab/genomebrowser";
import { clinGenLinks, clinGenRows, plainSourceText } from "./presentation";
import type { ClinGenConfig } from "./schema";
import type { ClinGenItem } from "./types";

export function ClinGenTooltip({
  item,
}: {
  item: ClinGenItem;
  context: TrackRuntimeContext<ClinGenConfig>;
}) {
  return <TrackTooltip title={item.name} titleColor={item.color} rows={clinGenRows(item)} />;
}

export function ClinGenDetails({
  item,
  trackId,
  close,
}: {
  item: ClinGenItem;
  trackId: string;
  close: () => void;
}) {
  const titleId = useId();
  const { useTrackStore } = useGenomeBrowser();
  const trackTitle = useTrackStore((state) => state.getTrack(trackId)?.base.title ?? "ClinGen");
  const links = clinGenLinks(item);
  const fields = Object.entries(item).filter(
    ([name, value]) =>
      !["kind", "fields", "color", "chromosome", "start", "end"].includes(name) &&
      (typeof value === "string" || typeof value === "number") &&
      value !== "",
  );

  return (
    <Dialog open onClose={close} fullWidth maxWidth="md" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{item.name}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="subtitle2">{trackTitle} (hg38)</Typography>
          <Box
            component="dl"
            sx={{ m: 0, display: "grid", gridTemplateColumns: "minmax(100px, 1fr) 3fr", gap: 1 }}
          >
            {clinGenRows(item).map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </Box>
          {links.map((link) => (
            <Link key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
              {link.label}
            </Link>
          ))}
          <Box component="details">
            <Typography component="summary" sx={{ cursor: "pointer" }}>
              All source fields
            </Typography>
            <Box
              component="dl"
              sx={{ display: "grid", gridTemplateColumns: "minmax(100px, 1fr) 3fr", gap: 1 }}
            >
              {fields.map(([name, value]) => (
                <DetailRow key={name} label={name} value={plainSourceText(String(value))} />
              ))}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Typography component="dt" variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: "anywhere" }}>
        {value}
      </Typography>
    </>
  );
}
