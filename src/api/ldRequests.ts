import { LDTrackConfig } from "../components/tracks/ldtrack/types";
import { Domain } from "../utils/types";

export type LDRequest = {
  assembly: string;
  coordinates: {
    chromosome: string;
    start: number;
    end: number;
  };
};

export function buildLDRequest(track: LDTrackConfig, domain: Domain): LDRequest {
  return {
    assembly: track.assembly,
    coordinates: { chromosome: domain.chromosome, start: domain.start, end: domain.end },
  };
}

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
