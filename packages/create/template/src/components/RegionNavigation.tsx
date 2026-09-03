import { TextField } from "@mui/material";
import { useBrowserStore } from "../stores";

export default function RegionNavigation() {
  const region = useBrowserStore((state) => state.region);
  return (
    <>
      <TextField variant="standard"></TextField>
      {region.chromosome}:{region.start}-{region.end}
    </>
  );
}
