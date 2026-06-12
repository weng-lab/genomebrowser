import type { TrackFetchContext } from "../../src/modules/types";
import type { TranscriptConfig, TranscriptData } from "./types";

const TRANSCRIPT_GRAPHQL_ENDPOINT = "https://screen.api.wenglab.org/graphql";
const SCREEN_API_KEY = import.meta.env.SCREEN_API_KEY;

const TRANSCRIPT_GENES_QUERY = `
  query Gene($chromosome: String, $assembly: String!, $start: Int, $end: Int, $version: Int) {
    gene(assembly: $assembly, chromosome: $chromosome, start: $start, end: $end, version: $version) {
      strand
      name
      id
      transcripts {
        coordinates {
          start
          end
        }
        name
        id
        exons {
          coordinates {
            start
            end
          }
          UTRs {
            coordinates {
              start
              end
            }
          }
        }
        tag
      }
    }
  }
`;

type TranscriptGraphQlResponse = {
  data?: { gene?: TranscriptData | null };
  errors?: { message?: string }[];
};

export async function fetchTranscript({
  config,
  region,
}: TrackFetchContext<TranscriptConfig>): Promise<TranscriptData> {
  if (!SCREEN_API_KEY) {
    throw new Error("SCREEN_API_KEY is required to fetch transcript data");
  }

  const response = await fetch(TRANSCRIPT_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SCREEN_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: TRANSCRIPT_GENES_QUERY,
      variables: {
        chromosome: region.chromosome,
        assembly: config.assembly,
        start: region.start,
        end: region.end,
        version: config.version,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Transcript request failed with ${response.status}`);
  }

  const payload = (await response.json()) as TranscriptGraphQlResponse;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message ?? "GraphQL error").join("; "));
  }
  if (!payload.data) {
    throw new Error("Transcript response did not include data");
  }

  return payload.data.gene ?? [];
}
