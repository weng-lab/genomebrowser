import { FolderDefinition } from "../../types";
import { buildTreeView } from "./treeBuilder";
import { MohdDataFile, MohdRowInfo } from "./types";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
} from "./columns";
import { createMohdTrack } from "./toTrack";

function transformData(
  folderId: string,
  data: MohdDataFile,
): {
  rowById: Map<string, MohdRowInfo>;
} {
  const rows = data.samples.flatMap((sample) =>
    sample.rows.map((row) => ({
      id: `${folderId}/${sample.sampleId}::${row.fileName}`,
      sampleId: sample.sampleId,
      ...row,
    })),
  );

  return {
    rowById: new Map<string, MohdRowInfo>(rows.map((row) => [row.id, row])),
  };
}

export interface CreateMohdFolderOptions {
  id: string;
  label: string;
  description?: string;
  data: MohdDataFile;
}

export function createMohdFolder(
  options: CreateMohdFolderOptions,
): FolderDefinition<MohdRowInfo> {
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
      buildTreeView(selectedIds, rowById, label, id),
    createTrack: createMohdTrack,
  };
}
