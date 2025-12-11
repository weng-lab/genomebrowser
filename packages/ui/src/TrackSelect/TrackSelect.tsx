import { TrackInfo, AssayInfo } from "./types";
import tracksData from "./modifiedTracks.json";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { styled, alpha } from "@mui/material/styles";
import { GridColDef } from "@mui/x-data-grid";
import { Box, createTheme, Typography } from "@mui/material";
import { useState } from "react";
import { Switch } from "@mui/material";
import { FormControlLabel } from "@mui/material";
import Fuse from "fuse.js";
import { FuseResult } from "fuse.js";
import { Stack } from "@mui/material";
import { Paper } from "@mui/material";
import { TextField } from "@mui/material";
import Button from "@mui/material/Button";
import {
  DataGridPremium,
  GridRowSelectionModel,
} from "@mui/x-data-grid-premium";
import { SearchTracksProps, RowInfo } from "./types.ts";
import { capitalize } from "@mui/material";
import { TreeViewBaseItem } from "@mui/x-tree-view";
import {
  TreeItemCheckbox,
  TreeItemIconContainer,
  TreeItemLabel,
} from "@mui/x-tree-view/TreeItem";
import {
  useTreeItem,
  UseTreeItemParameters,
} from "@mui/x-tree-view/useTreeItem";
import { TreeItemIcon } from "@mui/x-tree-view/TreeItemIcon";
import { TreeItemProvider } from "@mui/x-tree-view/TreeItemProvider";
import { useTreeItemModel } from "@mui/x-tree-view/hooks";
import Folder from "@mui/icons-material/Folder";
import IndeterminateCheckBoxRoundedIcon from "@mui/icons-material/IndeterminateCheckBoxRounded";
import Collapse from "@mui/material/Collapse";
import React, { useMemo } from "react";
import { ThemeProvider } from "@mui/material/styles";

const assayTypes = ["DNase", "H3K4me3", "H3K27ac", "ATAC", "CTCF", "ChromHMM"];
const ontologyTypes = [
  "Adipose",
  "Adrenal gland",
  "Blood",
  "Blood vessel",
  "Bone",
  "Bone marrow",
  "Brain",
  "Breast",
  "Connective tissue",
  "Embryo",
  "Epithelium",
  "Esophagus",
  "Eye",
  "Fallopian Tube",
  "Gallbladder",
  "Heart",
  "Kidney",
  "Large Intestine",
  "Limb",
  "Liver",
  "Lung",
  "Lymphoid Tissue",
  "Muscle",
  "Mouth",
  "Nerve",
  "Nose",
  "Pancreas",
  "Parathyroid Gland",
  "Ovary",
  "Penis",
  "Placenta",
  "Prostate",
  "Skin",
  "Small Intestine",
  "Spinal Cord",
  "Spleen",
  "Stomach",
  "Testis",
  "Thymus",
  "Thyroid",
  "Urinary Bladder",
  "Uterus",
  "Vagina",
];

type ExtendedTreeItemProps = {
  icon: string;
  id: string;
  label: string;
};

/**
 * Fuzzy search in tracks stored in a JSON file.
 *
 * @param jsonStructure - Dot-separated path to the data array in the JSON structure.
 * @param query - The search query string.
 * @param keyWeightMap - Array of keys to search within each track object.
 * Can look like ["name", "author"] or if weighted, [
    {
      name: 'title',
      weight: 0.3
    },
    {
      name: 'author',
      weight: 0.7
    }
  ].
 * @param threshold - (Optional) Threshold for the fuzzy search (default is 0.5).
 *                    Smaller = stricter match, larger = fuzzier since 0 is perfect match and 1 is worst match.
 * @param limit - (Optional) Maximum number of results to return (default is 10).
 * @returns FuseResult object containing the search results.
 */
function searchTracks({
  jsonStructure,
  query,
  keyWeightMap,
  threshold = 0.5,
  limit = 10,
}: SearchTracksProps): FuseResult<any>[] {
  const data = getNestedValue(tracksData, jsonStructure);

  const fuse = new Fuse(data, {
    includeScore: true,
    shouldSort: true,
    threshold: threshold,
    keys: keyWeightMap,
  });
  return fuse.search(query, { limit: limit });
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => acc && acc[key], obj);
}

