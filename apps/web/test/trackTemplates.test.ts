import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { readTrackFile, readTracks } from "../features/browser/trackInput";

const host = "https://data.example.test";

/** A workbook the Add tracks dialog links, as the paste box holds it after uploading. */
async function workbookText(name: string) {
  const bytes = readFileSync(join(import.meta.dirname, "../public/templates", name));
  const read = await readTrackFile(new File([bytes], name));
  if (!read.ok) throw new Error(read.error);
  return read.text;
}

it("reads each of the template's columns as the track setting it names", async () => {
  const header = await workbookText("genome-browser-tracks-template.xlsx");
  const track = [`${host}/r.bam`, "Reads", "BAM", "pack", "#3366cc", "bed6", `${host}/r.bai`];

  expect(readTracks(`${header}\n${track.join("\t")}`)).toEqual({
    ok: true,
    tracks: [
      {
        line: 2,
        request: {
          url: `${host}/r.bam`,
          title: "Reads",
          type: "bam",
          visibility: "pack",
          color: "#3366cc",
          bedSchema: "bed6",
          indexUrl: `${host}/r.bai`,
        },
      },
    ],
    errors: [],
    unit: "Row",
  });
});

it("reads every track in the example, with no row the dialog would refuse", async () => {
  const read = readTracks(await workbookText("genome-browser-tracks-example.xlsx"));

  expect(read).toMatchObject({ ok: true, errors: [], unit: "Row" });
  expect(read.ok && read.tracks.length).toBeGreaterThan(0);
});
