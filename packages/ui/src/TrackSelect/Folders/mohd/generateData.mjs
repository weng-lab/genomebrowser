import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputPath = resolve(__dirname, "data", "mohd_phase_0_download_files.tsv");
const outputPath = resolve(__dirname, "data", "human.json");

const ASSAY_CONFIG = {
  ATAC_SEQ: {
    label: "ATAC",
    path: "2_ATAC",
  },
  RNA_SEQ: {
    label: "RNA",
    path: "3_RNA",
  },
  WGBS: {
    label: "WGBS",
    path: "1_WGBS",
  },
};

const SUPPORTED_EXTENSIONS = [".bigWig"];

const WGBS_COMPONENTS = {
  "Methylation Estimation Signal Plus CpG Context": ["plusStrand", "cpg"],
  "Methylation Estimation Signal Plus CHG Context": ["plusStrand", "chg"],
  "Methylation Estimation Signal Plus CHH Context": ["plusStrand", "chh"],
  "Pileup Signal Plus": ["plusStrand", "depth"],
  "Methylation Estimation Signal Minus CpG Context": ["minusStrand", "cpg"],
  "Methylation Estimation Signal Minus CHG Context": ["minusStrand", "chg"],
  "Methylation Estimation Signal Minus CHH Context": ["minusStrand", "chh"],
  "Pileup Signal Minus": ["minusStrand", "depth"],
};

function parseTsv(tsvText) {
  const [headerLine, ...dataLines] = tsvText.trim().split(/\r?\n/);
  const headers = headerLine.split("\t");

  return dataLines.map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index]]),
    );
  });
}

function hasSupportedExtension(fileName) {
  return SUPPORTED_EXTENSIONS.some((extension) => fileName.endsWith(extension));
}

function buildUrl(row, assayConfig) {
  return `https://downloads.mohdconsortium.org/${assayConfig.path}/${row.sample_id}/${row.filename}`;
}

function compareRows(a, b) {
  const assayCompare = a.assay.localeCompare(b.assay);
  if (assayCompare !== 0) {
    return assayCompare;
  }
  return a.fileName.localeCompare(b.fileName);
}

function createEmptyWgbsUrls() {
  return {
    plusStrand: {
      cpg: "",
      chg: "",
      chh: "",
      depth: "",
    },
    minusStrand: {
      cpg: "",
      chg: "",
      chh: "",
      depth: "",
    },
  };
}

function buildWgbsRow(sampleId, sampleRows) {
  const assayConfig = ASSAY_CONFIG.WGBS;
  const urls = createEmptyWgbsUrls();

  sampleRows.forEach((row) => {
    const component = WGBS_COMPONENTS[row.file_type];
    if (!component || !hasSupportedExtension(row.filename)) {
      return;
    }

    const [strand, context] = component;
    urls[strand][context] = buildUrl(row, assayConfig);
  });

  const hasCompleteBundle = Object.values(urls).every((strandUrls) =>
    Object.values(strandUrls).every(Boolean),
  );

  if (!hasCompleteBundle) {
    return null;
  }

  return {
    assay: assayConfig.label,
    fileName: `${sampleId}_WGBS.methylC`,
    fileType: "Bundled methylC track",
    urls,
  };
}

const rows = parseTsv(readFileSync(inputPath, "utf8"));

const publicRows = rows.filter((row) => row.open_access === "True");
const groupedInput = new Map();

publicRows.forEach((row) => {
  const sampleRows = groupedInput.get(row.sample_id) ?? [];
  sampleRows.push(row);
  groupedInput.set(row.sample_id, sampleRows);
});

const samples = Array.from(groupedInput.entries())
  .sort(([sampleA], [sampleB]) => sampleA.localeCompare(sampleB))
  .map(([sampleId, sampleRows]) => {
    const rows = sampleRows
      .filter((row) => row.file_ome in ASSAY_CONFIG)
      .filter((row) => row.file_ome !== "WGBS")
      .filter((row) => hasSupportedExtension(row.filename))
      .sort((a, b) => a.filename.localeCompare(b.filename))
      .map((row) => {
        const assayConfig = ASSAY_CONFIG[row.file_ome];
        return {
          assay: assayConfig.label,
          fileName: row.filename,
          fileType: row.file_type,
          url: buildUrl(row, assayConfig),
        };
      });

    const wgbsRow = buildWgbsRow(
      sampleId,
      sampleRows.filter((row) => row.file_ome === "WGBS"),
    );

    if (wgbsRow) {
      rows.push(wgbsRow);
    }

    if (rows.length === 0) {
      return null;
    }

    return {
      sampleId,
      rows: rows.sort(compareRows),
    };
  })
  .filter(Boolean);

const output = {
  samples,
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Wrote ${output.samples.length} MOHD samples to ${outputPath}`);
