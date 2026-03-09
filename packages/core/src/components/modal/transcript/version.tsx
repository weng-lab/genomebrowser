import { useState } from "react";
import Form from "../shared/form";
import { getButtonColors } from "../helpers";
import { useTrackStore } from "../../../store/BrowserContext";
import type { TranscriptTrack } from "../../tracks/transcript/definition";

export enum TranscriptHumanVersion {
  V29 = 29,
  V40 = 40,
  V47 = 47,
}
export enum TranscriptMouseVersion {
  V21 = 21,
  V25 = 25,
}

export default function TranscriptForm({ track }: { track: TranscriptTrack }) {
  const editTrack = useTrackStore((state) => state.editTrack);
  const [selectedButton, setSelectedButton] = useState<number | null>(track.version);

  const handleButtonClick = (version: TranscriptHumanVersion | TranscriptMouseVersion) => {
    setSelectedButton(version);
    const human = Object.values(TranscriptHumanVersion).includes(version as TranscriptHumanVersion);
    editTrack<TranscriptTrack>(track.id, { version: version, assembly: human ? "GRCh38" : "mm10" });
  };

  const buttonStyle = (selected: boolean) => {
    const trackColor = track.color || "#000000";
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

  const humanAssembly = track.assembly.toLowerCase() === "grch38";
  return (
    <Form title={humanAssembly ? "Human Assembly Version" : "Mouse Assembly Version"}>
      <div style={{ display: "flex", flexDirection: "row", gap: "5px" }}>
        {Object.values(humanAssembly ? TranscriptHumanVersion : TranscriptMouseVersion)
          .filter((version) => !isNaN(Number(version)))
          .map((version, index) => (
            <button
              key={index}
              onClick={() => handleButtonClick(Number(version))}
              style={buttonStyle(selectedButton === Number(version))}
            >
              {version}
            </button>
          ))}
      </div>
    </Form>
  );
}
