import { gql } from "@apollo/client";
import { MotifConfig } from "../components/tracks/motif/types";
import { Domain } from "../utils/types";

export type MotifRequest = {
  consensus_regex: string;
  peaks_accession: string;
  range: {
    chromosome: string;
    start: number;
    end: number;
  };
  assembly: string;
  prange: {
    chrom: string;
    chrom_start: number;
    chrom_end: number;
  };
};

export interface MotifRect {
  start: number;
  end: number;
  pwm?: number[][];
}

export function buildMotifRequest(track: MotifConfig, domain: Domain): MotifRequest {
  return {
    consensus_regex: track.consensusRegex,
    peaks_accession: track.peaksAccession,
    range: { chromosome: domain.chromosome, start: domain.start, end: domain.end },
    assembly: track.assembly,
    prange: { chrom: domain.chromosome, chrom_start: domain.start, chrom_end: domain.end },
  };
}

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