// grabs only the info about the specified assay + basic info about track
function getTracksByAssayAndOntology(assay: string, ontology: string): any[] {
  let res: any[] = [];
  const data = getNestedValue(tracksData, "tracks");

  data.forEach((track: TrackInfo) => {
    const filteredAssays =
      track.assays?.filter((e: AssayInfo) => e.assay === assay.toLowerCase()) ||
      [];
    if (
      filteredAssays.length > 0 &&
      track.ontology === ontology.toLowerCase()
    ) {
      res.push({
        ...track,
        assays: filteredAssays,
      });
    }
  });
  return res;
}

function formatAssayType(assay: string): string {
  switch (assay) {
    case "dnase":
      return "DNase";
    case "atac":
      return "ATAC";
    case "h3k4me3":
      return "H3K4me3";
    case "h3k27ac":
      return "H3K27ac";
    case "ctcf":
      return "CTCF";
    case "chromhmm":
      return "ChromHMM";
    default:
      return assay;
  }
}

/** Flatten TrackInfo or FuseResult into RowInfo for DataGrid display.
 * @param track TrackInfo object or FuseResult containing information from JSON file
 * @returns Flattened RowInfo object
 */
function flattenIntoRow(track: TrackInfo | FuseResult<any>): RowInfo {
  const { name, ontology, lifeStage, sampleType, displayname } =
    "item" in track ? track.item : track;
  const { assay, url, experimentAccession, fileAccession } =
    "item" in track ? track.item.assays[0] : track.assays[0];

  return {
    ontology: capitalize(ontology),
    lifeStage: capitalize(lifeStage),
    sampleType: capitalize(sampleType),
    displayname: capitalize(displayname),
    assay: formatAssayType(assay),
    experimentAccession,
    fileAccession,
  };
}

/**
 * Create the file directory RichTreeView structure from the selected rows.
 * @param selectedRows selected rows from the DataGrid
 * @param root first TreeItem node
 * @param sortedAssay boolean indicating whether to sort by assay or ontology first
 * @returns a list of TreeViewBaseItem for RichTreeView
 */
function buildTreeView(
  selectedRows: RowInfo[],
  root: TreeViewBaseItem<ExtendedTreeItemProps>,
  sortedAssay: boolean,
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const topLevelType: keyof RowInfo = sortedAssay ? "assay" : "ontology";
  const secondLevelType: keyof RowInfo = sortedAssay ? "ontology" : "assay";
  const topLevelMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >(); // keep track of top level nodes
  let idx = 1; // appending index to the ids of TreeItems to ensure uniqueness

  selectedRows.forEach((row) => {
    let topLevelNode = topLevelMap.get(row[topLevelType]);
    if (!topLevelNode) {
      topLevelNode = {
        id: row[topLevelType],
        label: row[topLevelType],
        icon: "removeable",
        children: [],
      };
      topLevelMap.set(row[topLevelType], topLevelNode);
      root.children!.push(topLevelNode);
    }

    let secondLevelNode = topLevelNode.children!.find(
      (child) => child.label === row[secondLevelType],
    );
    if (!secondLevelNode) {
      secondLevelNode = {
        id: row[secondLevelType] + "_" + idx++,
        label: row[secondLevelType],
        icon: "removeable",
        children: [],
      };
      topLevelNode.children!.push(secondLevelNode);
    }

    const displayNameNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: row.displayname + "_" + idx++,
      label: row.displayname,
      icon: "removeable",
      children: [],
    };
    secondLevelNode.children!.push(displayNameNode);

    const expNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: row.experimentAccession,
      label: row.experimentAccession,
      icon: "experiment",
      children: [],
    };
    displayNameNode.children!.push(expNode);

    if (row.fileAccession) {
      // only add if fileAccession exists
      const fileNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
        id: row.fileAccession + "_" + idx++,
        label: row.fileAccession,
        icon: "file",
        children: [],
      };
      displayNameNode.children!.push(fileNode);
    }
  });
  return [root];
}

function AccessionIcon(type: string) {
  const colorMap: { [key: string]: string } = {
    dnase: "#06da93",
    atac: "#02c7b9",
    h3k4me3: "#db5379", // chose a random color for this one, check with mansi later
    chromhmm: "#0097a7",
    h3k27ac: "#fdc401",
    ctcf: "#01a6f1",
    experiment: "#ff2020",
    file: "#0fb4f1",
  };
  const color = colorMap[type];
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "20%",
        bgcolor: color,
      }}
    />
  );
}

