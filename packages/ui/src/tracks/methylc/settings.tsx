import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import {
  useSettingsStore,
  useTrackStore,
  useTrackStoreApi,
  type MethylCConfig,
} from "@weng-lab/genomebrowser";
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

export function MethylCSettings() {
  return (
    <TrackSettingsLayout>
      <SourceSettings />
      <ColorSettings />
      <RenderingSettings />
    </TrackSettingsLayout>
  );
}

function SourceSettings() {
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
}: {
  channel: Channel;
  label: string;
  strand: Strand;
}) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const value = useTrackStore(
    (state) =>
      (state.getTrack(trackId)?.config as MethylCConfig | undefined)?.urls[strand][channel].url ??
      "",
  );
  const trackStore = useTrackStoreApi();

  return (
    <TrackSettingsUrlField
      label={label}
      value={value}
      onCommit={(url) => {
        const state = trackStore.getState();
        const urls = (state.getTrack(trackId)!.config as MethylCConfig).urls;
        return state.updateTrack(trackId, {
          config: {
            urls: {
              ...urls,
              [strand]: {
                ...urls[strand],
                [channel]: { ...urls[strand][channel], url },
              },
            },
          },
        });
      }}
    />
  );
}

function ColorSettings() {
  return (
    <TrackSettingsSection title="Colors">
      <TrackSettingsFieldGrid>
        {colors.map(({ key, label }) => (
          <MethylCColorField key={key} color={key} label={label} />
        ))}
      </TrackSettingsFieldGrid>
    </TrackSettingsSection>
  );
}

function MethylCColorField({ color, label }: { color: Color; label: string }) {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const value = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as MethylCConfig | undefined)?.colors[color] ?? "",
  );
  const trackStore = useTrackStoreApi();

  return (
    <TrackSettingsColorField
      label={label}
      value={value}
      onCommit={(nextValue) => {
        const state = trackStore.getState();
        const currentColors = (state.getTrack(trackId)!.config as MethylCConfig).colors;
        return state.updateTrack(trackId, {
          config: { colors: { ...currentColors, [color]: nextValue } },
        });
      }}
    />
  );
}

function RenderingSettings() {
  return (
    <TrackSettingsSection title="Rendering and range">
      <TrackSettingsFieldGrid>
        <MaskCpgField />
      </TrackSettingsFieldGrid>
      <MethylCRangeFields />
    </TrackSettingsSection>
  );
}

function MaskCpgField() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const maskCpgByCoverage = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as MethylCConfig | undefined)?.maskCpgByCoverage,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  return (
    <FormControlLabel
      control={
        <Switch
          checked={maskCpgByCoverage ?? false}
          size="small"
          onChange={(event) =>
            updateTrack(trackId, { config: { maskCpgByCoverage: event.target.checked } })
          }
        />
      }
      label="Mask CpG by coverage"
      sx={{ m: 0, minWidth: 0 }}
    />
  );
}

function MethylCRangeFields() {
  const trackId = useSettingsStore((state) => state.trackId)!;
  const min = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as MethylCConfig | undefined)?.range?.min,
  );
  const max = useTrackStore(
    (state) => (state.getTrack(trackId)?.config as MethylCConfig | undefined)?.range?.max,
  );
  const updateTrack = useTrackStore((state) => state.updateTrack);
  const range = min === undefined || max === undefined ? undefined : { min, max };
  return (
    <TrackSettingsRangeFields
      range={range}
      onCommit={(nextRange) => updateTrack(trackId, { config: { range: nextRange } })}
    />
  );
}
