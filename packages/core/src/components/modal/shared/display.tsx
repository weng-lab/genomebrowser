import { useTrackStore } from "../../../store/BrowserContext";
import { getButtonColors } from "../helpers";
import Form from "./form";

export default function Display({ id }: { id: string }) {
  const track = useTrackStore((state) => state.getTrack(id));
  const editTrack = useTrackStore((state) => state.editTrack);

  if (!track) return null;

  const options = Object.keys(track.definition.renderers);
  const currentMode = track.displayMode;
  const color = track.color;

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

  const handleButtonClick = (option: string) => {
    editTrack(id, { displayMode: option });
  };

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
