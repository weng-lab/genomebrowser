import type { CellValue, SheetData } from "read-excel-file/universal";
import { parseCustomTracks, type LineError, type ParsedTrack } from "./customTracks";
import { parseDelimited, readTrackTable, toTabSeparated } from "./trackTable";

/**
 * Tracks read from pasted or uploaded text, with the lines or table rows that can't be tracks,
 * numbered by `unit`; or why none of the text can be read.
 */
export type TrackReading =
  | { ok: true; tracks: ParsedTrack[]; errors: LineError[]; unit: "Line" | "Row" }
  | { ok: false; error: string };

export type TrackFileText = { ok: true; text: string } | { ok: false; error: string };

// Far more than the URLs, track lines, or table rows of a session's most tracks.
const maxUploadBytes = 1_000_000;

/**
 * Reads pasted text. Spreadsheets copy cells as tab-separated text, so text whose first line
 * holds a tab, or is just `URL` (one copied column), is a table (`readTrackTable`). Other text,
 * and text that starts with a UCSC track line, browser line, or comment, is file URLs and track
 * lines (`parseCustomTracks`).
 */
export function readTracks(text: string): TrackReading {
  const first = firstLine(text);
  const table =
    first !== undefined &&
    !isUcscLine(first) &&
    (first.includes("\t") || first.trim().toLowerCase() === "url");
  if (!table) return { ok: true, ...parseCustomTracks(text), unit: "Line" };
  const read = readTrackTable(parseDelimited(text, "\t"));
  return read.ok ? { ...read, unit: "Row" } : read;
}

/**
 * An uploaded file's text, for the paste box and `readTracks`. An Excel workbook's first sheet and
 * a `.csv` table become tab-separated text, as if their cells were copied; a `.csv` file of URLs
 * or track lines, with no comma in its first line, stays as it is, like any other UTF-8 file.
 */
export async function readTrackFile(file: File): Promise<TrackFileText> {
  if (file.size > maxUploadBytes)
    return {
      ok: false,
      error: `${file.name} is larger than 1 MB. Upload a file of URLs, track lines, or table rows, not the track data itself.`,
    };
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return {
      ok: false,
      error: `${file.name} could not be read. Choose the file again, or paste its text.`,
    };
  }
  if (/\.xlsx$/i.test(file.name)) return readWorkbook(file.name, bytes);
  if (/\.xls$/i.test(file.name))
    return {
      ok: false,
      error: `${file.name} is an Excel 97-2003 workbook, which can't be read. Save it as .xlsx, and upload it again.`,
    };
  let text: string;
  try {
    // A byte order mark, as Excel's CSV UTF-8 writes, is dropped.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return {
      ok: false,
      error: `${file.name} isn't UTF-8 text. Save it as UTF-8, such as Excel's CSV UTF-8, or upload the workbook as .xlsx.`,
    };
  }
  if (!/\.csv$/i.test(file.name)) return { ok: true, text };
  const first = firstLine(text);
  if (first === undefined || isUcscLine(first)) return { ok: true, text };
  if (first.includes(",")) return { ok: true, text: toTabSeparated(parseDelimited(text, ",")) };
  // Excel separates CSV columns with semicolons where a comma is the decimal separator.
  if (first.includes(";"))
    return {
      ok: false,
      error: `${file.name} separates its columns with semicolons. Upload the workbook as .xlsx, or save it with commas or as tab-separated text.`,
    };
  return { ok: true, text };
}

/**
 * A workbook's first sheet as tab-separated text. A formula cell holds the result the spreadsheet
 * last calculated, so one saved without its result, as some scripts write them, is empty.
 */
async function readWorkbook(name: string, bytes: ArrayBuffer): Promise<TrackFileText> {
  let rows: SheetData;
  try {
    // Loaded only for a workbook. The browser build reads in a Web Worker, which a 1 MB file
    // doesn't need.
    const { readSheet } = await import("read-excel-file/universal");
    rows = await readSheet(bytes);
  } catch {
    return {
      ok: false,
      error: `${name} could not be read as an Excel workbook. Save it as .xlsx again, or as .csv, and upload it again.`,
    };
  }
  return { ok: true, text: toTabSeparated(rows.map((row) => row.map(cellText))) };
}

/** A workbook cell as the text a copied cell holds: TRUE or FALSE, and dates as ISO dates. */
function cellText(value: CellValue | null) {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, "YYYY-MM-DD".length) : iso;
  }
  return String(value);
}

const firstLine = (text: string) => text.split(/\r\n|\n|\r/).find((line) => line.trim() !== "");

// UCSC custom track text starts its lines with these, and a table can't be read from them.
const isUcscLine = (line: string) => /^\s*(?:#|(?:track|browser)(?:\s|$))/.test(line);
