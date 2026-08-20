import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useRegistry, useSettingsStore, useTrackStore } from "@weng-lab/genomebrowser";
import { useState } from "react";
import {
  isRowLayoutConfig,
  minimumRowHeight,
  rowCountFromTrackHeight,
  rowHeightFromTrackHeight,
  trackHeightFromRowCount,
} from "../layout/rowLayout";
import { TrackSettingsColorField } from "./trackSettingsColorField";
import { TrackSettingsNumberField } from "./trackSettingsNumberField";
import { TrackSettingsTextField } from "./trackSettingsTextField";
import { TrackSettingsFieldRow } from "./trackSettingsFieldGrid";
import { TrackSettingsLayout } from "./trackSettingsLayout";
import { TrackSettingsSection } from "./trackSettingsSection";

export function TrackBaseSettings() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const track = useTrackStore((state) => state.getTrack(trackId));
  const trackType = track?.type;
  const hasRowLayout = isRowLayoutConfig(track?.config);
  const registry = useRegistry();
  const displayOptions = trackType ? Object.keys(registry.get(trackType).render) : [];

  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="Track base settings">
        <TrackSettingsFieldRow>
          <TitleField />
          <ColorField />
        </TrackSettingsFieldRow>

        {hasRowLayout ? (
          <>
            {displayOptions.length > 1 ? (
              <TrackSettingsFieldRow>
                <DisplayField displayOptions={displayOptions} />
              </TrackSettingsFieldRow>
            ) : null}
            <TrackSettingsFieldRow>
              <RowLayoutFields />
            </TrackSettingsFieldRow>
          </>
        ) : (
          <TrackSettingsFieldRow>
            {displayOptions.length > 1 ? <DisplayField displayOptions={displayOptions} /> : null}
            <HeightField />
          </TrackSettingsFieldRow>
        )}
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

function TitleField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const title = useTrackStore((state) => state.getTrack(trackId)?.base.title ?? "");
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <TrackSettingsTextField
      label="Title"
      required
      value={title}
      validate={(nextTitle) => (nextTitle.trim() === "" ? "Enter a title." : undefined)}
      onCommit={(nextTitle) => updateTrack(trackId, { base: { title: nextTitle } })}
    />
  );
}

function ColorField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const color = useTrackStore((state) => state.getTrack(trackId)?.base.color ?? "");
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <TrackSettingsColorField
      label="Color"
      value={color}
      onCommit={(nextColor) => updateTrack(trackId, { base: { color: nextColor } })}
    />
  );
}

function DisplayField({ displayOptions }: { displayOptions: readonly string[] }) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const display = useTrackStore((state) => state.getTrack(trackId)?.base.display ?? "");
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const [error, setError] = useState<string>();

  return (
    <TextField
      select
      error={error !== undefined}
      fullWidth
      helperText={error}
      label="Display mode"
      size="small"
      value={display}
      onChange={(event) => {
        const result = updateTrack(trackId, { base: { display: event.target.value } });
        setError(result.ok ? undefined : result.error);
      }}
    >
      {displayOptions.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}

function HeightField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const height = useTrackStore((state) => state.getTrack(trackId)?.base.height ?? 20);
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <TrackSettingsNumberField
      label="Height"
      min={20}
      required
      value={height}
      validate={(nextHeight) => (nextHeight >= 20 ? undefined : "Enter a height of at least 20.")}
      onCommit={(nextHeight) => updateTrack(trackId, { base: { height: nextHeight } })}
    />
  );
}

function RowLayoutFields() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const track = useTrackStore((state) => state.getTrack(trackId));
  const updateTrack = useTrackStore((state) => state.updateTrack);
  if (!track || !isRowLayoutConfig(track.config)) return null;

  const height = track.base.height;
  const rowHeight = track.config.rowHeight;
  const rowCount = rowCountFromTrackHeight(height, rowHeight);
  const minimumTrackHeight = trackHeightFromRowCount(rowCount, minimumRowHeight);

  return (
    <>
      <TrackSettingsNumberField
        label="Height"
        min={minimumTrackHeight}
        required
        value={height}
        validate={(nextHeight) =>
          nextHeight >= minimumTrackHeight
            ? undefined
            : `Enter a height of at least ${minimumTrackHeight}.`
        }
        onCommit={(nextHeight) =>
          updateTrack(trackId, {
            base: { height: nextHeight },
            config: { rowHeight: rowHeightFromTrackHeight(nextHeight, rowCount) },
          })
        }
      />
      <TrackSettingsNumberField
        label="Row height"
        min={minimumRowHeight}
        required
        value={rowHeight}
        validate={(nextRowHeight) =>
          nextRowHeight >= minimumRowHeight
            ? undefined
            : `Enter a row height of at least ${minimumRowHeight}.`
        }
        onCommit={(nextRowHeight) =>
          updateTrack(trackId, {
            base: { height: trackHeightFromRowCount(rowCount, nextRowHeight) },
            config: { rowHeight: nextRowHeight },
          })
        }
      />
    </>
  );
}
