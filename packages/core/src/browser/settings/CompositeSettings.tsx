import { useState } from "react";
import type { TrackSettingsProps } from "../../modules/types";
import { useGenomeBrowser, useRegistry, useTrackMutationGate } from "../state/browserContextState";
import { BoundModuleSettings } from "./BoundModuleSettings";

export function CompositeSettings({
  track,
  updateTrack,
  displayOptions,
}: TrackSettingsProps<{ gap: number; opacity: number }>) {
  const { useTrackStore } = useGenomeBrowser();
  const parent = useTrackStore((state) => state.getTrack(track.base.id));
  const registry = useRegistry();
  const { runTrackMutation } = useTrackMutationGate();
  const [selectedId, setSelectedId] = useState("");
  const children = parent?.tracks ?? [];
  const selected = children.find((child) => child.base.id === selectedId) ?? children[0];
  const module = selected ? registry.get(selected.type) : undefined;
  const [error, setError] = useState("");
  const mutate = (operation: () => ReturnType<typeof updateTrack>) => {
    const result = runTrackMutation(operation);
    setError(result.ok ? "" : result.error);
  };
  return (
    <>
      <label>
        Title{" "}
        <input
          value={track.base.title}
          onChange={(event) => mutate(() => updateTrack({ base: { title: event.target.value } }))}
        />
      </label>
      <label>
        Color{" "}
        <input
          type="color"
          value={track.base.color}
          onChange={(event) => mutate(() => updateTrack({ base: { color: event.target.value } }))}
        />
      </label>
      <label>
        Layout{" "}
        <select
          value={track.base.display}
          onChange={(event) => mutate(() => updateTrack({ base: { display: event.target.value } }))}
        >
          {displayOptions.map((display) => (
            <option key={display}>{display}</option>
          ))}
        </select>
      </label>
      <label>
        Overlay height{" "}
        <input
          type="number"
          min={1}
          value={track.base.height}
          onChange={(event) =>
            mutate(() => updateTrack({ base: { height: Number(event.target.value) } }))
          }
        />
      </label>
      <label>
        Gap{" "}
        <input
          type="number"
          min={0}
          value={track.config.gap}
          onChange={(event) =>
            mutate(() => updateTrack({ config: { gap: Number(event.target.value) } }))
          }
        />
      </label>
      <label>
        Opacity{" "}
        <input
          type="number"
          min={0}
          max={1}
          step={0.1}
          value={track.config.opacity}
          onChange={(event) =>
            mutate(() => updateTrack({ config: { opacity: Number(event.target.value) } }))
          }
        />
      </label>
      <label>
        Child track{" "}
        <select
          value={selected?.base.id ?? ""}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {children.map((child) => (
            <option key={child.base.id} value={child.base.id}>
              {child.base.title}
            </option>
          ))}
        </select>
      </label>
      <fieldset disabled={track.source === "host"} style={{ border: 0, padding: 0 }}>
        <button
          type="button"
          disabled={!selected}
          onClick={() =>
            selected &&
            mutate(() => useTrackStore.getState().extractTracks(track.base.id, [selected.base.id]))
          }
        >
          Extract child track
        </button>
        <button
          type="button"
          onClick={() => mutate(() => useTrackStore.getState().ungroupTrack(track.base.id))}
        >
          Ungroup tracks
        </button>
        <button
          type="button"
          disabled={!selected || children[0] === selected}
          onClick={() => {
            if (!selected) return;
            const ids = children.map((child) => child.base.id);
            const index = ids.indexOf(selected.base.id);
            [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
            mutate(() => useTrackStore.getState().reorderChildren(track.base.id, ids));
          }}
        >
          Move child earlier
        </button>
      </fieldset>
      {error && <div role="alert">{error}</div>}
      {selected && module?.settingsComponent ? (
        <BoundModuleSettings
          key={selected.base.id}
          trackId={selected.base.id}
          component={module.settingsComponent}
          displayOptions={module.kind === "track" ? Object.keys(module.render) : module.displays}
        />
      ) : (
        <div>No child settings available</div>
      )}
    </>
  );
}
