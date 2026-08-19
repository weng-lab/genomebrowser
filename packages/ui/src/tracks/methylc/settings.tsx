import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type {
  MethylCConfig,
  MethylCTooltipItem,
  TrackSettingsProps,
} from "@weng-lab/genomebrowser";
import { useState } from "react";
import { flushSync } from "react-dom";
import { TrackSettingsColorField } from "../../TrackSettings/trackSettingsColorField";
import { TrackSettingsFieldGrid } from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../TrackSettings/trackSettingsLayout";
import { TrackSettingsRangeFields } from "../../TrackSettings/trackSettingsRangeFields";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";
import { TrackSettingsUrlField } from "../../TrackSettings/trackSettingsUrlField";

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
type PendingConfigUpdates = {
  source: Readonly<MethylCConfig>;
  updates: Partial<MethylCConfig>[];
};

export function MethylCSettings({ track, updateTrack }: MethylCSettingsProps) {
  const [pendingUpdates, setPendingUpdates] = useState<PendingConfigUpdates>();
  const activeUpdates = pendingUpdates?.source === track.config ? pendingUpdates.updates : [];
  const currentConfig = applyConfigUpdates(track.config, activeUpdates);

  const updateConfig: UpdateConfig = (createUpdate) => {
    const configUpdate = createUpdate(currentConfig);
    const result = updateTrack({ config: configUpdate });
    if (result.ok) {
      flushSync(() => {
        setPendingUpdates({ source: track.config, updates: [...activeUpdates, configUpdate] });
      });
    }
    return result;
  };

  return (
    <TrackSettingsLayout>
      <SourceSettings config={currentConfig} updateConfig={updateConfig} />
      <ColorSettings config={currentConfig} updateConfig={updateConfig} />
      <RenderingSettings config={currentConfig} updateConfig={updateConfig} />
    </TrackSettingsLayout>
  );
}

function applyConfigUpdates(
  config: Readonly<MethylCConfig>,
  updates: Partial<MethylCConfig>[],
): MethylCConfig {
  return updates.reduce<MethylCConfig>((current, update) => ({ ...current, ...update }), {
    ...config,
  });
}

function SourceSettings({
  config,
  updateConfig,
}: {
  config: Readonly<MethylCConfig>;
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
  label,
  strand,
  updateConfig,
  urls,
}: {
  channel: Channel;
  label: string;
  strand: Strand;
  updateConfig: UpdateConfig;
  urls: MethylCConfig["urls"];
}) {
  return (
    <TrackSettingsUrlField
      label={label}
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
