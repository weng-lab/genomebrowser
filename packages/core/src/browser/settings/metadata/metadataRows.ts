import { builtInTrackFields } from "../../../modules/trackMetadata";
import type { TrackMetadata } from "../../../modules/types";

/** The kinds of value a metadata field can hold. `none` is a stored `null`. */
export type TrackMetadataValueType = "text" | "number" | "boolean" | "none";

/**
 * One field as it's being edited. Typing passes through states a record can't hold, such
 * as a name with no value yet or two fields with one name, so editors keep rows and turn
 * them into metadata with `metadataFromRows`.
 */
export type TrackMetadataRow = {
  /** Identifies the row while it's edited, including while its name changes. Not stored. */
  key: string;
  name: string;
  type: TrackMetadataValueType;
  /** What's typed for a text or number value. */
  text: string;
  /** The value of a true/false field. */
  checked: boolean;
};

/** Why a row can't be stored yet. `incomplete` rows only need a value or name typed. */
export type TrackMetadataRowProblem = { key: string; message: string; incomplete: boolean };

export type TrackMetadataRowsResult =
  | { ok: true; metadata: TrackMetadata }
  | { ok: false; problems: TrackMetadataRowProblem[] };

let rowCount = 0;

/** A new, empty text field. */
export function newMetadataRow(): TrackMetadataRow {
  rowCount += 1;
  return { key: `metadata-row-${rowCount}`, name: "", type: "text", text: "", checked: true };
}

/** One row for each field of a track's metadata, in the record's order. */
export function metadataRows(metadata: TrackMetadata | undefined): TrackMetadataRow[] {
  return Object.entries(metadata ?? {}).map(([name, value]) => {
    const row = { ...newMetadataRow(), name };
    if (value === null) return { ...row, type: "none" };
    if (typeof value === "boolean") return { ...row, type: "boolean", checked: value };
    return { ...row, type: typeof value === "number" ? "number" : "text", text: String(value) };
  });
}

/**
 * The metadata rows describe, or what keeps each row from being stored. Rows with neither a
 * name nor a typed value are skipped, so a field just added isn't a problem. Every other row
 * needs a name that isn't `id`, `title`, or `type` and isn't used by another row. A text
 * field needs text, and a number field a finite number. Names and text are stored as typed,
 * so fields that aren't edited keep their exact values.
 */
export function metadataFromRows(rows: readonly TrackMetadataRow[]): TrackMetadataRowsResult {
  const problems: TrackMetadataRowProblem[] = [];
  const metadata: TrackMetadata = {};
  const counts = new Map<string, number>();
  for (const { name } of rows) counts.set(name, (counts.get(name) ?? 0) + 1);

  for (const row of rows) {
    const named = row.name.trim() !== "";
    const typed = (row.type === "text" || row.type === "number") && row.text.trim() !== "";
    if (!named && !typed) continue;
    const problem = rowProblem(row, counts.get(row.name) ?? 0);
    if (problem) problems.push({ key: row.key, ...problem });
    else metadata[row.name] = rowValue(row);
  }
  return problems.length > 0 ? { ok: false, problems } : { ok: true, metadata };
}

function rowProblem(row: TrackMetadataRow, uses: number) {
  const { name } = row;
  if (!name.trim()) return { message: "Name this field, or remove it.", incomplete: true };
  if (builtInTrackFields.includes(name))
    return {
      message: `A field can't be named "${name}", which is the track's own ${name}. Choose another name.`,
      incomplete: false,
    };
  if (uses > 1)
    return { message: `Two fields are named "${name}". Rename one.`, incomplete: false };
  if (row.type === "text" && !row.text.trim())
    return { message: `Enter a value for "${name}", or remove the field.`, incomplete: true };
  if (row.type === "number" && !Number.isFinite(parseNumber(row.text)))
    return {
      message: `Enter a number for "${name}".`,
      incomplete: row.text.trim() === "",
    };
  return undefined;
}

function rowValue(row: TrackMetadataRow) {
  if (row.type === "none") return null;
  if (row.type === "boolean") return row.checked;
  if (row.type === "number") return parseNumber(row.text);
  return row.text;
}

// Number("") is 0, so blank text isn't a number here.
function parseNumber(text: string) {
  return text.trim() === "" ? Number.NaN : Number(text);
}

/** Whether two records hold the same fields and values, in any order. */
export function sameMetadata(a: TrackMetadata | undefined, b: TrackMetadata | undefined) {
  const aEntries = Object.entries(a ?? {});
  const bRecord = b ?? {};
  return (
    aEntries.length === Object.keys(bRecord).length &&
    aEntries.every(([name, value]) => name in bRecord && Object.is(bRecord[name], value))
  );
}
