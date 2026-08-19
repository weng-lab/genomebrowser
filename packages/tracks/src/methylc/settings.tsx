import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../settings/trackSettingsColorField";
import { TrackSettingsFieldGrid } from "../settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../settings/trackSettingsLayout";
import { TrackSettingsRangeFields } from "../settings/trackSettingsRangeFields";
import { TrackSettingsSection } from "../settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../settings/trackSettingsUrlField";
import { useRef, useState } from "react";
import type { MethylCConfig, MethylCTooltipItem } from "./types";

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
type ConfigEditorState = {
  // This version prevents stale accepted edits replaying after controlled config changes A -> B -> A.
  baselineVersion: number;
  acceptedUpdates: Partial<MethylCConfig>[];
  baseConfig: Readonly<MethylCConfig>;
};

export function MethylCSettings({ track, updateTrack }: MethylCSettingsProps) {
  const [configEditor, setConfigEditor] = useState(() => createConfigEditorState(track.config));
  const latestConfigEditor = useRef(configEditor);
  const renderedConfigEditor = reconcileConfigEditorState(configEditor, track.config);
  if (renderedConfigEditor !== configEditor) {
    setConfigEditor(renderedConfigEditor);
  }

  const currentConfig = applyConfigUpdates(
    renderedConfigEditor.baseConfig,
    renderedConfigEditor.acceptedUpdates,
  );

  const updateConfig: UpdateConfig = (createUpdate) => {
    const currentConfigEditor = getCommittableConfigEditorState(
      latestConfigEditor.current,
      renderedConfigEditor,
    );
    const currentConfig = applyConfigUpdates(
      currentConfigEditor.baseConfig,
      currentConfigEditor.acceptedUpdates,
    );
    const configUpdate = createUpdate(currentConfig);
    const result = updateTrack({ config: configUpdate });
    if (result.ok) {
      const nextConfigEditor = {
        baselineVersion: currentConfigEditor.baselineVersion,
        baseConfig: currentConfigEditor.baseConfig,
        acceptedUpdates: [...currentConfigEditor.acceptedUpdates, configUpdate],
      } satisfies ConfigEditorState;
      // Compose accepted edits even when React batches multiple input commits.
      latestConfigEditor.current = nextConfigEditor;
      setConfigEditor(nextConfigEditor);
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

function createConfigEditorState(config: Readonly<MethylCConfig>): ConfigEditorState {
  return { baselineVersion: 0, acceptedUpdates: [], baseConfig: config };
}

function reconcileConfigEditorState(
  state: ConfigEditorState,
  config: Readonly<MethylCConfig>,
): ConfigEditorState {
  if (state.baseConfig === config) return state;

  return {
    baselineVersion: state.baselineVersion + 1,
    acceptedUpdates: [],
    baseConfig: config,
  };
}

function getCommittableConfigEditorState(
  latestState: ConfigEditorState,
  renderedState: ConfigEditorState,
) {
  return latestState.baselineVersion === renderedState.baselineVersion
    ? latestState
    : renderedState;
}

function applyConfigUpdates(
  config: Readonly<MethylCConfig>,
  updates: Partial<MethylCConfig>[],
): MethylCConfig {
  const currentConfig: MethylCConfig = { ...config };
  for (const update of updates) Object.assign(currentConfig, update);
  return currentConfig;
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
