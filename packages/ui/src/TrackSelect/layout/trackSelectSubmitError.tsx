import Alert from "@mui/material/Alert";
import { useTrackSelect } from "../session/trackSelectContext";

export function TrackSelectSubmitError() {
  const { state } = useTrackSelect();

  return state.submitError ? (
    <Alert severity="error" sx={{ mt: 2 }}>
      {state.submitError}
    </Alert>
  ) : null;
}
