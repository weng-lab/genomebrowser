import { GridColDef } from "@mui/x-data-grid-premium";
import { MohdRowInfo } from "./types";

const sampleIdCol: GridColDef<MohdRowInfo> = {
  field: "sampleId",
  headerName: "Sample ID",
  minWidth: 180,
  flex: 1,
};

const assayCol: GridColDef<MohdRowInfo> = {
  field: "assay",
  headerName: "Assay",
  minWidth: 120,
  width: 120,
};

const fileTypeCol: GridColDef<MohdRowInfo> = {
  field: "fileType",
  headerName: "File Type",
  minWidth: 200,
  flex: 1,
};

const fileNameCol: GridColDef<MohdRowInfo> = {
  field: "fileName",
  headerName: "File Name",
  minWidth: 320,
  flex: 2,
};

export const defaultColumns: GridColDef<MohdRowInfo>[] = [
  sampleIdCol,
  assayCol,
  fileTypeCol,
  fileNameCol,
];

export const defaultGroupingModel = ["sampleId"];

export const defaultLeafField = "fileName";
