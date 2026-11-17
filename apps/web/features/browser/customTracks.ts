import type { TrackMetadata } from "@weng-lab/genomebrowser";
import type { TrackRequest } from "./urlTracks";
import type { BigBedPreset, TrackVisibility } from "./urlTrackTypes";

/** A track request read from one line of pasted text. */
export type ParsedTrack = {
  /** The line it came from, counting from 1. */
  line: number;
  request: TrackRequest;
  /** UCSC's `priority`. `sortByPriority` orders tracks by it. */
  priority?: number;
};

/** A line that can't become a track, counting from 1. */
export type LineError = { line: number; message: string };

/**
 * Reads file URLs and UCSC custom track lines, one per line, as UCSC's custom track page accepts
 * them. A bare URL leaves the type, title, and other choices to the URL. A `track` line maps its
 * UCSC settings onto a request:
 *
 * - `bigDataUrl` (required), `bigDataIndex`, and `name`
 * - `type`: `bigWig`, `bigBed N` (the widest standard preset of at most N columns), `bigGenePred`
 *   (gene), or `bam`
 * - `color` (`R,G,B`) and `visibility` (`hide` leaves the type's default display)
 * - `description` and `group` as the `Description` and `Group` metadata fields
 * - `priority`, kept beside the request for `sortByPriority`
 *
 * Other settings and `browser` lines are ignored, as are blank lines and `#` comments. Tracks come
 * back in text order.
 */
export function parseCustomTracks(text: string): { tracks: ParsedTrack[]; errors: LineError[] } {
  const tracks: ParsedTrack[] = [];
  const errors: LineError[] = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const content = raw.trim();
    if (content === "" || content.startsWith("#")) continue;
    const line = index + 1;
    const keyword = content.split(/\s/, 1)[0];
    if (keyword === "browser") continue;
    const parsed = keyword === "track" ? parseTrackLine(content.slice(5)) : parseUrlLine(content);
    if (typeof parsed === "string") errors.push({ line, message: parsed });
    else tracks.push({ line, ...parsed });
  }
  return { tracks, errors };
}

/**
 * Orders tracks by UCSC priority, lowest first, keeping text order among equal priorities. Tracks
 * without one follow those with one. UCSC applies priority within a track's group when it has
 * one; grouping tracks (#151) will need to do the same.
 */
export function sortByPriority(tracks: readonly ParsedTrack[]): ParsedTrack[] {
  const rank = ({ priority }: ParsedTrack) => priority ?? Number.POSITIVE_INFINITY;
  return [...tracks].sort((a, b) => (rank(a) === rank(b) ? 0 : rank(a) - rank(b)));
}

type ParsedLine = Omit<ParsedTrack, "line"> | string;

function parseUrlLine(content: string): ParsedLine {
  if (/\s/.test(content) || !isHttpUrl(content))
    return "Expected a file URL or a UCSC track line. Inline data, such as BED rows, isn't supported; host the file and paste its URL.";
  return { request: { url: content } };
}

