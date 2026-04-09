import { FolderDefinition } from "../../types";
import { OtherTrackDataFile, OtherTrackInfo } from "./types";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
} from "./columns";
import { createOtherTrack } from "./toTrack";
import { buildTreeView } from "./treeBuilder";

function transformData(
  folderId: string,
  data: OtherTrackDataFile,
): {
  rows: OtherTrackInfo[];
  rowById: Map<string, OtherTrackInfo>;
} {
  const rows = data.map((row) => ({
    ...row,
    sourceId: row.id,
    id: `${folderId}/${row.id}`,
  }));
  const rowById = new Map<string, OtherTrackInfo>(
    rows.map((row) => [row.id, row]),
  );
  return { rows, rowById };
}

export interface CreateOtherTracksFolderOptions {
  id: string;
  label: string;
  description?: string;
  data: OtherTrackDataFile;
}

export function createOtherTracksFolder(
  options: CreateOtherTracksFolderOptions,
): FolderDefinition<OtherTrackInfo> {
  const { id, label, description, data } = options;
  const { rowById } = transformData(id, data);

  return {
    id,
    label,
    description,
    rowById,
    columns: defaultColumns,
    groupingModel: defaultGroupingModel,
    leafField: defaultLeafField,
    buildTree: (selectedIds, rowById) =>
      buildTreeView(selectedIds, rowById, label),
    createTrack: createOtherTrack,
  };
}
