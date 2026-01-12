import { TreeViewBaseItem } from "@mui/x-tree-view";
import Fuse, { FuseResult } from "fuse.js";
import { RowInfo } from "./types";
import { assayTypes, ontologyTypes, ASSAY_DISPLAY_MAP } from "./constants";

/**
 * Custom Tree Props for RichTreeView Panel
 */
export type ExtendedTreeItemProps = {
  id: string;
  label: string;
  icon: string;
  isAssayItem?: boolean;
  /**
   * The assay name for leaf nodes (experiment accession items)
   */
  assayName?: string;
  /**
   * list of all the experimentAccession values in the children/grandchildren of the item, or the accession of the item itself
   * this is used in updating the rowSelectionModel when removing items from the Tree View panel
   */
  allExpAccessions?: string[];
  // list to allow search functionality in the treeview
  allRowInfo?: RowInfo[];
};

/** Format an ID like "h3k27ac-ENCFF922YMQ" to "H3K27ac - ENCFF922YMQ" */
export function formatIdLabel(id: string): string {
  const hyphenIndex = id.indexOf("-");
  if (hyphenIndex === -1) return id;

  const assayPart = id.substring(0, hyphenIndex);
  let accessionPart = id.substring(hyphenIndex + 1);

  // Truncate accession parts to 15 characters
  if (accessionPart.length > 25)
    accessionPart = accessionPart.substring(0, 15) + "…";

  const formattedAssay = formatAssayName(assayPart);
  return `${formattedAssay} - ${accessionPart}`;
}

export function formatAssayName(assay: string): string {
  return ASSAY_DISPLAY_MAP[assay.toLowerCase()] || assay;
}

/**
 * Builds tree in the sorted by assay view
 * @param selectedIds: list of ids (from useSelectionStore)
 * @param root: Root TreeViewBaseItem
 * @param rowById: Mapping between an id (experimentAccession) and its RowInfo object
 * @returns all of the items for the RichTreeView in TreeViewWrapper
 */
export function buildSortedAssayTreeView(
  selectedIds: string[],
  root: TreeViewBaseItem<ExtendedTreeItemProps>,
  rowById: Map<string, RowInfo>,
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const assayMap = new Map<string, TreeViewBaseItem<ExtendedTreeItemProps>>(); // keep track of top level nodes
  const ontologyMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const sampleAssayMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  let idx = 1;

  const selectedRows = selectedIds.reduce<RowInfo[]>((acc, id) => {
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
  // standardize the order of the assay folders everytime one is added
  root.children!.sort((a, b): number => {
    return assayTypes.indexOf(a.id) - assayTypes.indexOf(b.id);
  });
  return [root];
}

/**
 * Builds tree in the default view
 * @param selectedIds: list of ids (from useSelectionStore)
 * @param root: Root TreeViewBaseItem
 * @param rowById: Mapping between an id (experimentAccession) and its RowInfo object
 * @returns all of the items for the RichTreeView in TreeViewWrapper
 */
export function buildTreeView(
  selectedIds: string[],
  root: TreeViewBaseItem<ExtendedTreeItemProps>,
  rowById: Map<string, RowInfo>,
): TreeViewBaseItem<ExtendedTreeItemProps>[] {
  const ontologyMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >(); // keep track of top level nodes
  const displayNameMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();
  const sampleAssayMap = new Map<
    string,
    TreeViewBaseItem<ExtendedTreeItemProps>
  >();

  const selectedRows = selectedIds.reduce<RowInfo[]>((acc, id) => {
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
  // standardize the order of the assay folders everytime one is added
  root.children!.sort((a, b): number => {
    return ontologyTypes.indexOf(a.id) - ontologyTypes.indexOf(b.id);
  });
  return [root];
}

/**
 * Fuzzy search of active tracks.
 *
 * @param treeItems - TreeBaseViewItems from the tree.
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
export function searchTreeItems(props: {
  treeItems: TreeViewBaseItem<ExtendedTreeItemProps>[];
  query: string;
  keyWeightMap: any[];
  threshold?: number;
  limit?: number;
}): FuseResult<RowInfo>[] {
  const { treeItems, query, keyWeightMap, threshold, limit = 10 } = props;
  const data = treeItems![0].allRowInfo ?? [];
  const fuse = new Fuse(data, {
    includeScore: true,
    shouldSort: true,
    threshold: threshold,
    keys: keyWeightMap,
  });
  return fuse.search(query, { limit: limit });
}
