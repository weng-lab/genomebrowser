import { useState } from "react";
import Form from "./form";
import { TranscriptConfig } from "../../tracks/transcript/types";
import { useTrackStore } from "../../../store/trackStore";
import { useBrowserStore } from "../../../store/browserStore";

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

  const handleButtonClick = (version: TranscriptHumanVersion | TranscriptMouseVersion) => {
    setSelectedButton(version);
    const human = Object.values(TranscriptHumanVersion).includes(version as TranscriptHumanVersion);
    editTrack(track.id, { version: version, assembly: human ? "GRCH38" : "mm10" });
    const domain = getExpandedDomain();
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

  const buttonStyle = (version: TranscriptHumanVersion | TranscriptMouseVersion) => ({
    backgroundColor: selectedButton === version ? track.color : "#858585",
    color: "white",
    marginRight: "5px",
    padding: "10px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  });
  const humanAssembly = track.assembly.toLowerCase() === "grch38";
  return (
    <Form>
      <div>
        <div>{humanAssembly ? "Human Assembly Version" : "Mouse Assembly Version"}</div>
        {Object.values(humanAssembly ? TranscriptHumanVersion : TranscriptMouseVersion)
          .filter((version) => !isNaN(Number(version)))
          .map((version, index) => (
            <button key={index} onClick={() => handleButtonClick(Number(version))} style={buttonStyle(Number(version))}>
              {version}
            </button>
          ))}
      </div>
    </Form>
  );
}
