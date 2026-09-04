import { useState } from "react";
import { Button } from "@mui/material";
import { TrackSelect } from "@weng-lab/genomebrowser-ui";
import { defaultTrackIds, trackCollections } from "../../collections";
import { useTrackStore } from "../../stores";

export default function TrackPicker() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
        Select tracks
      </Button>
      {/* Keep mounted: TrackSelect loads the default tracks even while closed. */}
      <TrackSelect
        open={open}
        onClose={() => setOpen(false)}
        title="Select tracks"
        defaultTrackIds={defaultTrackIds}
        trackCollections={trackCollections}
        useTrackStore={useTrackStore}
      />
    </>
  );
}
