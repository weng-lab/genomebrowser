import { FolderDefinition } from "../../types";
import { MohdDataFile, MohdRowInfo } from "./types";
import { getMohdOmeConfig } from "./config";
import {
  defaultColumns,
  defaultGroupingModel,
  defaultLeafField,
} from "./columns";
import { createMohdTrack } from "./toTrack";

const WG_BS_DESCRIPTION = "DNA Methylation";

function createBaseRow(folderId: string, row: MohdDataFile[number]) {
  return {
    id: `${folderId}/${row.sample_id}::${row.filename}`,
    ome: getMohdOmeConfig(row.ome).label,
    site: row.site,
    sampleId: row.sample_id,
    sex: row.sex,
    status: row.status,
  };
}

function createFileRow(
  folderId: string,
  row: MohdDataFile[number],
): MohdRowInfo {
  return {
    ...createBaseRow(folderId, row),
    kind: "file",
    description: row.file_type,
    filename: row.filename,
  };
}

function getRequiredWgbsFilename(
  rows: MohdDataFile,
  sampleId: string,
  includesText: string,
) {
  const match = rows.find(
    (row) => row.sample_id === sampleId && row.filename.includes(includesText),
  );

  if (!match) {
    throw new Error(
      `Missing WGBS file for ${sampleId} matching ${includesText}`,
    );
  }

  return match.filename;
}

function createWgbsMethylRow(
  folderId: string,
  sampleRows: MohdDataFile,
): MohdRowInfo {
  const sampleId = sampleRows[0]?.sample_id;

  if (!sampleId) {
    throw new Error("Cannot build WGBS row without a sample ID");
  }

  const base = createBaseRow(folderId, sampleRows[0]!);

  return {
    ...base,
    id: `${folderId}/${sampleId}`,
    kind: "wgbs-methyl",
    description: WG_BS_DESCRIPTION,
    filenames: {
      plusStrand: {
        cpg: getRequiredWgbsFilename(sampleRows, sampleId, "DNAme-CpG-plus"),
        chg: getRequiredWgbsFilename(sampleRows, sampleId, "DNAme-CHG-plus"),
        chh: getRequiredWgbsFilename(sampleRows, sampleId, "DNAme-CHH-plus"),
        depth: getRequiredWgbsFilename(sampleRows, sampleId, "coverage-plus"),
      },
      minusStrand: {
        cpg: getRequiredWgbsFilename(sampleRows, sampleId, "DNAme-CpG-minus"),
        chg: getRequiredWgbsFilename(sampleRows, sampleId, "DNAme-CHG-minus"),
        chh: getRequiredWgbsFilename(sampleRows, sampleId, "DNAme-CHH-minus"),
        depth: getRequiredWgbsFilename(sampleRows, sampleId, "coverage-minus"),
      },
    },
  };
}

function transformData(folderId: string, data: MohdDataFile): MohdRowInfo[] {
  const rows: MohdRowInfo[] = [];
  const handledWgbsSamples = new Set<string>();

  data.forEach((row) => {
    if (row.ome !== "wgbs") {
      rows.push(createFileRow(folderId, row));
      return;
    }

    if (handledWgbsSamples.has(row.sample_id)) {
      return;
    }

    handledWgbsSamples.add(row.sample_id);

    const sampleRows = data.filter(
      (candidate) =>
        candidate.ome === "wgbs" && candidate.sample_id === row.sample_id,
    );

    rows.push(createWgbsMethylRow(folderId, sampleRows));

    sampleRows
      .filter((sampleRow) => sampleRow.filename.endsWith(".bed.gz"))
      .forEach((sampleRow) => rows.push(createFileRow(folderId, sampleRow)));
  });

  return rows;
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
