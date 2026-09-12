import type { TrackSettingsProps } from "@weng-lab/genomebrowser";
import {
  minimumRowHeight,
  rowCountFromTrackHeight,
  trackHeightFromRowCount,
  type RowLayoutConfig,
} from "../layout/rowLayout";
import { TrackDimensionField } from "./trackDimensionField";
import { TrackSettingsFieldRow } from "./trackSettingsFieldGrid";

export function TrackRowLayoutSettings<Config extends RowLayoutConfig, Item>({
  track,
  updateTrack,
  updateTracksOfType,
}: TrackSettingsProps<Config, Item>) {
  const rowCount = rowCountFromTrackHeight(track.base.height, track.config.rowHeight);
  const minimumHeight = trackHeightFromRowCount(rowCount, minimumRowHeight);
  return (
    <TrackSettingsFieldRow>
      <TrackDimensionField
        label="Height"
        min={minimumHeight}
        value={track.base.height}
        validate={(height) =>
          height >= minimumHeight ? undefined : `Enter a height of at least ${minimumHeight}.`
        }
        onCommit={(height) => updateTrack(dimensions<Config>(height, height / rowCount))}
        onApplyToAll={(height) =>
          updateTracksOfType((candidate) =>
            dimensions<Config>(
              height,
              height / rowCountFromTrackHeight(candidate.base.height, candidate.config.rowHeight),
            ),
          )
        }
      />
      <TrackDimensionField
        label="Row height"
        min={minimumRowHeight}
        value={track.config.rowHeight}
        validate={(rowHeight) =>
          rowHeight >= minimumRowHeight
            ? undefined
            : `Enter a row height of at least ${minimumRowHeight}.`
        }
        onCommit={(rowHeight) =>
          updateTrack(dimensions<Config>(trackHeightFromRowCount(rowCount, rowHeight), rowHeight))
        }
        onApplyToAll={(rowHeight) =>
          updateTracksOfType((candidate) =>
            dimensions<Config>(
              trackHeightFromRowCount(
                rowCountFromTrackHeight(candidate.base.height, candidate.config.rowHeight),
                rowHeight,
              ),
              rowHeight,
            ),
          )
        }
      />
    </TrackSettingsFieldRow>
  );
}

function dimensions<Config extends RowLayoutConfig>(height: number, rowHeight: number) {
  return { base: { height }, config: { rowHeight } as Partial<Config> };
}
