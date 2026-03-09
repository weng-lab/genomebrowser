import { getButtonColors } from "../../modal/helpers";
import Form from "../../modal/shared/form";
import { useTrackStore } from "../../../store/BrowserContext";
import type { TranscriptTrack } from "./definition";

const HUMAN_VERSIONS = [29, 40, 47] as const;
const MOUSE_VERSIONS = [21, 25] as const;

export default function TranscriptSettings({ id }: { id: string }) {
  const track = useTrackStore((state) => state.getTrack(id)) as TranscriptTrack | undefined;
  const editTrack = useTrackStore((state) => state.editTrack);

  if (!track) return null;

  const isHumanAssembly = track.assembly.toLowerCase() === "grch38";
  const versions = isHumanAssembly ? HUMAN_VERSIONS : MOUSE_VERSIONS;
  const assembly = isHumanAssembly ? "GRCh38" : "mm10";
  const trackColor = track.color || "#000000";

  return (
    <>
      <Form title={isHumanAssembly ? "Human Assembly Version" : "Mouse Assembly Version"}>
        <div style={{ display: "flex", flexDirection: "row", gap: "5px" }}>
          {versions.map((version) => {
            const colors = getButtonColors(trackColor, track.version === version);
            return (
              <button
                key={version}
                onClick={() => editTrack<TranscriptTrack>(id, { version, assembly })}
                style={{
                  ...colors,
                  marginRight: "5px",
                  padding: "10px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                {version}
              </button>
            );
          })}
        </div>
      </Form>
      <Form title="Highlight Gene">
        <input
          value={track.geneName ?? ""}
          onChange={(e) => editTrack<TranscriptTrack>(id, { geneName: e.target.value })}
          className="w-full"
        />
      </Form>
    </>
  );
}
