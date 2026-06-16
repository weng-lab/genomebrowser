import type { ComponentType, ReactNode } from "react";
import type {
  TrackConfigBase,
  TrackMutationResult,
  TrackSettingsUpdate,
} from "../../modules/types";

export type SettingsPosition = {
  x: number;
  y: number;
};

export type SettingsModalProps = {
  track: TrackConfigBase;
  title: string;
  position: SettingsPosition;
  closeSettings: () => void;
  children: ReactNode;
};

export type BaseSettingsProps<Config extends TrackConfigBase = TrackConfigBase> = {
  config: Config;
  displayOptions: string[];
  updateTrack: (partial: TrackSettingsUpdate<Config>) => TrackMutationResult;
};

export type SettingsStoreInput = {
  modalComponent?: ComponentType<SettingsModalProps>;
  baseSettingsComponent?: ComponentType<BaseSettingsProps>;
};
