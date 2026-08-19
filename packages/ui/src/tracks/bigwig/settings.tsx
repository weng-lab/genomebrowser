import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type {
  BigWigConfig,
  RenderedBigWigPoint,
  TrackSettingsProps,
} from "@weng-lab/genomebrowser";
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

type BigWigSettingsProps = TrackSettingsProps<BigWigConfig, RenderedBigWigPoint>;

export function BigWigSettings({ track, updateTrack }: BigWigSettingsProps) {
  const { config } = track;
  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigWig source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <UrlField updateTrack={updateTrack} url={config.url} />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>

      <YRangeSettings updateTrack={updateTrack} yRange={config.yRange} />

      <TrackSettingsSection title="Rendering">
        <TrackSettingsFieldGrid>
          <FillWithZeroField fillWithZero={config.fillWithZero} updateTrack={updateTrack} />
          <TrackSettingsFullRow>
            <Box sx={{ borderLeft: 2, borderColor: "divider", pl: 1 }}>
              <TrackSettingsFieldRow>
                <ShowClampIndicatorsField
                  showClampIndicators={config.showClampIndicators}
                  updateTrack={updateTrack}
                />
                <ClampIndicatorColorField
                  clampIndicatorColor={config.clampIndicatorColor}
                  showClampIndicators={config.showClampIndicators}
                  updateTrack={updateTrack}
                />
              </TrackSettingsFieldRow>
            </Box>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

function UrlField({
  updateTrack,
  url,
}: {
  updateTrack: BigWigSettingsProps["updateTrack"];
  url: string;
}) {
  return (
    <TrackSettingsUrlField
      required
      value={url}
      onCommit={(nextUrl) => updateTrack({ config: { url: nextUrl } })}
    />
  );
}

function YRangeSettings({
  updateTrack,
  yRange,
}: {
  updateTrack: BigWigSettingsProps["updateTrack"];
  yRange: BigWigConfig["yRange"];
}) {
  return (
    <TrackSettingsSection title="Y-axis range">
      <TrackSettingsRangeFields
        mode="independent"
        range={yRange}
        onCommit={(nextRange) => updateTrack({ config: { yRange: nextRange } })}
      />
    </TrackSettingsSection>
  );
}

function FillWithZeroField({
  fillWithZero,
  updateTrack,
}: {
  fillWithZero: boolean;
  updateTrack: BigWigSettingsProps["updateTrack"];
}) {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={fillWithZero ?? false}
          size="small"
          onChange={(event) => updateTrack({ config: { fillWithZero: event.target.checked } })}
        />
      }
      label="Fill missing values with zero"
      sx={{ m: 0, minWidth: 0 }}
    />
  );
}

function ShowClampIndicatorsField({
  showClampIndicators,
  updateTrack,
}: {
  showClampIndicators: boolean;
  updateTrack: BigWigSettingsProps["updateTrack"];
}) {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={showClampIndicators ?? true}
          size="small"
          onChange={(event) =>
            updateTrack({ config: { showClampIndicators: event.target.checked } })
          }
        />
      }
      label="Show clamp indicators"
      sx={{ m: 0, minWidth: 0 }}
    />
  );
}

function ClampIndicatorColorField({
  clampIndicatorColor,
  showClampIndicators,
  updateTrack,
}: {
  clampIndicatorColor: string;
  showClampIndicators: boolean;
  updateTrack: BigWigSettingsProps["updateTrack"];
}) {
  return (
    <TrackSettingsColorField
      disabled={!(showClampIndicators ?? true)}
      label="Clamp indicator color"
      value={clampIndicatorColor}
      onCommit={(color) => updateTrack({ config: { clampIndicatorColor: color } })}
    />
  );
}
