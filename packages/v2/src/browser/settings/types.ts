import type { ComponentType, ReactNode } from "react";
import type { TrackBase, TrackInstance, TrackMutationResult } from "../../modules/types";

export type SettingsPosition = {
  x: number;
  y: number;
};

export type SettingsModalProps = {
  track: TrackInstance<any, any>;
  title: string;
  position: SettingsPosition;
  closeSettings: () => void;
  children: ReactNode;
};

export type BaseSettingsProps = {
  base: TrackBase;
  displayOptions: string[];
  updateBase: (partial: Partial<TrackBase>) => TrackMutationResult;
};

export type SettingsStoreInput = {
  modalComponent?: ComponentType<SettingsModalProps>;
  baseSettingsComponent?: ComponentType<BaseSettingsProps>;
};