function parseTrackLine(text: string): ParsedLine {
  const settings = readSettings(text);
  if (typeof settings === "string") return settings;
  const url = settings.get("bigdataurl");
  if (!url)
    return "A track line needs bigDataUrl, the URL of an indexed file such as BigWig or BigBed. Inline data isn't supported.";
  if (!isHttpUrl(url)) return `bigDataUrl "${url}" is not an absolute HTTP or HTTPS URL.`;
  const request: TrackRequest = { url };

  const type = settings.get("type");
  if (type !== undefined) {
    const parsed = parseType(type);
    if (typeof parsed === "string") return parsed;
    Object.assign(request, parsed);
  }
  const title = settings.get("name")?.trim();
  if (title) request.title = title;
  const indexUrl = settings.get("bigdataindex");
  if (indexUrl) request.indexUrl = indexUrl;

  const color = settings.get("color");
  if (color !== undefined) {
    const hex = hexColor(color);
    if (!hex) return `color "${color}" is not R,G,B with each channel from 0 to 255.`;
    request.color = hex;
  }
  const visibility = settings.get("visibility");
  if (visibility !== undefined) {
    const value = visibilities[visibility.toLowerCase()];
    if (value === undefined)
      return `visibility "${visibility}" is not one of hide, dense, squish, pack, or full.`;
    if (value !== "hide") request.visibility = value;
  }

  const metadata: TrackMetadata = {};
  const description = settings.get("description")?.trim();
  if (description) metadata.Description = description;
  const group = settings.get("group")?.trim();
  if (group) metadata.Group = group;
  if (Object.keys(metadata).length > 0) request.metadata = metadata;

  const priority = settings.get("priority");
  if (priority === undefined) return { request };
  const rank = Number(priority);
  if (priority.trim() === "" || !Number.isFinite(rank))
    return `priority "${priority}" is not a number.`;
  return { request, priority: rank };
}

// `key=value` pairs, with values quoted by " or ' when they hold spaces. A word without `=`
// continues the value before it, as in `type=bigBed 6 +`.
const settingPattern = /([^\s=]+)=(?:"([^"]*)"|'([^']*)'|(\S*))|(\S+)/g;

/** A track line's settings by lowercase name, or why it can't be read. */
function readSettings(text: string): Map<string, string> | string {
  const settings = new Map<string, string>();
  let previous: string | undefined;
  for (const [, name, doubleQuoted, singleQuoted, bare, word] of text.matchAll(settingPattern)) {
    if (word !== undefined) {
      if (previous === undefined) return `Expected name=value settings, but found "${word}".`;
      settings.set(previous, `${settings.get(previous)} ${word}`);
      continue;
    }
    if (bare !== undefined && /^["']/.test(bare))
      return `The value of ${name} opens a quote that doesn't close.`;
    previous = name.toLowerCase();
    settings.set(previous, doubleQuoted ?? singleQuoted ?? bare);
  }
  return settings;
}

// UCSC visibilities by name and by number.
const visibilities: Record<string, TrackVisibility | "hide"> = {
  hide: "hide",
  dense: "dense",
  full: "full",
  pack: "pack",
  squish: "squish",
  "0": "hide",
  "1": "dense",
  "2": "full",
  "3": "pack",
  "4": "squish",
};

// Standard BED presets by their column counts, widest first.
const presets: [columns: number, preset: BigBedPreset][] = [
  [9, "bed9"],
  [6, "bed6"],
  [5, "bed5"],
  [4, "bed4"],
  [3, "bed3"],
];

function parseType(value: string): Pick<TrackRequest, "type" | "bedSchema"> | string {
  const [format = "", columns] = value.trim().split(/\s+/);
  switch (format.toLowerCase()) {
    case "bigwig":
      return { type: "bigwig" };
    case "biggenepred":
      return { type: "gene" };
    case "bam":
      return { type: "bam" };
    case "bigbed": {
      if (columns === undefined || columns === "+") return { type: "bigbed" };
      const count = Number(columns);
      const preset = Number.isInteger(count) && presets.find(([fields]) => fields <= count);
      if (!preset) return `type "${value}" needs a BED column count of 3 or more, as in bigBed 6.`;
      return { type: "bigbed", bedSchema: preset[1] };
    }
    default:
      return `type "${format}" isn't supported. Use bigWig, bigBed, bigGenePred, or bam.`;
  }
}

/** UCSC's `R,G,B` as `#rrggbb`. */
function hexColor(value: string) {
  const channels = value.split(",").map((channel) => channel.trim());
  if (channels.length !== 3 || !channels.every((channel) => /^\d{1,3}$/.test(channel)))
    return undefined;
  const numbers = channels.map(Number);
  if (numbers.some((channel) => channel > 255)) return undefined;
  return `#${numbers.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function isHttpUrl(value: string) {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
