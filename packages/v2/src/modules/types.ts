import type { ComponentType } from "react";
import type { BrowserRegion } from "../utils/region";

export type TrackConfigBase = {
  id: string;
  type: string;
  title: string;
  display: string;
  height: number;
  color?: string;
};

export type TrackFetchContext<Config extends TrackConfigBase> = {
  track: Config;
  region: BrowserRegion;
  width: number;
};

export type TrackRendererProps<Config extends TrackConfigBase, Data> = {
  track: Config;
  data: Data;
  region: BrowserRegion;
  width: number;
  height: number;
};

export type TrackSettingsProps<Config extends TrackConfigBase> = {
  track: Config;
  updateTrack: (partial: Partial<Config>) => void;
};

export type TrackModule<Config extends TrackConfigBase, Data> = {
  type: Config["type"];
  create(input: unknown): Config;
  validate(config: unknown): Config;
  fetch(ctx: TrackFetchContext<Config>): Promise<Data>;
  render: Record<string, ComponentType<TrackRendererProps<Config, Data>>>;
  settings?: ComponentType<TrackSettingsProps<Config>>;
};

export type AnyTrackModule = TrackModule<any, any>;

export type TrackDataState<Data = unknown> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: Data }
  | { status: "error"; error: string };
