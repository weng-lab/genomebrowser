import { builtInTrackFields, type TrackMetadata } from "@weng-lab/genomebrowser";
import { isHexColor } from "../../shared/ui/color";
import { hexColor, type LineError, type ParsedTrack } from "./customTracks";
import { parseUrl, type TrackRequest } from "./urlTracks";
import {
  bigBedPresetSchema,
  trackVisibilitySchema,
  urlTrackTypeLabels,
  urlTrackTypeSchema,
  type BigBedPreset,
  type UrlTrackType,
} from "./urlTrackTypes";

/** Tracks read from a table, with the rows that can't be tracks; or why the table can't be read. */
export type TrackTable =
  | { ok: true; tracks: ParsedTrack[]; errors: LineError[] }
  | { ok: false; error: string };

type RequestField = "url" | "title" | "type" | "visibility" | "color" | "bedSchema" | "indexUrl";
type Column =
  | { field: RequestField }
  | { field: "metadata"; name: string; kind: "text" | "number" | "boolean" };

// The columns a table can name for a request's own fields, matched without case. Any other
// column is a metadata field.
const requestColumns: [header: string, field: RequestField][] = [
  ["URL", "url"],
  ["Title", "title"],
  ["Type", "type"],
  ["Visibility", "visibility"],
  ["Color", "color"],
  ["BED columns", "bedSchema"],
  ["BAI index URL", "indexUrl"],
];
const fieldsByHeader = new Map(
  requestColumns.map(([header, field]) => [header.toLowerCase(), field]),
);
const headersByField = new Map(requestColumns.map(([header, field]) => [field, header]));

// A metadata column's name may end in its type; without one, it holds text.
const typedHeader = /^(.*?)\s*\((text|number|true\/false)\)$/i;
// Names a metadata field can't have: the track's own fields, and one that would replace an
// object's prototype.
const reservedNames = new Set([...builtInTrackFields, "__proto__"]);

const types = new Map<string, UrlTrackType>([
  ...urlTrackTypeSchema.options.flatMap((type): [string, UrlTrackType][] => [
    [type, type],
    [urlTrackTypeLabels[type].toLowerCase(), type],
  ]),
  // UCSC's name for gene files, as track lines use it. Its other names match the type IDs.
  ["biggenepred", "gene"],
]);
const presets = new Map<string, BigBedPreset>(
  bigBedPresetSchema.options.flatMap((preset) => [
    [preset, preset],
    [preset.slice("bed".length), preset],
  ]),
);

const disjunction = new Intl.ListFormat("en-US", { type: "disjunction" });
const choices = (values: readonly string[]) => disjunction.format(values);

/**
 * Reads a table of tracks, as a spreadsheet lays it out. The first row that isn't blank names
 * the columns: `URL`, which every row needs, then any of `Title`, `Type`, `Visibility`, `Color`,
 * `BED columns`, and `BAI index URL`, matched without case. Each other column is a metadata
 * field named by its header, typed by a `(text)`, `(number)`, or `(true/false)` ending, and
 * holding text without one. Each row below it is one track:
 *
 * - An empty cell leaves the choice to the file or the type, and gives the track no field.
 * - `Type` takes the Add tracks dialog's names, the type IDs, such as `bigwig`, or UCSC's names,
 *   such as `bigGenePred`.
 * - `Color` takes `#RRGGBB` or `R,G,B`, and `BED columns` a preset or its count, such as `6`.
 * - Cells are trimmed, and numbers read as the metadata editor reads them.
 *
 * Rows are numbered as the spreadsheet numbers them, from 1, and blank rows are skipped. A
 * header the table can't use fails the whole table.
 */
export function readTrackTable(rows: readonly (readonly string[])[]): TrackTable {
  const blank = (row: readonly string[]) => row.every((cell) => cell.trim() === "");
  const headerIndex = rows.findIndex((row) => !blank(row));
  if (headerIndex === -1) return { ok: true, tracks: [], errors: [] };
  const columns = readHeader(rows, headerIndex);
  if (typeof columns === "string") return { ok: false, error: columns };

  const tracks: ParsedTrack[] = [];
  const errors: LineError[] = [];
  for (const [index, row] of rows.entries()) {
    if (index <= headerIndex || blank(row)) continue;
    const line = index + 1;
    const request = readRow(row, columns);
    if (typeof request === "string") errors.push({ line, message: request });
    else tracks.push({ line, request });
  }
  return { ok: true, tracks, errors };
}

/** Each column's meaning, undefined for an unnamed empty one; or why the header can't be used. */
function readHeader(
  rows: readonly (readonly string[])[],
  headerIndex: number,
): (Column | undefined)[] | string {
  const header = rows[headerIndex];
  const width = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
  const columns: (Column | undefined)[] = [];
  // The first column for each field, by the field it fills.
  const named = new Map<string, string>();
  for (let index = 0; index < width; index++) {
    const letter = columnLetter(index);
    const name = (header[index] ?? "").trim();
    if (name === "") {
      // A spreadsheet's copied selection can end in empty columns.
      if (rows.some((row) => (row[index] ?? "").trim() !== ""))
        return `Column ${letter} has values but no name. Name it in row ${headerIndex + 1}, or delete the column.`;
      columns.push(undefined);
      continue;
    }
    const column = readColumn(name);
    if (column.field === "metadata" && column.name === "")
      return `Column ${letter}, "${name}", needs a field name before its type.`;
    if (column.field === "metadata" && reservedNames.has(column.name))
      return `Column ${letter} can't be named "${column.name}", which is reserved. Rename it.`;
    const label = column.field === "metadata" ? column.name : headersByField.get(column.field)!;
    const first = named.get(label);
    if (first) return `Columns ${first} and ${letter} are both named "${label}". Rename one.`;
    named.set(label, letter);
    columns.push(column);
  }
  if (!columns.some((column) => column?.field === "url"))
    return "A table's first row names its columns, and one must be URL. The others can be Title, Type, Visibility, Color, BED columns, and BAI index URL. Any other column is a metadata field, typed by a (text), (number), or (true/false) ending, and holding text without one.";
  return columns;
}

