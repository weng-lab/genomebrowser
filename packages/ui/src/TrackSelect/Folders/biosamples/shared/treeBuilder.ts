import { TreeViewBaseItem } from "@mui/x-tree-view";
import { ExtendedTreeItemProps } from "../../../types";
import { BiosampleRowInfo } from "./types";
import { assayTypes, ontologyTypes, formatAssayType } from "./constants";

/** Format an ID like "h3k27ac-ENCFF922YMQ" or "folder::h3k27ac-ENCFF922YMQ" to "H3K27ac - ENCFF922YMQ" */
function formatIdLabel(id: string): string {
  // Remove folder prefix if present (e.g., "FolderName::h3k27ac-ENCFF922YMQ" -> "h3k27ac-ENCFF922YMQ")
  const rawId = id.includes("::") ? id.split("::").pop()! : id;

  const hyphenIndex = rawId.indexOf("-");
  if (hyphenIndex === -1) return rawId;

  const assayPart = rawId.substring(0, hyphenIndex);
  const accessionPart = rawId.substring(hyphenIndex + 1);

  return `${formatAssayType(assayPart)} - ${accessionPart}`;
}

/**
 * Creates the root node for the tree view
 */
function createRootNode(
  label: string,
  folderId: string,
): TreeViewBaseItem<ExtendedTreeItemProps> {
  return {
    id: `${folderId}::root`,
    label,
    icon: "folder",
    children: [],
    allExpAccessions: [],
  };
}

/**
 * Builds tree in the sorted by assay view
 * Hierarchy: Assay -> Ontology -> DisplayName -> Experiment
 *
 * @param selectedIds - list of selected row IDs
 * @param rowById - Mapping between an id and its BiosampleRowInfo object
 * @param rootLabel - Label for the root node
 * @param folderId - Folder ID to prefix tree item IDs with
 * @returns tree items for the RichTreeView
 */
export function buildSortedAssayTreeView(
  selectedIds: string[],
  rowById: Map<string, BiosampleRowInfo>,
  rootLabel: string = "Biosamples",
  folderId: string = "",
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const root = createRootNode(rootLabel, folderId);
  const assayMap = new Map<string, TreeViewBaseItem<ExtendedTreeItemProps>>();
  const ontologyMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const displayNameMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();

  const selectedRows = selectedIds.reduce<BiosampleRowInfo[]>((acc, id) => {
    const row = rowById.get(id);
    if (row) acc.push(row);
    return acc;
  }, []);

  selectedRows.forEach((row) => {
    const assayKey = `${folderId}::${row.assay}`;
    let assayNode = assayMap.get(assayKey);
    if (!assayNode) {
      assayNode = {
        id: assayKey,
        isAssayItem: true,
        label: row.assay,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      assayMap.set(assayKey, assayNode);
      root.children!.push(assayNode);
    }

    const ontologyKey = `${folderId}::${row.assay}-${row.ontology}`;
    let ontologyNode = ontologyMap.get(ontologyKey);
    if (!ontologyNode) {
      ontologyNode = {
        id: ontologyKey,
        isAssayItem: false,
        label: row.ontology,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      assayNode.children!.push(ontologyNode);
      ontologyMap.set(ontologyKey, ontologyNode);
    }

    const displayNameKey = `${folderId}::${row.assay}-${row.ontology}-${row.displayName}`;
    let displayNameNode = displayNameMap.get(displayNameKey);
    if (!displayNameNode) {
      displayNameNode = {
        id: displayNameKey,
        isAssayItem: false,
        label: row.displayName,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      ontologyNode.children!.push(displayNameNode);
      displayNameMap.set(displayNameKey, displayNameNode);
    }

    const expNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: row.id,
      isAssayItem: false,
      label: formatIdLabel(row.id),
      icon: "removeable",
      assayName: row.assay,
      children: [],
      allExpAccessions: [row.id],
    };
    displayNameNode.children!.push(expNode);

    assayNode.allExpAccessions!.push(row.id);
    ontologyNode.allExpAccessions!.push(row.id);
    displayNameNode.allExpAccessions!.push(row.id);
  });

  // standardize the order of the assay folders
  root.children!.sort((a, b): number => {
    const aAssay = a.id.split("::")[1] ?? a.id;
    const bAssay = b.id.split("::")[1] ?? b.id;
    return assayTypes.indexOf(aAssay) - assayTypes.indexOf(bAssay);
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
 * @param folderId - Folder ID to prefix tree item IDs with
 * @returns tree items for the RichTreeView
 */
export function buildTreeView(
  selectedIds: string[],
  rowById: Map<string, BiosampleRowInfo>,
  rootLabel: string = "Biosamples",
  folderId: string = "",
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const root = createRootNode(rootLabel, folderId);
  const ontologyMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const displayNameMap = new Map<
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
    const ontologyKey = `${folderId}::${row.ontology}`;
    let ontologyNode = ontologyMap.get(ontologyKey);
    if (!ontologyNode) {
      ontologyNode = {
        id: ontologyKey,
        label: row.ontology,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      ontologyMap.set(ontologyKey, ontologyNode);
      root.children!.push(ontologyNode);
    }

    const displayNameKey = `${folderId}::${row.ontology}-${row.displayName}`;
    let displayNameNode = displayNameMap.get(displayNameKey);
    if (!displayNameNode) {
      displayNameNode = {
        id: displayNameKey,
        label: row.displayName,
        icon: "removeable",
        children: [],
        allExpAccessions: [],
      };
      ontologyNode.children!.push(displayNameNode);
      displayNameMap.set(displayNameKey, displayNameNode);
    }

    const expNode: TreeViewBaseItem<ExtendedTreeItemProps> = {
      id: row.id,
      label: formatIdLabel(row.id),
      icon: "removeable",
      assayName: row.assay,
      children: [],
      allExpAccessions: [row.id],
    };
    displayNameNode.children!.push(expNode);

    ontologyNode.allExpAccessions!.push(row.id);
    displayNameNode.allExpAccessions!.push(row.id);
  });

  // standardize the order of the ontology folders
  root.children!.sort((a, b): number => {
    const aOntology = a.id.split("::")[1] ?? a.id;
    const bOntology = b.id.split("::")[1] ?? b.id;
    return ontologyTypes.indexOf(aOntology) - ontologyTypes.indexOf(bOntology);
  });

  return [root];
}
