import { useTrackStore } from "../../../store/trackStore";
import { trackComponents } from "../../tracks/displayTrack";
import { TrackType } from "../../tracks/types";
import { DisplayMode as Options } from "../../tracks/types";
import { getTextColor } from "../modal";
import Form from "./form";

export default function Display({ id, trackType }: { id: string; trackType: TrackType }) {
  const items = trackComponents[trackType];
  const options = Object.keys(items) as Options[];
  const track = useTrackStore((state) => state.getTrack(id));
  const currentMode = track?.displayMode;
  const color = track?.color;
  const editTrack = useTrackStore((state) => state.editTrack);

  const buttonStyle = (selected: boolean) => ({
    backgroundColor: selected ? color : "#aaaaaa",
    color: getTextColor(selected ? color || "#000000" : "#aaaaaa"),
    marginRight: "5px",
    padding: "10px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  });

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