const theme = createTheme({
  palette: {
    primary: {
      main: "#a8a8a8",
      light: "#dedede",
      dark: "#666666",
      contrastText: "#fff",
    },
  },
});

const TreeItemRoot = styled("li")(({ theme }) => ({
  listStyle: "none",
  margin: 0,
  padding: 0,
  outline: 4,
  color: theme.palette.grey[400],
  ...theme.applyStyles("light", {
    color: theme.palette.grey[600], // controls colors of the MUI icons
  }),
}));

const TreeItemLabelText = styled(Typography)({
  color: "black",
  fontFamily: "inherit",
  fontWeight: 500,
});

interface CustomLabelProps {
  children: React.ReactNode;
  icon: React.ElementType | React.ReactElement;
}

function CustomLabel({ icon: Icon, children, ...other }: CustomLabelProps) {
  return (
    <TreeItemLabel
      {...other}
      sx={{
        display: "flex",
        alignItems: "center",
      }}
    >
      {Icon && React.isValidElement(Icon) ? (
        <Box className="labelIcon" sx={{ mr: 1 }}>
          {Icon}
        </Box>
      ) : (
        <Box
          component={Icon as React.ElementType}
          className="labelIcon"
          color="inherit"
          sx={{ mr: 1, fontSize: "1.2rem" }}
        />
      )}
      <TreeItemLabelText variant="body2">{children}</TreeItemLabelText>
    </TreeItemLabel>
  );
}

const TreeItemContent = styled("div")(({ theme }) => ({
  padding: theme.spacing(0.5),
  paddingRight: theme.spacing(2),
  paddingLeft: `calc(${theme.spacing(1)} + var(--TreeView-itemChildrenIndentation) * var(--TreeView-itemDepth))`,
  width: "100%",
  boxSizing: "border-box", // prevent width + padding to overflow
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
  flexDirection: "row-reverse",
  borderRadius: theme.spacing(0.7),
  marginBottom: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
  fontWeight: 500,
  [`&[data-focused], &[data-selected]`]: {
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.primary.contrastText,
    ...theme.applyStyles("light", {
      backgroundColor: theme.palette.primary.main,
    }),
  },
  "&:not([data-focused], [data-selected]):hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: "white",
    ...theme.applyStyles("light", {
      color: theme.palette.primary.main,
    }),
  },
}));

const getIconFromTreeItemType = (itemType: string) => {
  switch (itemType) {
    case "folder":
      return Folder;
    case "removeable":
      return IndeterminateCheckBoxRoundedIcon;
    default:
      return AccessionIcon(itemType);
  }
};

interface CustomTreeItemProps
  extends Omit<UseTreeItemParameters, "rootRef">,
    Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {}

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
  props: CustomTreeItemProps,
  ref: React.Ref<HTMLLIElement>,
) {
  const { id, itemId, label, disabled, children, ...other } = props;

  const {
    getContextProviderProps,
    getRootProps,
    getContentProps,
    getIconContainerProps,
    getCheckboxProps,
    getLabelProps,
    getGroupTransitionProps,
    status,
  } = useTreeItem({ id, itemId, children, label, disabled, rootRef: ref });

  const item = useTreeItemModel<ExtendedTreeItemProps>(itemId)!;
  const icon = getIconFromTreeItemType(item.icon);

  return (
    <TreeItemProvider {...getContextProviderProps()}>
      <TreeItemRoot {...getRootProps(other)}>
        <TreeItemContent {...getContentProps()}>
          <TreeItemIconContainer {...getIconContainerProps()}>
            <TreeItemIcon status={status} />
          </TreeItemIconContainer>
          <TreeItemCheckbox {...getCheckboxProps()} />
          <CustomLabel
            {...getLabelProps({
              icon,
              expandable: status.expandable && status.expanded,
            })}
          />
        </TreeItemContent>
        {children && <Collapse {...getGroupTransitionProps()} />}
      </TreeItemRoot>
    </TreeItemProvider>
  );
});

