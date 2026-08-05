import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import type { MethylCConfig, TrackSettingsProps } from "@weng-lab/genomebrowser";
import { useEffect, useRef } from "react";
import { DraftRangeFields } from "../../TrackSettings/draftRangeFields";
import { TrackSettingsFieldGrid } from "../../TrackSettings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../../TrackSettings/trackSettingsLayout";
import { TrackSettingsSection } from "../../TrackSettings/trackSettingsSection";
import { TrackSourceUrlField } from "../../TrackSettings/trackSourceUrlField";

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

export function MethylCSettings({ config, updateConfig }: TrackSettingsProps<MethylCConfig>) {
  const committedConfigRef = useRef(config);
  useEffect(() => {
    committedConfigRef.current = config;
  }, [config]);

  const applyConfig = (partial: Partial<MethylCConfig>) => {
    const result = updateConfig(partial);
    if (result.ok) {
      committedConfigRef.current = { ...committedConfigRef.current, ...partial };
    }
    return result;
  };

  const updateUrl = (strand: Strand, channel: Channel, url: string) => {
    const currentConfig = committedConfigRef.current;
    return applyConfig({
      urls: {
        ...currentConfig.urls,
        [strand]: {
          ...currentConfig.urls[strand],
          [channel]: {
            ...currentConfig.urls[strand][channel],
            url,
          },
        },
      },
    });
  };

  const updateColor = (color: Color, value: string) => {
    const currentConfig = committedConfigRef.current;
    return applyConfig({
      colors: {
        ...currentConfig.colors,
        [color]: value,
      },
    });
  };

  return (
    <TrackSettingsLayout>
      {strands.map(({ key, title, labelPrefix }) => (
        <TrackSettingsSection key={key} title={title}>
          <TrackSettingsFieldGrid>
            {channels.map(({ key: channel, label }) => (
              <TrackSourceUrlField
                key={channel}
                label={`${labelPrefix} ${label} URL`}
                value={config.urls[key][channel].url}
                onCommit={(url) => updateUrl(key, channel, url)}
              />
            ))}
          </TrackSettingsFieldGrid>
        </TrackSettingsSection>
      ))}

      <TrackSettingsSection title="Colors">
        <TrackSettingsFieldGrid>
          {colors.map(({ key, label }) => (
            <TextField
              key={key}
              fullWidth
              label={label}
              placeholder="#000000"
              size="small"
              value={config.colors[key]}
              onChange={(event) => updateColor(key, event.target.value)}
            />
          ))}
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>

      <TrackSettingsSection title="Rendering and range">
        <TrackSettingsFieldGrid>
          <FormControlLabel
            control={
              <Switch
                checked={config.maskCpgByCoverage ?? false}
                size="small"
                onChange={(event) => applyConfig({ maskCpgByCoverage: event.target.checked })}
              />
            }
            label="Mask CpG by coverage"
            sx={{ m: 0, minWidth: 0 }}
          />
        </TrackSettingsFieldGrid>
        <DraftRangeFields range={config.range} onCommit={(range) => applyConfig({ range })} />
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}
