import { FolderDefinition } from "../../types";
import { OtherTrackDataFile, OtherTrackInfo } from "./types";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
} from "./columns";
import { buildTreeView } from "./treeBuilder";

function transformData(data: OtherTrackDataFile): {
  rows: OtherTrackInfo[];
  rowById: Map<string, OtherTrackInfo>;
} {
  const rowById = new Map<string, OtherTrackInfo>(
    data.map((row) => [row.id, row]),
  );
  return { rows: data, rowById };
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
  const { rowById } = transformData(data);

  return {
    id,
    label,
    description,
    rowById,
    getRowId: (row) => row.id,
    columns: defaultColumns,
    groupingModel: defaultGroupingModel,
    leafField: defaultLeafField,
    buildTree: (selectedIds, rowById) =>
      buildTreeView(selectedIds, rowById, label),
  };
}
