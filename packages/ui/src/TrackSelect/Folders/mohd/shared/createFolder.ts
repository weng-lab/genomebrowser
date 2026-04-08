import { FolderDefinition } from "../../types";
import { buildTreeView } from "./treeBuilder";
import { MohdDataFile, MohdRowInfo } from "./types";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
} from "./columns";

function transformData(data: MohdDataFile): {
  rowById: Map<string, MohdRowInfo>;
} {
  const rows = data.samples.flatMap((sample) =>
    sample.rows.map((row) => ({
      id: `${sample.sampleId}::${row.fileName}`,
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
      buildTreeView(selectedIds, rowById, label, id),
  };
}
