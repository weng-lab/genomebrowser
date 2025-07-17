import { useState } from "react";
import Form from "../shared/form";
import { TranscriptConfig } from "../../tracks/transcript/types";
import { getTextColor } from "../modal";
import { useBrowserStore, useTrackStore } from "../../../store/BrowserContext";

export enum TranscriptHumanVersion {
  V29 = 29,
  V40 = 40,
  V47 = 47,
}
export enum TranscriptMouseVersion {
  V21 = 21,
  V25 = 25,
}

export default function TranscriptForm({ track }: { track: TranscriptConfig }) {
  const editTrack = useTrackStore((state) => state.editTrack);
  const [selectedButton, setSelectedButton] = useState<number | null>(track.version);
  const getExpandedDomain = useBrowserStore((state) => state.getExpandedDomain);
  const domain = getExpandedDomain();

  const handleButtonClick = (version: TranscriptHumanVersion | TranscriptMouseVersion) => {
    setSelectedButton(version);
    const human = Object.values(TranscriptHumanVersion).includes(version as TranscriptHumanVersion);
    editTrack(track.id, { version: version, assembly: human ? "GRCH38" : "mm10" });
    if (!track.refetch) return;
    track.refetch({
      variables: {
        assembly: track.assembly,
        chromosome: domain.chromosome,
        start: domain.start,
        end: domain.end,
        version: version,
      },
    });
  };

  const buttonStyle = (selected: boolean) => ({
    backgroundColor: selected ? track.color : "#aaaaaa",
    color: getTextColor(selected ? track.color || "#000000" : "#aaaaaa"),
    marginRight: "5px",
    padding: "10px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  });

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
