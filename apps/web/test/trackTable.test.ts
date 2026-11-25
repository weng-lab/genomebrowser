import { expect, it } from "vitest";
import { readTracks } from "../features/browser/trackInput";

const host = "https://data.example.test";
const row = (...cells: string[]) => cells.join("\t");

// Each case is text as a spreadsheet copies cells, tab-separated, and the requests it reads as.
// Expected values follow the table's column schema (#471).
it.each([
  {
    read: "every column a table can name, without case, as Excel copies cells",
    text: [
      row("url", "TITLE", "Type", "Visibility", "Color", "BED Columns", "BAI index URL"),
      row(`${host}/p.bb`, "Peaks", "BigBed", "dense", "#3366CC", "bed6", ""),
      row(`${host}/r.bam`, "Reads", "BAM", "pack", "", "", `${host}/r.bai`),
      "",
    ].join("\r\n"),
    tracks: [
      {
        line: 2,
        request: {
          url: `${host}/p.bb`,
          title: "Peaks",
          type: "bigbed",
          visibility: "dense",
          color: "#3366CC",
          bedSchema: "bed6",
        },
      },
      {
        line: 3,
        request: {
          url: `${host}/r.bam`,
          title: "Reads",
          type: "bam",
          visibility: "pack",
          indexUrl: `${host}/r.bai`,
        },
      },
    ],
  },
  {
    read: "other columns as metadata fields, typed by their names, leaving out empty cells",
    text: [
      row("URL", "Assay", "Replicate (number)", "Treated (true/false)", "Batch (text)"),
      row(`${host}/a.bw`, "DNase-seq", "2", "TRUE", "007"),
      row(`${host}/b.bw`, "", " 1.5 ", "false", ""),
      row(`${host}/c.bw`, "", "", "", ""),
    ].join("\n"),
    tracks: [
      {
        line: 2,
        request: {
          url: `${host}/a.bw`,
          metadata: { Assay: "DNase-seq", Replicate: 2, Treated: true, Batch: "007" },
        },
      },
      { line: 3, request: { url: `${host}/b.bw`, metadata: { Replicate: 1.5, Treated: false } } },
      { line: 4, request: { url: `${host}/c.bw` } },
    ],
  },
  {
    read: "type IDs, the dialog's and UCSC's type names, R,G,B colors, and BED column counts",
    text: [
      row("URL", "Type", "Color", "BED columns"),
      row(`${host}/g.bb`, "gene (biggenepred)", "0,128,0", ""),
      row(`${host}/c.bb`, "ccre-bigbed", "", ""),
      row(`${host}/f.bb`, "", "", "9"),
      row(`${host}/u.bb`, "bigGenePred", "", ""),
    ].join("\n"),
    tracks: [
      { line: 2, request: { url: `${host}/g.bb`, type: "gene", color: "#008000" } },
      { line: 3, request: { url: `${host}/c.bb`, type: "ccre-bigbed" } },
      { line: 4, request: { url: `${host}/f.bb`, bedSchema: "bed9" } },
      { line: 5, request: { url: `${host}/u.bb`, type: "gene" } },
    ],
  },
  {
    read: "quoted cells holding tabs, line breaks, and quotes, numbering rows as the spreadsheet does",
    text: [
      row("URL", "Title"),
      row(`${host}/a.bw`, '"Two\nlines"'),
      row(`${host}/b.bw`, '"Tab\there, ""quoted"""'),
    ].join("\n"),
    tracks: [
      { line: 2, request: { url: `${host}/a.bw`, title: "Two\nlines" } },
      { line: 3, request: { url: `${host}/b.bw`, title: 'Tab\there, "quoted"' } },
    ],
  },
  {
    read: "one copied column, blank rows, and empty trailing columns",
    text: ["", "URL", `${host}/a.bw`, "", `${host}/b.bw`].join("\n"),
    tracks: [
      { line: 3, request: { url: `${host}/a.bw` } },
      { line: 5, request: { url: `${host}/b.bw` } },
    ],
  },
  {
    read: "a selection that ends in empty columns",
    text: [row("URL", "Title", "", ""), row(`${host}/a.bw`, "A", "", "")].join("\n"),
    tracks: [{ line: 2, request: { url: `${host}/a.bw`, title: "A" } }],
  },
])("reads $read", ({ text, tracks }) => {
  expect(readTracks(text)).toEqual({ ok: true, tracks, errors: [], unit: "Row" });
});

