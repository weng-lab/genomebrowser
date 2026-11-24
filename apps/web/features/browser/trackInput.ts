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
 * An uploaded file's UTF-8 text, for the paste box and `readTracks`. A `.csv` table becomes
 * tab-separated text, as if its cells were copied; a `.csv` file of URLs or track lines, with no
 * comma in its first line, stays as it is, like any other file.
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
  let text: string;
  try {
    // A byte order mark, as Excel's CSV UTF-8 writes, is dropped.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return {
      ok: false,
      error: `${file.name} isn't UTF-8 text. Save it as UTF-8, such as Excel's CSV UTF-8, and upload it again.`,
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
      error: `${file.name} separates its columns with semicolons. Save it with commas, or as tab-separated text, and upload it again.`,
    };
  return { ok: true, text };
}

const firstLine = (text: string) => text.split(/\r\n|\n|\r/).find((line) => line.trim() !== "");

// UCSC custom track text starts its lines with these, and a table can't be read from them.
const isUcscLine = (line: string) => /^\s*(?:#|(?:track|browser)(?:\s|$))/.test(line);
