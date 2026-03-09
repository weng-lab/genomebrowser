import { useTrackStore } from "../../../store/BrowserContext";
import Form from "../../modal/shared/form";
import Value from "../../modal/shared/value";
import type { BulkBedTrack } from "./definition";

export default function BulkBedSettings({ id }: { id: string }) {
  const track = useTrackStore((state) => state.getTrack(id)) as BulkBedTrack | undefined;
  const editTrack = useTrackStore((state) => state.editTrack);

  if (!track) return null;

  const validateGap = (value: string) => {
    if (!value) return undefined;
    const num = Number(value);
    if (Number.isNaN(num)) return "Must be a number";
    if (num < 0) return "Gap must be at least 0";
    if (num > 20) return "Gap must be at most 20";
    return undefined;
  };

  const updateGap = (value: string) => {
    const num = Number(value);
    const gap = num < 0 ? 0 : num > 20 ? 20 : num;
    editTrack<BulkBedTrack>(id, { gap });
  };

  return (
    <>
      <Form title="Gap">
        <Value defaultValue={track.gap ?? 2} validate={validateGap} callback={updateGap} />
      </Form>
      <Form title="Datasets">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {track.datasets.map((dataset) => (
            <div key={dataset.name} style={{ fontSize: "12px", color: "#666" }}>
              {dataset.name}
            </div>
          ))}
        </div>
      </Form>
    </>
  );
}
