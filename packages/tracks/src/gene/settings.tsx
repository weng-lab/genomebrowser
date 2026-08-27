import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { TextFieldProps } from "@mui/material/TextField";
import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { useObservedGeneTags } from "./tagCatalog";
import type { GeneConfig, GeneFeature } from "./types";

export function GeneSettings({ track, updateTrack }: TrackSettingsProps<GeneConfig, GeneFeature>) {
  const observedTags = useObservedGeneTags(track.config.url);
  const canonicalTranscriptTags = track.config.canonicalTranscriptTags;
  const tagOptions = normalizeTags([...canonicalTranscriptTags, ...observedTags]);

  return (
    <TrackSettingsLayout>
      <TrackSettingsSection title="BigGenePred">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              required
              value={track.config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
      <TrackSettingsSection title="Gene highlighting">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <TextField
                fullWidth
                label="Highlight gene"
                size="small"
                value={track.config.geneName ?? ""}
                onChange={(event) =>
                  updateTrack({ config: { geneName: event.target.value || undefined } })
                }
              />
              <TrackSettingsColorField
                label="Highlight color"
                value={track.config.highlightColor}
                onCommit={(highlightColor) => updateTrack({ config: { highlightColor } })}
              />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsFieldRow>
              <Autocomplete
                freeSolo
                multiple
                options={tagOptions}
                size="small"
                value={canonicalTranscriptTags}
                onChange={(_event, tags) =>
                  updateTrack({ config: { canonicalTranscriptTags: normalizeTags(tags) } })
                }
                renderInput={(params) => (
                  <TextField
                    {...(params as unknown as TextFieldProps)}
                    label="Canonical transcript tags"
                  />
                )}
              />
              <TrackSettingsColorField
                label="Canonical transcript color"
                value={track.config.canonicalColor}
                onCommit={(canonicalColor) => updateTrack({ config: { canonicalColor } })}
              />
            </TrackSettingsFieldRow>
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

function normalizeTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].toSorted((left, right) =>
    left.localeCompare(right),
  );
}
