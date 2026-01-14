import { TreeViewBaseItem } from "@mui/x-tree-view";
import { ExtendedTreeItemProps } from "../../../types";
import { BiosampleRowInfo } from "./types";
import { assayTypes, ontologyTypes, formatAssayType } from "./constants";

/** Format an ID like "h3k27ac-ENCFF922YMQ" to "H3K27ac - ENCFF922YMQ" */
function formatIdLabel(id: string): string {
  const hyphenIndex = id.indexOf("-");
  if (hyphenIndex === -1) return id;

  const assayPart = id.substring(0, hyphenIndex);
  let accessionPart = id.substring(hyphenIndex + 1);

  // Truncate accession parts to 15 characters
  if (accessionPart.length > 25)
    accessionPart = accessionPart.substring(0, 15) + "...";

  return `${formatAssayType(assayPart)} - ${accessionPart}`;
}

/**
 * Creates the root node for the tree view
 */
function createRootNode(
  label: string,
): TreeViewBaseItem<ExtendedTreeItemProps> {
  return {
    id: "root",
    label,
    icon: "folder",
    children: [],
    allExpAccessions: [],
    allRowInfo: [],
  };
}

/**
 * Builds tree in the sorted by assay view
 * Hierarchy: Assay -> Ontology -> DisplayName -> Experiment
 *
 * @param selectedIds - list of selected row IDs
 * @param rowById - Mapping between an id and its BiosampleRowInfo object
 * @param rootLabel - Label for the root node
 * @returns tree items for the RichTreeView
 */
export function buildSortedAssayTreeView(
  selectedIds: string[],
  rowById: Map<string, BiosampleRowInfo>,
  rootLabel: string = "Biosamples",
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const root = createRootNode(rootLabel);
  const assayMap = new Map<string, TreeViewBaseItem<ExtendedTreeItemProps>>();
  const ontologyMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const sampleAssayMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  let idx = 1;

  const selectedRows = selectedIds.reduce<BiosampleRowInfo[]>((acc, id) => {
    const row = rowById.get(id);
    if (row) acc.push(row);
    return acc;
  }, []);

  selectedRows.forEach((row) => {
    let assayNode = assayMap.get(row.assay);
    if (!assayNode) {
      assayNode = {
        id: row.assay,
        isAssayItem: true,
        label: row.assay,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      assayMap.set(row.assay, assayNode);
      root.children!.push(assayNode);
    }

    let ontologyNode = ontologyMap.get(row.ontology + row.assay);
    if (!ontologyNode) {
      ontologyNode = {
        id: row.ontology + "_" + idx++,
        isAssayItem: false,
        label: row.ontology,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      assayNode.children!.push(ontologyNode);
      ontologyMap.set(row.ontology + row.assay, ontologyNode);
    }

    const displayNameNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: row.displayname + "_" + idx++,
      isAssayItem: false,
      label: row.displayname,
      icon: "removeable",
      children: [],
      allExpAccessions: [],
    };
    ontologyNode.children!.push(displayNameNode);

    let expNode = sampleAssayMap.get(row.displayname + row.id);
    if (!expNode) {
      expNode = {
        id: row.id,
        isAssayItem: false,
        label: formatIdLabel(row.id),
        icon: "removeable",
        assayName: row.assay,
        children: [],
        allExpAccessions: [row.id],
      };
      sampleAssayMap.set(row.displayname + row.assay, expNode);
      displayNameNode.children!.push(expNode);
    }
    assayNode.allExpAccessions!.push(row.id);
    ontologyNode.allExpAccessions!.push(row.id);
    displayNameNode.allExpAccessions!.push(row.id);
    root.allRowInfo!.push(row);
  });

  // standardize the order of the assay folders
  root.children!.sort((a, b): number => {
    return assayTypes.indexOf(a.id) - assayTypes.indexOf(b.id);
  });

  return [root];
}

/**
 * Builds tree in the default view (sorted by ontology)
 * Hierarchy: Ontology -> DisplayName -> Experiment
 *
 * @param selectedIds - list of selected row IDs
 * @param rowById - Mapping between an id and its BiosampleRowInfo object
 * @param rootLabel - Label for the root node
 * @returns tree items for the RichTreeView
 */
export function buildTreeView(
  selectedIds: string[],
  rowById: Map<string, BiosampleRowInfo>,
  rootLabel: string = "Biosamples",
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const root = createRootNode(rootLabel);
  const ontologyMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const displayNameMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const sampleAssayMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();

  const selectedRows = selectedIds.reduce<BiosampleRowInfo[]>((acc, id) => {
    const row = rowById.get(id);
    if (row) acc.push(row);
    return acc;
  }, []);

  selectedRows.forEach((row) => {
    if (!row) {
      return;
    }
    let ontologyNode = ontologyMap.get(row.ontology);
    if (!ontologyNode) {
      ontologyNode = {
        id: row.ontology,
        label: row.ontology,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      ontologyMap.set(row.ontology, ontologyNode);
      root.children!.push(ontologyNode);
    }

    let displayNameNode = displayNameMap.get(row.displayname);
    if (!displayNameNode) {
      displayNameNode = {
        id: row.displayname,
        label: row.displayname,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      ontologyNode.children!.push(displayNameNode);
      displayNameMap.set(row.displayname, displayNameNode);
    }

    let expNode = sampleAssayMap.get(row.displayname + row.assay);
    if (!expNode) {
      expNode = {
        id: row.id,
        label: formatIdLabel(row.id),
        icon: "removeable",
        assayName: row.assay,
        children: [],
        allExpAccessions: [row.id],
      };
      sampleAssayMap.set(row.displayname + row.assay, expNode);
      displayNameNode.children!.push(expNode);
    }
    ontologyNode.allExpAccessions!.push(row.id);
    displayNameNode.allExpAccessions!.push(row.id);
    root.allRowInfo!.push(row);
  });

  // standardize the order of the ontology folders
  root.children!.sort((a, b): number => {
    return ontologyTypes.indexOf(a.id) - ontologyTypes.indexOf(b.id);
  });

  return [root];
}