it("reads UCSC text with tabs as lines, not as a table", () => {
  const text = [
    row("track", "type=bigWig", `bigDataUrl=${host}/s.bw`),
    row("#", "Peaks"),
    `${host}/a.bw`,
  ].join("\n");

  expect(readTracks(text)).toEqual({
    ok: true,
    tracks: [
      { line: 1, request: { url: `${host}/s.bw`, type: "bigwig" } },
      { line: 3, request: { url: `${host}/a.bw` } },
    ],
    errors: [],
    unit: "Line",
  });
});

it("reports each row that can't become a track, and reads the others", () => {
  const text = [
    row(
      "URL",
      "Type",
      "Visibility",
      "Color",
      "BED columns",
      "Replicate (number)",
      "Treated (true/false)",
    ),
    row(`${host}/good.bw`, "", "", "", "", "", ""),
    row("", "BigWig", "", "", "", "", ""),
    row("ftp://data.example.test/s.bw", "", "", "", "", "", ""),
    row(`${host}/s.bw`, "bigWig 6", "", "", "", "", ""),
    row(`${host}/s.bw`, "", "tall", "", "", "", ""),
    row(`${host}/s.bw`, "", "", "green", "", "", ""),
    row(`${host}/s.bb`, "", "", "", "bed12", "", ""),
    row(`${host}/s.bw`, "", "", "", "", "1,000", ""),
    row(`${host}/s.bw`, "", "", "", "", "", "yes"),
  ].join("\n");

  expect(readTracks(text)).toEqual({
    ok: true,
    tracks: [{ line: 2, request: { url: `${host}/good.bw` } }],
    errors: [
      { line: 3, message: expect.stringContaining("The URL is empty") },
      { line: 4, message: expect.stringContaining('URL "ftp://data.example.test/s.bw"') },
      { line: 5, message: expect.stringContaining('Type "bigWig 6"') },
      { line: 6, message: expect.stringContaining('Visibility "tall"') },
      { line: 7, message: expect.stringContaining('Color "green"') },
      { line: 8, message: expect.stringContaining('BED columns "bed12"') },
      { line: 9, message: expect.stringContaining('Replicate "1,000" is not a number') },
      { line: 10, message: expect.stringContaining('Treated "yes" is not TRUE or FALSE') },
    ],
    unit: "Row",
  });
});

it.each([
  { problem: "no URL column", header: ["Link", "Title"], error: "one must be URL" },
  {
    problem: "only a metadata field named URL",
    header: ["Title", "URL (number)"],
    error: "one must be URL",
  },
  {
    problem: "two columns for one field",
    header: ["URL", "Replicate", "Replicate (number)"],
    error: 'Columns B and C are both named "Replicate"',
  },
  { problem: "a built-in name twice", header: ["URL", "Color", "color"], error: '"Color"' },
  { problem: "a reserved name", header: ["URL", "id"], error: 'Column B can\'t be named "id"' },
  {
    problem: "a value under an unnamed column",
    header: ["URL", "", "Title"],
    cells: [`${host}/a.bw`, "orphan", "A"],
    error: "Column B has values but no name",
  },
])("refuses a table with $problem", ({ header, cells = [`${host}/a.bw`], error }) => {
  expect(readTracks([row(...header), row(...cells)].join("\n"))).toEqual({
    ok: false,
    error: expect.stringContaining(error),
  });
});
