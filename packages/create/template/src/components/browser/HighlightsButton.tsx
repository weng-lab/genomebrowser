import { useState } from "react";
import { Button } from "@mui/material";
import { HighlightDialog } from "@weng-lab/genomebrowser-ui";
import { useBrowserStore } from "../../stores";

export default function HighlightsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
        Highlights
      </Button>
      <HighlightDialog browserStore={useBrowserStore} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
