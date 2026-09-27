import { TrackLabel } from "../../track-overlay/TrackLabel";

export function ErrorState({ message }: { message: string }) {
  return (
    <TrackLabel anchor="center" overflow="truncate">
      {`Error — ${message}`}
    </TrackLabel>
  );
}
