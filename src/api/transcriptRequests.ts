import { gql } from "@apollo/client";
import { TranscriptConfig } from "../components/tracks/transcript/types";
import { Domain } from "../utils/types";

export type TranscriptRequest = {
  chromosome: string;
  assembly: string;
  start: number;
  end: number;
  version: number;
};

export function buildTranscriptRequest(track: TranscriptConfig, domain: Domain): TranscriptRequest {
  return {
    chromosome: domain.chromosome,
    assembly: track.assembly,
    start: domain.start,
    end: domain.end,
    version: track.version,
  };
}

export const TRANSCRIPT_GENES_QUERY = gql`
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
      }
    }
  }
`;
