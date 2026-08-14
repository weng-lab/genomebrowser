import { useState } from "react";
import {
  DATASETS,
  REGIONS,
  REGION_SEED,
  REGION_SIZES,
  runComparison,
  type BenchmarkMode,
  type BenchmarkResult,
} from "./benchmark";

declare global {
  interface Window {
    __readerBenchmarkResults?: BenchmarkResult[];
  }
}

const MODES: readonly BenchmarkMode[] = ["cold", "warm"];
const searchParameters = new URLSearchParams(window.location.search);
const requestedDataset = searchParameters.get("dataset");
const requestedMode = searchParameters.get("mode");
const RUN_DATASETS =
  requestedDataset === null
    ? DATASETS
    : DATASETS.filter((dataset) => dataset.id === requestedDataset);
const RUN_MODES: readonly BenchmarkMode[] =
  requestedMode === "cold" || requestedMode === "warm" ? [requestedMode] : MODES;
const COMPARISON_COUNT = RUN_DATASETS.length * REGION_SIZES.length * RUN_MODES.length;

function milliseconds(value: number): string {
  return value.toFixed(1);
}

function parseSampleCount(value: string): number | undefined {
  if (value === "") return undefined;
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= 50 ? count : undefined;
}

function ResultRow({ result }: { result: BenchmarkResult }) {
  return (
    <tr data-dataset={result.dataset.id} data-mode={result.mode} data-size={result.size}>
      <th scope="row">{result.dataset.label}</th>
      <td>{result.dataset.format}</td>
      <td>{result.size.toLocaleString()}</td>
      <td>
        {result.region.chromosome}:{result.region.start.toLocaleString()}-
        {result.region.end.toLocaleString()}
      </td>
      <td>{result.mode}</td>
      <td>{result.newReader.count}</td>
      <td>{result.oldReader.count}</td>
      <td className={result.countsMatch ? "match" : "mismatch"}>
        {result.countsMatch ? "Yes" : "No"}
      </td>
      <td>{milliseconds(result.newReader.median)}</td>
      <td>{milliseconds(result.newReader.p95)}</td>
      <td>{milliseconds(result.oldReader.median)}</td>
      <td>{milliseconds(result.oldReader.p95)}</td>
      <td>{result.winner}</td>
    </tr>
  );
}

export function App() {
  const [sampleCountInput, setSampleCountInput] = useState("5");
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [status, setStatus] = useState("Ready");
  const [running, setRunning] = useState(false);
  const sampleCount = parseSampleCount(sampleCountInput);

  async function runBenchmark() {
    if (sampleCount === undefined) return;
    setRunning(true);
    setResults([]);
    window.__readerBenchmarkResults = [];
    let complete = 0;
    const nextResults: BenchmarkResult[] = [];

    try {
      // Run comparisons sequentially so concurrent network traffic cannot distort their timings.
      for (const dataset of RUN_DATASETS) {
        for (const size of REGION_SIZES) {
          const region = REGIONS.get(`${dataset.id}:${size}`);
          if (region === undefined) throw new Error("Benchmark region is missing");
          for (const mode of RUN_MODES) {
            setStatus(
              `Running ${complete + 1} of ${COMPARISON_COUNT}: ${dataset.label}, ${size.toLocaleString()} bp, ${mode}`,
            );
            const result = await runComparison(dataset, region, mode, sampleCount);
            nextResults.push(result);
            complete += 1;
            setResults([...nextResults]);
            window.__readerBenchmarkResults = [...nextResults];
          }
        }
      }
      const mismatches = nextResults.filter((result) => !result.countsMatch).length;
      setStatus(
        mismatches === 0
          ? `Complete: ${complete} comparisons, all record counts match`
          : `Complete: ${complete} comparisons, ${mismatches} record-count mismatches`,
      );
    } catch (error) {
      setStatus(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">Local profiling harness</p>
        <h1>Genomic reader benchmark</h1>
        <p>
          Compares the workspace reader with patched <code>genomic-reader@1.4.10</code>. Each range
          request receives a unique query parameter, so browser HTTP caching cannot satisfy
          benchmark traffic.
        </p>
      </header>

      <section className="controls" aria-labelledby="controls-heading">
        <div>
          <h2 id="controls-heading">Run configuration</h2>
          <p>
            {RUN_DATASETS.length === DATASETS.length ? "Four repository datasets" : "One dataset"} ×
            five seeded random chr1 regions × {RUN_MODES.join(" and ")} mode
            {RUN_MODES.length > 1 ? "s" : ""}. Seed: <code>0x{REGION_SEED.toString(16)}</code>.
          </p>
        </div>
        <label>
          Samples per reader
          <input
            type="number"
            min="1"
            max="50"
            value={sampleCountInput}
            disabled={running}
            aria-invalid={sampleCount === undefined}
            onChange={(event) => setSampleCountInput(event.currentTarget.value)}
          />
        </label>
        <button
          type="button"
          disabled={running || sampleCount === undefined}
          onClick={runBenchmark}
        >
          {running ? "Running…" : "Run benchmark"}
        </button>
      </section>

      <p className="status" role="status" data-testid="benchmark-status">
        {status}
      </p>

      <div className="table-wrap">
        <table data-testid="results-table">
          <caption>
            Cold samples use a new reader object. Warm readers are primed once, then reused for all
            measured samples.
          </caption>
          <thead>
            <tr>
              <th scope="col">Dataset</th>
              <th scope="col">Format</th>
              <th scope="col">bp</th>
              <th scope="col">Region</th>
              <th scope="col">Mode</th>
              <th scope="col">New count</th>
              <th scope="col">Old count</th>
              <th scope="col">Counts match</th>
              <th scope="col">New median ms</th>
              <th scope="col">New p95 ms</th>
              <th scope="col">Old median ms</th>
              <th scope="col">Old p95 ms</th>
              <th scope="col">Winner</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <ResultRow
                key={`${result.dataset.id}:${result.size}:${result.mode}`}
                result={result}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
