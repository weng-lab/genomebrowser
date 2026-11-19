import { expect, it } from "vitest";
import { parseCustomTracks, sortByPriority } from "../features/browser/customTracks";

const host = "https://data.example.test";

// Each row is pasted text and the requests it reads as. Expected values follow UCSC's custom
// track format (genome.ucsc.edu/goldenPath/help/customTrack.html).
it.each([
  {
    read: "bare URLs, skipping blank lines, comments, and browser lines, with Windows line ends",
    text: `# signal\r\n${host}/a.bigWig\r\n\r\nbrowser position chr1:1-1000\r\n  ${host}/b.bb  `,
    tracks: [
      { line: 2, request: { url: `${host}/a.bigWig` } },
      { line: 5, request: { url: `${host}/b.bb` } },
    ],
  },
  {
    read: "a track line's file, title, type, and index",
    text: `track type=bam name="My reads" bigDataUrl=${host}/r.bam bigDataIndex=${host}/r.bai`,
    tracks: [
      {
        line: 1,
        request: {
          url: `${host}/r.bam`,
          type: "bam",
          title: "My reads",
          indexUrl: `${host}/r.bai`,
        },
      },
    ],
  },
  {
    read: "single quotes, and a UCSC type with its BED columns",
    text: `track type=bigBed 6 + name='Peaks, rep 1' bigDataUrl=${host}/p.bb`,
    tracks: [
      {
        line: 1,
        request: { url: `${host}/p.bb`, type: "bigbed", bedSchema: "bed6", title: "Peaks, rep 1" },
      },
    ],
  },
  {
    read: "the color, visibility, description, and group, ignoring render settings",
    text: `track type=bigWig bigDataUrl=${host}/s.bw color=255,0,16 visibility=pack description="H3K27ac in K562" group=regulation maxHeightPixels=100:50:8 autoScale=on`,
    tracks: [
      {
        line: 1,
        request: {
          url: `${host}/s.bw`,
          type: "bigwig",
          color: "#ff0010",
          visibility: "pack",
          metadata: { Description: "H3K27ac in K562", Group: "regulation" },
        },
      },
    ],
  },
  {
    read: "numbered visibilities, and hide as the type's default",
    text: [1, 2, 3, 4, 0, "hide"]
      .map((visibility) => `track bigDataUrl=${host}/s.bw visibility=${visibility}`)
      .join("\n"),
    tracks: [
      { line: 1, request: { url: `${host}/s.bw`, visibility: "dense" } },
      { line: 2, request: { url: `${host}/s.bw`, visibility: "full" } },
      { line: 3, request: { url: `${host}/s.bw`, visibility: "pack" } },
      { line: 4, request: { url: `${host}/s.bw`, visibility: "squish" } },
      { line: 5, request: { url: `${host}/s.bw` } },
      { line: 6, request: { url: `${host}/s.bw` } },
    ],
  },
  {
    read: "each BED column count as the widest standard preset that fits, and gene files",
    text: [
      "type=bigBed",
      "type=bigBed 3",
      "type=bigBed 5",
      "type=bigBed 8",
      "type=bigBed 12 +",
      "type=bigGenePred",
    ]
      .map((type) => `track ${type} bigDataUrl=${host}/f.bb`)
      .join("\n"),
    tracks: [
      { line: 1, request: { url: `${host}/f.bb`, type: "bigbed" } },
      { line: 2, request: { url: `${host}/f.bb`, type: "bigbed", bedSchema: "bed3" } },
      { line: 3, request: { url: `${host}/f.bb`, type: "bigbed", bedSchema: "bed5" } },
      { line: 4, request: { url: `${host}/f.bb`, type: "bigbed", bedSchema: "bed6" } },
      { line: 5, request: { url: `${host}/f.bb`, type: "bigbed", bedSchema: "bed9" } },
      { line: 6, request: { url: `${host}/f.bb`, type: "gene" } },
    ],
  },
  {
    read: "priority beside the request",
    text: `track bigDataUrl=${host}/s.bw priority=2.5`,
    tracks: [{ line: 1, request: { url: `${host}/s.bw` }, priority: 2.5 }],
  },
])("reads $read", ({ text, tracks }) => {
  expect(parseCustomTracks(text)).toEqual({ tracks, errors: [] });
});

it("reports each line that can't become a track, and reads the others", () => {
  const lines = [
    `${host}/good.bw`,
    "chr1\t100\t200\tpeak",
    "ftp://data.example.test/s.bw",
    "track name=Inline type=bed",
    `track type=vcfTabix bigDataUrl=${host}/v.vcf.gz`,
    `track type=bigBed 2 bigDataUrl=${host}/p.bb`,
    `track bigDataUrl=${host}/s.bw color=300,0,0`,
    `track bigDataUrl=${host}/s.bw visibility=tall`,
    `track bigDataUrl=${host}/s.bw priority=first`,
    `track name="Unclosed bigDataUrl=${host}/s.bw`,
    `track ${host}/s.bw`,
  ];

  const { tracks, errors } = parseCustomTracks(lines.join("\n"));

  expect(tracks).toEqual([{ line: 1, request: { url: `${host}/good.bw` } }]);
  expect(errors).toEqual([
    { line: 2, message: expect.stringContaining("Inline data") },
    { line: 3, message: expect.stringContaining("file URL or a UCSC track line") },
    { line: 4, message: expect.stringContaining("needs bigDataUrl") },
    { line: 5, message: expect.stringContaining('type "vcfTabix" isn\'t supported') },
    { line: 6, message: expect.stringContaining("3 or more") },
    { line: 7, message: expect.stringContaining('color "300,0,0"') },
    { line: 8, message: expect.stringContaining('visibility "tall"') },
    { line: 9, message: expect.stringContaining('priority "first"') },
    { line: 10, message: expect.stringContaining("quote that doesn't close") },
    { line: 11, message: expect.stringContaining("name=value") },
  ]);
});

it("orders tracks by priority, lowest first and stable, with unprioritized tracks last", () => {
  const { tracks } = parseCustomTracks(
    ["a priority=3", "b", "c priority=1", "d priority=3", "e"]
      .map((track) => {
        const [name, priority = ""] = track.split(" ");
        return `track name=${name} bigDataUrl=${host}/${name}.bw ${priority}`;
      })
      .join("\n"),
  );

  expect(sortByPriority(tracks).map(({ request }) => request.title)).toEqual([
    "c",
    "a",
    "d",
    "b",
    "e",
  ]);
});