function readColumn(header: string): Column {
  const field = fieldsByHeader.get(header.toLowerCase());
  if (field) return { field };
  const typed = typedHeader.exec(header);
  if (!typed) return { field: "metadata", name: header, kind: "text" };
  const ending = typed[2].toLowerCase();
  const kind = ending === "true/false" ? "boolean" : ending === "number" ? "number" : "text";
  return { field: "metadata", name: typed[1], kind };
}

/** A row's request, or why the row can't be a track. */
function readRow(row: readonly string[], columns: readonly (Column | undefined)[]) {
  let url: string | undefined;
  const request: Omit<TrackRequest, "url"> = {};
  const metadata: TrackMetadata = {};
  for (const [index, column] of columns.entries()) {
    const cell = (row[index] ?? "").trim();
    if (!column || cell === "") continue;
    switch (column.field) {
      case "url":
        if (!parseUrl(cell)) return `URL "${cell}" is not an absolute HTTP or HTTPS URL.`;
        url = cell;
        break;
      case "title":
        request.title = cell;
        break;
      case "indexUrl":
        request.indexUrl = cell;
        break;
      case "type": {
        const type = types.get(cell.toLowerCase());
        if (!type)
          return `Type "${cell}" isn't one of ${choices(Object.values(urlTrackTypeLabels))}.`;
        request.type = type;
        break;
      }
      case "visibility": {
        const visibility = trackVisibilitySchema.safeParse(cell.toLowerCase());
        if (!visibility.success)
          return `Visibility "${cell}" isn't one of ${choices(trackVisibilitySchema.options)}.`;
        request.visibility = visibility.data;
        break;
      }
      case "color": {
        const color = isHexColor(cell) ? cell : hexColor(cell);
        if (!color) return `Color "${cell}" is not #RRGGBB or R,G,B.`;
        request.color = color;
        break;
      }
      case "bedSchema": {
        const preset = presets.get(cell.toLowerCase());
        if (!preset)
          return `BED columns "${cell}" isn't one of ${choices(bigBedPresetSchema.options)}.`;
        request.bedSchema = preset;
        break;
      }
      case "metadata": {
        const value = metadataValue(cell, column.kind);
        if (value === undefined)
          return `${column.name} "${cell}" is not ${column.kind === "number" ? "a number" : "TRUE or FALSE"}.`;
        metadata[column.name] = value;
        break;
      }
    }
  }
  if (!url) return "The URL is empty. Enter the file's URL, or delete the row.";
  if (Object.keys(metadata).length > 0) request.metadata = metadata;
  return { url, ...request };
}

function metadataValue(cell: string, kind: "text" | "number" | "boolean") {
  if (kind === "text") return cell;
  if (kind === "number") {
    const number = Number(cell);
    return Number.isFinite(number) ? number : undefined;
  }
  const lower = cell.toLowerCase();
  return lower === "true" ? true : lower === "false" ? false : undefined;
}

/** A column's spreadsheet letters, from A for the first. */
function columnLetter(index: number) {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    letters = String.fromCodePoint(65 + ((n - 1) % 26)) + letters;
  return letters;
}

/**
 * Splits delimited text into rows of cells, as spreadsheets write CSV and copy cells as
 * tab-separated text. A cell in double quotes may hold the delimiter, line breaks, and `""` for
 * a quote; a quote that never closes is kept as text. Lines end with `\n`, `\r\n`, or `\r`, and
 * a final line end doesn't start another row.
 */
export function parseDelimited(text: string, delimiter: "\t" | ","): string[][] {
  const rows: string[][] = [];
  if (text === "") return rows;
  let row: string[] = [];
  let at = 0;
  for (;;) {
    let cell = "";
    if (text[at] === '"') {
      const close = closingQuote(text, at + 1);
      if (close !== undefined) {
        cell = text.slice(at + 1, close).replaceAll('""', '"');
        at = close + 1;
      }
    }
    let end = at;
    while (end < text.length && ![delimiter, "\n", "\r"].includes(text[end])) end++;
    cell += text.slice(at, end);
    row.push(cell);
    at = end;
    if (text[at] === delimiter) {
      at++;
      continue;
    }
    rows.push(row);
    row = [];
    if (text[at] === "\r") at++;
    if (text[at] === "\n") at++;
    if (at >= text.length) return rows;
  }
}

/** Where a quoted cell starting at `from` closes, skipping `""`, or undefined if it never does. */
function closingQuote(text: string, from: number) {
  for (let at = from; at < text.length; at++) {
    if (text[at] !== '"') continue;
    if (text[at + 1] !== '"') return at;
    at++;
  }
  return undefined;
}

/** Rows as tab-separated text that `parseDelimited` reads back, quoting cells that need it. */
export function toTabSeparated(rows: readonly (readonly string[])[]) {
  const quoted = (cell: string) =>
    /[\t\n\r]|^"/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
  return rows.map((row) => row.map(quoted).join("\t")).join("\n");
}
