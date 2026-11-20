import type { TrackSortDirection, TrackSortValueType } from "./trackSortOrder";

// Core's metadata editor names the kinds of value the same way.
const typeNames: Record<TrackSortValueType, string> = {
  number: "Number",
  string: "Text",
  boolean: "True or false",
};

const conjunction = new Intl.ListFormat("en", { type: "conjunction" });

/** Names the kinds of value an option's tracks hold, or undefined when they hold none. */
export function valueTypeLabel(types: readonly TrackSortValueType[]): string | undefined {
  if (types.length <= 1) return types[0] && typeNames[types[0]];
  return `Mixed: ${conjunction.format(types.map((type) => typeNames[type].toLowerCase()))}`;
}

/**
 * Names each direction by what it does to values of one kind. A field that mixes kinds, or
 * has no values, keeps the general names.
 */
export function directionLabels(
  types: readonly TrackSortValueType[],
): Record<TrackSortDirection, string> {
  switch (types.length === 1 ? types[0] : undefined) {
    case "number":
      return { ascending: "Low to high", descending: "High to low" };
    case "string":
      return { ascending: "A to Z", descending: "Z to A" };
    case "boolean":
      return { ascending: "False first", descending: "True first" };
    default:
      return { ascending: "Ascending", descending: "Descending" };
  }
}