//TODO: making the remove icon for treeview functional, also forgot to add the colors for the assays in treeview with sorted assays
export default function TrackSelect() {
  const rows = ontologyTypes.flatMap((ontology) =>
    assayTypes.flatMap((assay) =>
      getTracksByAssayAndOntology(
        assay.toLowerCase(),
        ontology.toLowerCase(),
      ).map((r) => {
        const flat = flattenIntoRow(r);
        return {
          ...flat,
          assay,
          ontology,
        };
      }),
    ),
  );

  const [sortedAssay, setSortedAssay] = useState(false);
  const [filteredRows, setFilteredRows] = useState(rows);
  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>({ type: "include", ids: new Set() });

  const selectedRows = useMemo(() => {
    return rows.filter((row) =>
      rowSelectionModel.ids.has(row.experimentAccession),
    );
  }, [rows, rowSelectionModel]);

  // need to memoize treeItems to avoid infinite rerendering of RichTreeView
  const treeItems = useMemo(() => {
    return buildTreeView(
      selectedRows,
      { id: "1", label: "Biosamples", icon: "folder", children: [] },
      sortedAssay,
    );
  }, [selectedRows]);

  const handleToggle = () => {
    setSortedAssay(!sortedAssay);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      setFilteredRows(rows);
      return;
    }
    const props: SearchTracksProps = {
      jsonStructure: "tracks",
      query: e.target.value,
      keyWeightMap: [
        "displayname",
        "ontology",
        "lifeStage",
        "sampleType",
        "type",
        "experimentAccession",
        "fileAccession",
      ],
      limit: 50,
    };
    const res = searchTracks(props);
    setFilteredRows(res.map(flattenIntoRow));
  };

  const handleSelection = (newSelection: GridRowSelectionModel) => {
    setRowSelectionModel(newSelection);
  };

  const columns: GridColDef[] = [
    { field: "displayname", headerName: "Name" },
    { field: "ontology", headerName: "Ontology" },
    { field: "lifeStage", headerName: "Life Stage" },
    { field: "sampleType", headerName: "Sample Type" },
    { field: "assay", headerName: "Assay" },
    { field: "experimentAccession", headerName: "Experiment Accession" },
    { field: "fileAccession", headerName: "File Accession" },
  ];

  const groupingModel = sortedAssay
    ? ["assay", "ontology"]
    : ["ontology", "assay"];

  return (
    <Box width="fit-content">
      <Box display="flex" justifyContent="space-between" sx={{ mb: 3 }}>
        <TextField
          id="outlined-suffix-shrink"
          label="Search"
          variant="outlined"
          onChange={handleSearch}
          sx={{ width: "250px" }}
        />
        <FormControlLabel
          sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}
          value="Sort by assay"
          control={<Switch color="primary" onChange={handleToggle} />}
          label="Sort by assay"
          labelPlacement="end"
        />
      </Box>
      <Stack direction="row" spacing={2}>
        <Paper>
          <Box sx={{ height: "500px", width: "1000px", overflow: "auto" }}>
            <Typography>
              <Box sx={{ fontWeight: "bold", padding: 2 }}>
                {rows.length} available tracks
              </Box>
            </Typography>
            <DataGridPremium
              rows={filteredRows}
              columns={columns}
              getRowId={(row) => row.experimentAccession}
              rowGroupingModel={groupingModel}
              groupingColDef={{ leafField: "displayname", display: "flex" }}
              columnVisibilityModel={{ displayname: false }}
              onRowSelectionModelChange={handleSelection}
              rowSelectionModel={rowSelectionModel}
              sx={{ ml: 2, display: "flex" }}
              checkboxSelection
              autosizeOnMount
              pagination
            />
          </Box>
        </Paper>
        <Paper>
          <Box sx={{ width: "500px", height: "500px", overflow: "auto" }}>
            <Typography>
              <Box sx={{ fontWeight: "bold", padding: 2 }}>Active Tracks</Box>
            </Typography>
            <ThemeProvider theme={theme}>
              <RichTreeView
                items={treeItems}
                slots={{ item: CustomTreeItem }}
                sx={{
                  ml: 1,
                  mr: 1,
                  height: "fit-content",
                  flexGrow: 1,
                  overflowY: "auto",
                }}
                itemChildrenIndentation={0}
              />
            </ThemeProvider>
          </Box>
        </Paper>
      </Stack>
      <Box sx={{ justifyContent: "flex-end" }}>
        <ThemeProvider theme={theme}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleSelection({ type: "include", ids: new Set() })}
            sx={{ mt: 2, justifyContent: "flex-end" }}
          >
            Clear Selection
          </Button>
        </ThemeProvider>
      </Box>
    </Box>
  );
}
