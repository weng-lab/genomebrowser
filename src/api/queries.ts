import { gql } from "@apollo/client";
import { Population } from "../components/tracks/ldtrack/types";

/**
 * All GraphQL queries for the genome browser
 */

// BigWig/BigBed data query
export const BIGDATA_QUERY = gql`
  query BigRequests($bigRequests: [BigRequest!]!) {
    bigRequests(requests: $bigRequests) {
      data
      error {
        errortype
        message
      }
    }
  }
`;

// Transcript/Gene data query
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

// Motif data query
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

// LD track/SNP variant query (note: this is a string template, not gql)
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

export const LD_QUERY = gql`
  query getSNPsforgivengwasStudy($study: [String!]!) {
    getSNPsforGWASStudies(study: $study) {
      snpid
      ldblock
      rsquare
      chromosome
      stop
      start
      ldblocksnpid
      __typename
    }
  }
`;

// export const LD_QUERY = (populations: Population[]) => `
// query LD($assembly: String!, $snpids: [String!]) {
//   snpQuery(assembly: $assembly, snpids: $snpids) {
//     ${populations.map(
//       (population) => `
//       ${population.population}_${population.subpopulation || ""}_ld: linkageDisequilibrium(
//         population: ${population.population}
//         ${population.subpopulation ? `subpopulation: ${population.subpopulation}` : ""}
//       ) {
//         id
//         rSquared
//         coordinates(assembly: $assembly) {
//           start
//           end
//         }
//       }
//     `
//     )}
//   }
// }
// `;
