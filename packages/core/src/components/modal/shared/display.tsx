import { useTrackStore } from "../../../store/BrowserContext";
import { trackComponents } from "../../tracks/displayTrack";
import { TrackType } from "../../tracks/types";
import { DisplayMode as Options } from "../../tracks/types";
import { CustomTrackConfig } from "../../tracks/custom/types";
import { getButtonColors } from "../helpers";
import Form from "./form";

export default function Display({ id, trackType }: { id: string; trackType: TrackType }) {
  const track = useTrackStore((state) => state.getTrack(id));
  const items =
    trackType === TrackType.Custom && track ? (track as CustomTrackConfig).renderers : trackComponents[trackType];
  const options = Object.keys(items) as Options[];
  const currentMode = track?.displayMode;
  const color = track?.color;
  const editTrack = useTrackStore((state) => state.editTrack);

  const buttonStyle = (selected: boolean) => {
    const trackColor = color || "#000000";
    const colors = getButtonColors(trackColor, selected);

    return {
      ...colors,
      marginRight: "5px",
      padding: "10px",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
    };
  };

  const handleButtonClick = (option: Options) => {
    editTrack(id, { displayMode: option });
  };

  if (!track) return null;

  return (
    <Form title="Display Mode">
      <div style={{ display: "flex", flexDirection: "row", gap: "5px" }}>
        {options.map((option) => (
          <button key={option} onClick={() => handleButtonClick(option)} style={buttonStyle(option === currentMode)}>
            {option}
          </button>
        ))}
      </div>
    </Form>
  );
}
