import { FolderDefinition } from "../../types";
import { MohdDataFile, MohdRowInfo } from "./types";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
} from "./columns";
import { createMohdTrack } from "./toTrack";

function transformData(folderId: string, data: MohdDataFile): MohdRowInfo[] {
  return data.samples.flatMap((sample) =>
    sample.rows.map((row) => ({
      id: `${folderId}/${sample.sampleId}::${row.fileName}`,
      sampleId: sample.sampleId,
      ...row,
    })),
  );
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
  const rows = transformData(id, data);

  return {
    id,
    label,
    description,
    rows,
    columns: defaultColumns,
    groupingModel: defaultGroupingModel,
    leafField: defaultLeafField,
    createTrack: createMohdTrack,
  };
}
