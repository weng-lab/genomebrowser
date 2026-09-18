import type { ReactNode } from "react";

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
