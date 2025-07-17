import { create } from "zustand";

type Color = string;

export interface ThemeStore {
  background: Color;
  text: Color;
  setBackground: (background: Color) => void;
}

export type ThemeStoreInstance = ReturnType<typeof createThemeStore>;

export function createThemeStore() {
  return create<ThemeStore>((set) => ({
    background: "#ffffff",
    text: "#000000",
    setBackground: (background: Color) => {
      set({ background });
      set({ text: getTextColor(background) });
    },
  }));
}

// Legacy export for backward compatibility
export const useTheme = createThemeStore();

// 2e2b28

export function getTextColor(backgroundColor: string): string {
  const hex = backgroundColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Calculate relative luminance using sRGB colors
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Use white text for darker backgrounds, black for lighter ones
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

// background: "#afafaf",
// text: "#000",