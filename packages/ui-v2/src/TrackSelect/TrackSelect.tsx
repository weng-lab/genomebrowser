import type { TrackStoreInstance } from "@weng-lab/genomebrowser-v2";
import { useMemo } from "react";
import type { TrackSelectTrack } from "./schema/folderSchema";
import { validateJson } from "./schema/validateJson";

type TrackSelectProps = {
  folders: unknown[];
  useTrackStore: TrackStoreInstance;
};

export default function TrackSelect({
  folders,
  useTrackStore,
}: TrackSelectProps) {
  const registry = useTrackStore((state) => state.registry);
  const addTrack = useTrackStore((state) => state.addTrack);
  const tracks = useTrackStore((state) => state.tracks);
  const parsedFolders = useMemo(
    () => folders.map((folder) => validateJson(folder, registry)),
    [folders, registry],
  );

  const onRowSelect = (row: TrackSelectTrack) => {
    const module = registry.get(row.type);
    const track = module.create(row.config);
    const result = addTrack(track);
    if (!result.ok) throw new Error(result.error);
  };

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <div style={{ width: "fit-content" }}>
        {parsedFolders.map((folder) => (
          <div key={folder.id}>
            <h1>{folder.label}</h1>
            {folder.tracks.map((entry) => {
              return (
                <div key={entry.config.id}>
                  <p>{entry.config.title}</p>
                  <button type="button" onClick={() => onRowSelect(entry)}>
                    Add track
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ width: "fit-content" }}>
        <h1>Selected Tracks</h1>
        {tracks.map((track) => (
          <div key={track.base.id} id={track.base.id}>
            {track.base.title}
          </div>
        ))}
      </div>
    </div>
  );
}
