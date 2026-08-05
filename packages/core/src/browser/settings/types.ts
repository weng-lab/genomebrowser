import type { ComponentType, ReactNode } from "react";
import type {
  AnyTrackInstance,
  TrackBase,
  TrackMutationResult,
  TrackUpdate,
} from "../../modules/types";

export type SettingsPosition = {
  x: number;
  y: number;
};

export type SettingsModalProps = {
  track: AnyTrackInstance;
  title: string;
  position: SettingsPosition;
  closeSettings: () => void;
  children: ReactNode;
};

export type BaseSettingsProps = {
  base: Readonly<TrackBase>;
  displayOptions: string[];
  updateTrack: (update: TrackUpdate<Record<string, unknown>>) => TrackMutationResult;
};

export type SettingsStoreInput = {
  modalComponent?: ComponentType<SettingsModalProps>;
  baseSettingsComponent?: ComponentType<BaseSettingsProps>;
};
