import { useState } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Button, Snackbar } from "@mui/material";
import { useBrowserStore } from "../../stores";

export default function CurrentRegion() {
  const region = useBrowserStore((state) => state.region);
  const [message, setMessage] = useState<string | null>(null);
  const coordinates = `${region.chromosome}:${region.start}-${region.end}`;

  async function copyRegion() {
    try {
      await navigator.clipboard.writeText(coordinates);
      setMessage("Region copied");
    } catch {
      setMessage("Could not copy. You can select and copy the coordinates instead.");
    }
  }

  return (
    <>
      <Button
        aria-label={`Copy current region: ${coordinates}`}
        endIcon={<ContentCopyIcon />}
        onClick={copyRegion}
        size="small"
        sx={{
          color: "text.primary",
          overflowWrap: "anywhere",
          textTransform: "none",
          userSelect: "text",
        }}
      >
        {coordinates}
      </Button>
      <Snackbar
        open={message !== null}
        message={message}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
      />
    </>
  );
}
