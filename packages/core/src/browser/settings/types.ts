import type { ComponentType, ReactNode } from "react";

export type SettingsPosition = {
  x: number;
  y: number;
};

export type SettingsModalProps = {
  trackId: string;
  position: SettingsPosition;
  closeSettings: () => void;
  children: ReactNode;
};

export type SettingsStoreInput = {
  modalComponent?: ComponentType<SettingsModalProps>;
  baseSettingsComponent?: ComponentType;
};
