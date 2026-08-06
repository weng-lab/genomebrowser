import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useSettingsStore, useTrackStore, type BigWigConfig } from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../../TrackSettings/trackSettingsColorField";
import { TrackSettingsRangeFields } from "../../TrackSettings/trackSettingsRangeFields";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../TrackSettings/trackSettingsLayout";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";
import { TrackSettingsUrlField } from "../../TrackSettings/trackSettingsUrlField";

export function BigWigSettings() {
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigWig source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <UrlField />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>

      <YRangeSettings />

      <TrackSettingsSection title="Rendering">
        <TrackSettingsFieldGrid>
          <FillWithZeroField />
          <TrackSettingsFullRow>
            <Box sx={{ borderLeft: 2, borderColor: "divider", pl: 1 }}>
              <TrackSettingsFieldRow>
                <ShowClampIndicatorsField />
                <ClampIndicatorColorField />
              </TrackSettingsFieldRow>
            </Box>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

function UrlField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const url = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.url ?? "",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <TrackSettingsUrlField
      required
      value={url}
      onCommit={(nextUrl) => updateTrack(trackId, { config: { url: nextUrl } })}
    />
  );
}

function YRangeSettings() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const min = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.yRange?.min,
  );
  const max = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.yRange?.max,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const yRange = min === undefined && max === undefined ? undefined : { min, max };

  return (
    <TrackSettingsSection title="Y-axis range">
      <TrackSettingsRangeFields
        mode="independent"
        range={yRange}
        onCommit={(nextRange) => updateTrack(trackId, { config: { yRange: nextRange } })}
      />
    </TrackSettingsSection>
  );
}

function FillWithZeroField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const fillWithZero = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.fillWithZero,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <FormControlLabel
      control={
        <Switch
          checked={fillWithZero ?? false}
          size="small"
          onChange={(event) =>
            updateTrack(trackId, { config: { fillWithZero: event.target.checked } })
          }
        />
      }
      label="Fill missing values with zero"
      sx={{ m: 0, minWidth: 0 }}
    />
  );
}

function ShowClampIndicatorsField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const showClampIndicators = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.showClampIndicators,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <FormControlLabel
      control={
        <Switch
          checked={showClampIndicators ?? true}
          size="small"
          onChange={(event) =>
            updateTrack(trackId, { config: { showClampIndicators: event.target.checked } })
          }
        />
      }
      label="Show clamp indicators"
      sx={{ m: 0, minWidth: 0 }}
    />
  );
}

function ClampIndicatorColorField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const showClampIndicators = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.showClampIndicators,
  );
  const clampIndicatorColor = useTrackStore(
    (state) =>
      (state.getTrack(trackId)?.config as BigWigConfig | undefined)?.clampIndicatorColor ?? "",
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <TrackSettingsColorField
      disabled={!(showClampIndicators ?? true)}
      label="Clamp indicator color"
      value={clampIndicatorColor}
      onCommit={(color) => updateTrack(trackId, { config: { clampIndicatorColor: color } })}
    />
  );
}
