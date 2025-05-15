import { ApolloError, gql } from "@apollo/client";
import { Data } from "../components/tracks/bigwig/types";

export interface Result {
  bigResult: {
    data: Data | undefined;
    error: ApolloError | undefined;
  };
  loading: boolean;
}

// Queries
export const MOTIF_QUERY = gql`
  query occurrences(
    $prange: [ChromosomeRangeInput]!
    $range: [GenomicRegionInput!]
    $peaks_accession: String
    $consensus_regex: String
    $limit: Int
    $offset: Int
    $assembly: String!
  ) {
    meme_occurrences(
      genomic_region: $range
      peaks_accession: $peaks_accession
      consensus_regex: $consensus_regex
      limit: $limit
      offset: $offset
    ) {
      motif {
        pwm
        peaks_file {
          assembly
          accession
          dataset_accession
        }
      }
      genomic_region {
        chromosome
        start
        end
      }
    }
    peaks(file_accession: $peaks_accession, range: $prange, assembly: $assembly) {
      peaks {
        chrom
        chrom_start
        chrom_end
      }
    }
  }
`;

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

export const VARIANT_QUERY = `
  query SNP($assembly: String!, $coordinates: [GenomicRangeInput]) {
    snpQuery(assembly: $assembly, coordinates: $coordinates, common: true) {
      id
      coordinates {
        chromosome
        start
        end
      }
    }
  }
`;

// Temporary types
export interface Rect {
  start: number;
  end: number;
  pwm?: number[][];
}

export type ImportanceTrackSequence = {
  sequence: string;
  importance: number[];
};