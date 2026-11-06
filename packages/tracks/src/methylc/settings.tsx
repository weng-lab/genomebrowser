import { TrackBaseSettings } from "../shared/settings/trackBaseSettings";
import { TrackHeightSettings } from "../shared/settings/trackHeightSettings";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import { TrackSettingsFieldGrid } from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsRangeFields } from "../shared/settings/trackSettingsRangeFields";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import type { MethylCTooltipItem } from "./types";
import type { MethylCConfig } from "./schema";

type Strand = keyof MethylCConfig["urls"];
type Channel = keyof MethylCConfig["urls"]["plusStrand"];
type Color = keyof MethylCConfig["colors"];

const strands: ReadonlyArray<{ key: Strand; title: string; labelPrefix: string }> = [
  { key: "plusStrand", title: "Plus-strand sources", labelPrefix: "Plus-strand" },
  { key: "minusStrand", title: "Minus-strand sources", labelPrefix: "Minus-strand" },
];

const channels: ReadonlyArray<{ key: Channel; label: string }> = [
  { key: "cpg", label: "CpG" },
  { key: "chg", label: "CHG" },
  { key: "chh", label: "CHH" },
  { key: "depth", label: "Depth" },
];

const colors: ReadonlyArray<{ key: Color; label: string }> = [
  { key: "cpg", label: "CpG color" },
  { key: "chg", label: "CHG color" },
  { key: "chh", label: "CHH color" },
  { key: "depth", label: "Depth color" },
];

type MethylCSettingsProps = TrackSettingsProps<MethylCConfig, MethylCTooltipItem>;
type UpdateConfig = (
  createUpdate: (config: Readonly<MethylCConfig>) => Partial<MethylCConfig>,
) => ReturnType<MethylCSettingsProps["updateTrack"]>;

export function MethylCSettings({ track, updateTrack, ...settings }: MethylCSettingsProps) {
  const updateConfig: UpdateConfig = (createUpdate) =>
    updateTrack((current) => ({ config: createUpdate(current.config) }));

  return (
    <TrackSettingsLayout>
      <TrackBaseSettings
        track={track}
        updateTrack={updateTrack}
        displayOptions={settings.displayOptions}
      >
        <TrackHeightSettings track={track} updateTrack={updateTrack} {...settings} />
      </TrackBaseSettings>
      <SourceSettings
        config={track.config}
        disabled={track.source === "host"}
        updateConfig={updateConfig}
      />
      <ColorSettings config={track.config} updateConfig={updateConfig} />
      <RenderingSettings config={track.config} updateConfig={updateConfig} />
    </TrackSettingsLayout>
  );
}

function SourceSettings({
  config,
  disabled,
  updateConfig,
}: {
  config: Readonly<MethylCConfig>;
  disabled: boolean;
  updateConfig: UpdateConfig;
}) {
  return (
    <>
      {strands.map(({ key: strand, title, labelPrefix }) => (
        <TrackSettingsSection key={strand} title={title}>
          <TrackSettingsFieldGrid>
            {channels.map(({ key: channel, label }) => (
              <MethylCUrlField
                key={channel}
                channel={channel}
                disabled={disabled}
                label={`${labelPrefix} ${label} URL`}
                strand={strand}
                updateConfig={updateConfig}
                urls={config.urls}
              />
            ))}
          </TrackSettingsFieldGrid>
        </TrackSettingsSection>
      ))}
    </>
  );
}

function MethylCUrlField({
  channel,
  disabled,
  label,
  strand,
  updateConfig,
  urls,
}: {
  channel: Channel;
  disabled: boolean;
  label: string;
  strand: Strand;
  updateConfig: UpdateConfig;
  urls: MethylCConfig["urls"];
}) {
  return (
    <TrackSettingsUrlField
      label={label}
      disabled={disabled}
      value={urls[strand][channel].url}
      onCommit={(url) =>
        updateConfig((config) => ({
          urls: {
            ...config.urls,
            [strand]: {
              ...config.urls[strand],
              [channel]: { ...config.urls[strand][channel], url },
            },
          },
        }))
      }
    />
  );
}

function ColorSettings({
  config,
  updateConfig,
}: {
  config: Readonly<MethylCConfig>;
  updateConfig: UpdateConfig;
}) {
  return (
    <TrackSettingsSection title="Colors">
      <TrackSettingsFieldGrid>
        {colors.map(({ key, label }) => (
          <MethylCColorField
            key={key}
            color={key}
            colors={config.colors}
            label={label}
            updateConfig={updateConfig}
          />
        ))}
      </TrackSettingsFieldGrid>
    </TrackSettingsSection>
  );
}

function MethylCColorField({
  color,
  colors,
  label,
  updateConfig,
}: {
  color: Color;
  colors: MethylCConfig["colors"];
  label: string;
  updateConfig: UpdateConfig;
}) {
  return (
    <TrackSettingsColorField
      label={label}
      value={colors[color]}
      onCommit={(nextValue) =>
        updateConfig((config) => ({
          colors: { ...config.colors, [color]: nextValue },
        }))
      }
    />
  );
}

function RenderingSettings({
  config,
  updateConfig,
}: {
  config: Readonly<MethylCConfig>;
  updateConfig: UpdateConfig;
}) {
  return (
    <TrackSettingsSection title="Rendering and range">
      <TrackSettingsFieldGrid>
        <MaskCpgField maskCpgByCoverage={config.maskCpgByCoverage} updateConfig={updateConfig} />
      </TrackSettingsFieldGrid>
      <MethylCRangeFields range={config.range} updateConfig={updateConfig} />
    </TrackSettingsSection>
  );
}

function MaskCpgField({
  maskCpgByCoverage,
  updateConfig,
}: {
  maskCpgByCoverage: boolean | undefined;
  updateConfig: UpdateConfig;
}) {
  return (
    <FormControlLabel
      control={
        <Switch
          checked={maskCpgByCoverage ?? false}
          size="small"
          onChange={(event) => updateConfig(() => ({ maskCpgByCoverage: event.target.checked }))}
        />
      }
      label="Mask CpG by coverage"
      sx={{ m: 0, minWidth: 0 }}
    />
  );
}

function MethylCRangeFields({
  range,
  updateConfig,
}: {
  range: MethylCConfig["range"];
  updateConfig: UpdateConfig;
}) {
  return (
    <TrackSettingsRangeFields
      range={range}
      onCommit={(nextRange) => updateConfig(() => ({ range: nextRange }))}
    />
  );
}
