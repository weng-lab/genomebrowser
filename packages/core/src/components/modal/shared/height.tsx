import { useRef, useState, useEffect } from "react";
import { useTrackStore } from "../../../store/BrowserContext";
import { TrackType } from "../../tracks/types";
import { getButtonColors } from "../helpers";
import Form from "./form";

export default function Height({ id, defaultHeight }: { id: string; defaultHeight: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editTrack = useTrackStore((state) => state.editTrack);
  const editAllTracksByType = useTrackStore((state) => state.editAllTracksByType);
  const getTrack = useTrackStore((state) => state.getTrack);
  const tracks = useTrackStore((state) => state.tracks);
  const MIN_HEIGHT = 20;
  const MAX_HEIGHT = 300;

  const track = getTrack(id);
  const trackType = track?.trackType;
  const color = track?.color;

  const callback = (value: string) => {
    const height = Number(value) < MIN_HEIGHT ? MIN_HEIGHT : Number(value) > MAX_HEIGHT ? MAX_HEIGHT : Number(value);
    editTrack(id, { height: height });
  };

  const validate = (value: string) => {
    if (!value) return undefined;
    if (value === "") return undefined;
    const num = Number(value);
    if (isNaN(num)) return "Must be a number";
    if (num < MIN_HEIGHT) return `Height must be at least ${MIN_HEIGHT}`;
    if (num > MAX_HEIGHT) return `Height must be at most ${MAX_HEIGHT}`;
    return undefined;
  };

  const changeAllSimilarTracks = () => {
    if (!trackType || !inputRef.current) return;
    const value = inputRef.current.value || String(defaultHeight);
    const height = Number(value) < MIN_HEIGHT ? MIN_HEIGHT : Number(value) > MAX_HEIGHT ? MAX_HEIGHT : Number(value);
    editAllTracksByType(trackType, { height: height });
  };

  // Count tracks of the same type
  const sameTypeTracksCount = trackType ? tracks.filter((t) => t.trackType === trackType).length : 0;
  const showBulkButton = sameTypeTracksCount > 1;

  const getTrackTypeLabel = (trackType: TrackType): string => {
    switch (trackType) {
      case TrackType.BigWig:
        return "BigWig";
      case TrackType.BigBed:
        return "BigBed";
      case TrackType.Transcript:
        return "Transcript";
      case TrackType.Motif:
        return "Motif";
      case TrackType.Importance:
        return "Importance";
      case TrackType.LDTrack:
        return "LDTrack";
      case TrackType.BulkBed:
        return "BulkBed";
      case TrackType.MethylC:
        return "MethylC";
      default:
        return trackType;
    }
  };

  const buttonStyle = () => {
    const trackColor = color || "#000000";
    const colors = getButtonColors(trackColor, true);

    return {
      ...colors,
      padding: "10px",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      whiteSpace: "nowrap" as const,
    };
  };

  return (
    <Form title="Height">
      <div style={{ display: "flex", flexDirection: "row", gap: "5px", alignItems: "flex-start" }}>
        <ValueWithRef inputRef={inputRef} defaultValue={defaultHeight} validate={validate} callback={callback} />
        {showBulkButton && trackType && (
          <button
            style={buttonStyle()}
            onClick={changeAllSimilarTracks}
            title={`Change height for all ${sameTypeTracksCount} ${getTrackTypeLabel(trackType)} tracks`}
          >
            Change all {getTrackTypeLabel(trackType)} tracks
          </button>
        )}
      </div>
    </Form>
  );
}

function ValueWithRef({
  inputRef,
  defaultValue,
  validate,
  callback,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  defaultValue: number;
  validate: (value: string) => string | undefined;
  callback: (value: string) => void;
}) {
  const [value, setValue] = useState<string>(String(defaultValue));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  useEffect(() => {
    if (value === String(defaultValue)) return;
    const newValue = value ? value : String(defaultValue);
    const delay = value ? 500 : 2000;
    const timeout = setTimeout(() => {
      const message = validate(value);
      if (!message) callback(newValue);
      if (inputRef.current) {
        inputRef.current.setCustomValidity(message || "");
        inputRef.current.reportValidity();
      }
    }, delay);
    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="number"
      step="any"
      placeholder={formatValue(Number(defaultValue))}
      onChange={handleChange}
      style={{ appearance: "textfield" }}
    />
  );
}

function formatValue(num: number) {
  if (Number.isNaN(num)) return "";
  if (Number.isInteger(num)) return num.toString();
  return Number(num.toFixed(2)).toString();
}
