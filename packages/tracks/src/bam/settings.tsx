import { BasePairDetailSettings } from "../shared/settings/basePairDetailSettings";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import type { TrackMutationResult, TrackSettingsProps } from "@weng-lab/genomebrowser";
import type { BamRecord } from "@weng-lab/genomic-reader";
import { TrackBaseSettings } from "../shared/settings/trackBaseSettings";
import { TrackSettingsLayout } from "../shared/settings/trackSettingsLayout";
import { TrackSettingsSection } from "../shared/settings/trackSettingsSection";
import {
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
} from "../shared/settings/trackSettingsFieldGrid";
import { TrackSettingsUrlField } from "../shared/settings/trackSettingsUrlField";
import { TrackSettingsColorField } from "../shared/settings/trackSettingsColorField";
import { TrackSettingsNumberField } from "../shared/settings/trackSettingsNumberField";
import { TrackSettingsTextField } from "../shared/settings/trackSettingsTextField";
import type { BamConfig } from "./types";

const validateSectionHeight = (value: number) =>
  Number.isInteger(value) && value >= 10 && value <= 1000
    ? undefined
    : "Enter an integer from 10 to 1000.";

export function BamSettings({
  track,
  updateTrack,
  displayOptions,
}: TrackSettingsProps<BamConfig, BamRecord>) {
  const config = track.config;
  // Track patches are shallow, so nested groups are sent whole.
  const updateAlignments = (alignments: Partial<BamConfig["alignments"]>) =>
    updateTrack({
      config: { alignments: { ...config.alignments, ...alignments } },
    });
  const updateFilters = (filters: Partial<BamConfig["filters"]>) =>
    updateTrack({ config: { filters: { ...config.filters, ...filters } } });
  const updateCoverage = (coverage: Partial<BamConfig["coverage"]>) =>
    updateTrack({ config: { coverage: { ...config.coverage, ...coverage } } });
  const updateJunctions = (junctions: Partial<BamConfig["junctions"]>) =>
    updateTrack({ config: { junctions: { ...config.junctions, ...junctions } } });
  const shownSections = [
    config.coverage.show,
    config.junctions.show,
    config.alignments.show,
  ].filter(Boolean).length;
  const sectionSwitch = (
    label: string,
    checked: boolean,
    onChange: (show: boolean) => TrackMutationResult,
  ) => (
    <FormControlLabel
      label={label}
      sx={{ m: 0, minWidth: 0 }}
      control={
        <Switch
          size="small"
          checked={checked}
          // At least one section must stay visible.
          disabled={checked && shownSections === 1}
          onChange={(_, show) => onChange(show)}
        />
      }
    />
  );
  return (
    <TrackSettingsLayout>
      <TrackBaseSettings
        track={track}
        updateTrack={updateTrack}
        displayOptions={displayOptions}
        showColor={false}
      />
      <TrackSettingsSection title="Sections">
        <TrackSettingsFieldRow>
          {sectionSwitch("Coverage", config.coverage.show, (show) => updateCoverage({ show }))}
          {sectionSwitch("Splice junctions", config.junctions.show, (show) =>
            updateJunctions({ show }),
          )}
          {sectionSwitch("Alignments", config.alignments.show, (show) =>
            updateAlignments({ show }),
          )}
        </TrackSettingsFieldRow>
      </TrackSettingsSection>
      {config.coverage.show && (
        <TrackSettingsSection title="Coverage">
          <TrackSettingsFieldRow>
            <TrackSettingsNumberField
              label="Coverage height"
              min={10}
              value={config.coverage.height}
              validate={validateSectionHeight}
              onCommit={(height) => updateCoverage({ height })}
            />
            <TrackSettingsColorField
              label="Coverage color"
              value={config.coverage.color}
              onCommit={(color) => updateCoverage({ color })}
            />
          </TrackSettingsFieldRow>
          <TrackSettingsFieldRow>
            <SelectField
              label="Graph"
              value={config.coverage.graph}
              options={["bars", "line"]}
              onChange={(graph) => updateCoverage({ graph })}
            />
            <SelectField
              label="Summarize each pixel by"
              value={config.coverage.aggregation}
              options={["mean", "max"]}
              onChange={(aggregation) => updateCoverage({ aggregation })}
            />
          </TrackSettingsFieldRow>
          <TrackSettingsFieldRow>
            <SelectField
              label="Scale"
              value={config.coverage.scale.mode}
              options={["auto", "fixed"]}
              onChange={(mode) =>
                updateCoverage({
                  scale: mode === "auto" ? { mode } : { mode, max: fixedScaleDefault(config) },
                })
              }
            />
            {config.coverage.scale.mode === "fixed" && (
              <TrackSettingsNumberField
                label="Scale maximum"
                min={0}
                value={config.coverage.scale.max}
                validate={(value) => (value > 0 ? undefined : "Enter a positive number.")}
                onCommit={(max) => updateCoverage({ scale: { mode: "fixed", max } })}
              />
            )}
          </TrackSettingsFieldRow>
        </TrackSettingsSection>
      )}
      {config.junctions.show && (
        <TrackSettingsSection title="Splice junctions">
          <TrackSettingsFieldRow>
            <TrackSettingsNumberField
              label="Junction height"
              min={10}
              value={config.junctions.height}
              validate={validateSectionHeight}
              onCommit={(height) => updateJunctions({ height })}
            />
            <TrackSettingsColorField
              label="Junction color"
              value={config.junctions.color}
              onCommit={(color) => updateJunctions({ color })}
            />
          </TrackSettingsFieldRow>
          <TrackSettingsFieldRow>
            <TrackSettingsNumberField
              label="Minimum supporting alignments"
              min={1}
              value={config.junctions.minimumSupport}
              validate={(value) =>
                Number.isInteger(value) && value >= 1
                  ? undefined
                  : "Enter an integer of at least 1."
              }
              onCommit={(minimumSupport) => updateJunctions({ minimumSupport })}
            />
            <TrackSettingsTextField
              label="Maximum intron span (bp)"
              placeholder="No limit"
              value={config.junctions.maximumSpan?.toString() ?? ""}
              validate={(value) =>
                value.trim() === "" ||
                (/^[1-9]\d*$/.test(value.trim()) && Number.isSafeInteger(Number(value.trim())))
                  ? undefined
                  : `Enter an integer from 1 to ${Number.MAX_SAFE_INTEGER}, or leave blank for no limit.`
              }
              onCommit={(value) =>
                updateJunctions({
                  maximumSpan: value.trim() === "" ? undefined : Number(value.trim()),
                })
              }
            />
          </TrackSettingsFieldRow>
          <FormControlLabel
            label="Show support counts"
            control={
              <Switch
                size="small"
                checked={config.junctions.showCounts}
                onChange={(_, showCounts) => updateJunctions({ showCounts })}
              />
            }
          />
        </TrackSettingsSection>
      )}
      {config.alignments.show && (
        <TrackSettingsSection title="Alignments">
          <TrackSettingsFieldRow>
            <TrackSettingsNumberField
              label="Row height"
              min={1}
              value={config.alignments.rowHeight}
              validate={(value) => (value >= 1 ? undefined : "Enter at least 1 pixel.")}
              onCommit={(rowHeight) => updateAlignments({ rowHeight })}
            />
            <TrackSettingsColorField
              label="Forward color"
              value={config.alignments.forwardColor}
              onCommit={(forwardColor) => updateAlignments({ forwardColor })}
            />
            <TrackSettingsColorField
              label="Reverse color"
              value={config.alignments.reverseColor}
              onCommit={(reverseColor) => updateAlignments({ reverseColor })}
            />
          </TrackSettingsFieldRow>
          <TrackSettingsFieldRow>
            <TrackSettingsNumberField
              label="Maximum rows"
              min={1}
              value={config.alignments.maxRows}
              validate={(value) =>
                Number.isInteger(value) && value >= 1 && value <= 10_000
                  ? undefined
                  : "Enter an integer from 1 to 10000."
              }
              onCommit={(maxRows) => updateAlignments({ maxRows })}
            />
          </TrackSettingsFieldRow>
        </TrackSettingsSection>
      )}
      <TrackSettingsSection title="Filters">
        <TrackSettingsFieldRow>
          <TrackSettingsNumberField
            label="Minimum mapping quality"
            min={0}
            value={config.filters.minimumMappingQuality}
            validate={(value) =>
              Number.isInteger(value) && value >= 0 && value <= 254
                ? undefined
                : "Enter an integer from 0 to 254."
            }
            onCommit={(minimumMappingQuality) => updateFilters({ minimumMappingQuality })}
          />
        </TrackSettingsFieldRow>
        <FormControlLabel
          label="Show duplicate reads"
          control={
            <Checkbox
              checked={config.filters.includeDuplicates}
              onChange={(_, includeDuplicates) => updateFilters({ includeDuplicates })}
            />
          }
        />
      </TrackSettingsSection>
      <BasePairDetailSettings
        unavailableReason={
          !config.alignments.show
            ? "Enable Alignments above to show letters on this track."
            : track.base.display !== "pack" && track.base.display !== "full"
              ? "Choose Pack or Full display above to show letters on this track."
              : config.alignments.rowHeight < 10
                ? "Increase row height to at least 10 pixels to show letters on this track."
                : undefined
        }
      />
      <TrackSettingsSection title="BAM source">
        <TrackSettingsFieldGrid>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              label="BAM URL"
              required
              disabled={track.source === "host"}
              value={config.url}
              onCommit={(url) => updateTrack({ config: { url } })}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              label="BAI URL"
              required
              disabled={track.source === "host"}
              value={config.indexUrl}
              onCommit={(indexUrl) => updateTrack({ config: { indexUrl } })}
            />
          </TrackSettingsFullRow>
          <TrackSettingsFullRow>
            <TrackSettingsUrlField
              label="Reference 2bit URL"
              disabled={track.source === "host"}
              value={config.sequenceUrl ?? ""}
              onCommit={(sequenceUrl) =>
                updateTrack({
                  config: { sequenceUrl: sequenceUrl.trim() || undefined },
                })
              }
            />
          </TrackSettingsFullRow>
        </TrackSettingsFieldGrid>
        <TrackSettingsFieldRow>
          <TrackSettingsNumberField
            label="Maximum window (bp)"
            min={1}
            value={config.maxWindow}
            validate={(value) =>
              Number.isInteger(value) && value >= 1 && value <= 100_000
                ? undefined
                : "Enter an integer from 1 to 100000."
            }
            onCommit={(maxWindow) => updateTrack({ config: { maxWindow } })}
          />
        </TrackSettingsFieldRow>
      </TrackSettingsSection>
    </TrackSettingsLayout>
  );
}

/** A fixed scale starts from the previous fixed maximum, or a round default. */
function fixedScaleDefault(config: BamConfig) {
  return config.coverage.scale.mode === "fixed" ? config.coverage.scale.max : 100;
}

function SelectField<Option extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Option;
  options: readonly Option[];
  onChange: (value: Option) => TrackMutationResult;
}) {
  return (
    <TextField
      select
      fullWidth
      size="small"
      label={label}
      value={value}
      onChange={(event) => {
        const option = options.find((candidate) => candidate === event.target.value);
        if (option !== undefined) onChange(option);
      }}
    >
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}
