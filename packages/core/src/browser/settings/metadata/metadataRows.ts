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
  /**
   * The field as the track stores it, on rows `metadataRows` builds. Until the row's name or
   * value changes, `metadataFromRows` keeps the field exactly as stored.
   */
  stored?: { name: string; value: TrackMetadata[string] };
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
    const row = { ...newMetadataRow(), name, stored: { name, value } };
    if (value === null) return { ...row, type: "none" };
    if (typeof value === "boolean") return { ...row, type: "boolean", checked: value };
    return { ...row, type: typeof value === "number" ? "number" : "text", text: String(value) };
  });
}

/**
 * The metadata rows describe, or what keeps each row from being stored. Rows with neither a
 * name nor a typed value are skipped, so a field just added isn't a problem. Every other row
 * needs a name that isn't `id`, `title`, `type`, or `__proto__` and isn't used by another row. A text
 * field needs text, and a number field a finite number. Names and text are stored as typed.
 *
 * A row read from the track's metadata keeps its stored name and value until it's edited, even
 * one the editor wouldn't accept as new, such as empty text, so it can't hold back other edits.
 * Only a name another row also uses, or `__proto__`, is a problem for it.
 */
export function metadataFromRows(rows: readonly TrackMetadataRow[]): TrackMetadataRowsResult {
  const problems: TrackMetadataRowProblem[] = [];
  const metadata: TrackMetadata = {};
  const counts = new Map<string, number>();
  for (const { name } of rows) counts.set(name, (counts.get(name) ?? 0) + 1);

  for (const row of rows) {
    const uses = counts.get(row.name) ?? 0;
    if (unedited(row)) {
      const conflict = nameConflict(row.name, uses);
      if (conflict) problems.push({ key: row.key, ...conflict });
      else metadata[row.name] = row.stored.value;
      continue;
    }
    const named = row.name.trim() !== "";
    const typed = (row.type === "text" || row.type === "number") && row.text.trim() !== "";
    if (!named && !typed) continue;
    const problem = rowProblem(row, uses);
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
  const conflict = nameConflict(name, uses);
  if (conflict) return conflict;
  if (row.type === "text" && !row.text.trim())
    return { message: `Enter a value for "${name}", or remove the field.`, incomplete: true };
  if (row.type === "number" && !Number.isFinite(parseNumber(row.text)))
    return {
      message: `Enter a number for "${name}".`,
      incomplete: row.text.trim() === "",
    };
  return undefined;
}

/** Problems a name has even on a field kept as stored. */
function nameConflict(name: string, uses: number) {
  // Assigning this name sets an object's prototype instead of adding a field, and reading
  // a saved session drops it, so it can't be stored.
  if (name === "__proto__")
    return {
      message: `A field can't be named "__proto__". Choose another name.`,
      incomplete: false,
    };
  if (uses > 1)
    return { message: `Two fields are named "${name}". Rename one.`, incomplete: false };
  return undefined;
}

/** Whether the row still holds the field exactly as the track stores it. */
function unedited(
  row: TrackMetadataRow,
): row is TrackMetadataRow & Required<Pick<TrackMetadataRow, "stored">> {
  const { stored, name, type, text, checked } = row;
  if (!stored || name !== stored.name) return false;
  const { value } = stored;
  if (value === null) return type === "none";
  if (typeof value === "boolean") return type === "boolean" && checked === value;
  if (typeof value === "number") return type === "number" && text === String(value);
  return type === "text" && text === value;
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
    aEntries.every(
      ([name, value]) => Object.hasOwn(bRecord, name) && Object.is(bRecord[name], value),
    )
  );
}
