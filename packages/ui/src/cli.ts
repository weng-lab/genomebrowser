import type { AnyTrackModule } from "@weng-lab/genomebrowser";

export type TrackSelectCliConfig = {
  modules: readonly AnyTrackModule[];
  schema?: {
    outFile?: string;
    id?: string;
  };
};

export function defineTrackSelectConfig(config: TrackSelectCliConfig) {
  return config;
}
