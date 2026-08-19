import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import type { TranscriptConfig, TranscriptData } from "./types";
const query = `query Gene($chromosome: String, $assembly: String!, $start: Int, $end: Int, $version: Int) { gene(assembly: $assembly, chromosome: $chromosome, start: $start, end: $end, version: $version) { strand name id transcripts { coordinates { start end } name id exons { coordinates { start end } UTRs { coordinates { start end } } } tag } } }`;
type Response = { data?: { gene?: TranscriptData | null }; errors?: { message?: string }[] };
export async function fetchTranscript({
  config,
  region,
}: TrackFetchContext<TranscriptConfig>): Promise<TranscriptData> {
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query,
      variables: {
        chromosome: region.chromosome,
        assembly: config.assembly,
        start: region.start,
        end: region.end,
        version: config.version,
      },
    }),
  });
  if (!response.ok) throw new Error(`Transcript request failed with ${response.status}`);
  const payload = (await response.json()) as Response;
  if (payload.errors?.length)
    throw new Error(payload.errors.map((error) => error.message ?? "GraphQL error").join("; "));
  if (!payload.data) throw new Error("Transcript response did not include data");
  return payload.data.gene ?? [];
}
