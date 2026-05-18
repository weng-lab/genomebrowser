import type { TrackConfigBase } from "../../modules/types";

export type BigBedDisplay = "dense" | "squish";

export type BigBedConfig = TrackConfigBase & {
  type: "bigbed";
  display: BigBedDisplay;
  url: string;
};

export type BigBedInput = {
  id: string;
  title: string;
  url: string;
  display?: BigBedDisplay;
  height?: number;
  color?: string;
};
