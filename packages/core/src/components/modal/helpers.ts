export function getTextColor(backgroundColor: string): string {
  // Handle empty or invalid colors
  if (!backgroundColor) return "#000000";
  // Remove # from string
  const hex = backgroundColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Calculate relative luminance using sRGB colors
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Use white text for darker backgrounds, black for lighter ones
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function shadeColor(color: string, percent: number) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = (R * (100 + percent)) / 100;
  G = (G * (100 + percent)) / 100;
  B = (B * (100 + percent)) / 100;

  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  R = Math.round(R);
  G = Math.round(G);
  B = Math.round(B);

  const RR = R.toString(16).length == 1 ? "0" + R.toString(16) : R.toString(16);
  const GG = G.toString(16).length == 1 ? "0" + G.toString(16) : G.toString(16);
  const BB = B.toString(16).length == 1 ? "0" + B.toString(16) : B.toString(16);

  return "#" + RR + GG + BB;
}

export const isDark = (color: string) => {
  const hex = color.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};

export function getButtonColors(trackColor: string, selected: boolean): { backgroundColor: string; color: string } {
  // Calculate luminance to determine how extreme the color is
  const hex = trackColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  let backgroundColor: string;
  if (selected) {
    if (luminance < 0.1) {
      // Extremely dark colors (like pure black): use fixed medium gray since track color would be invisible
      backgroundColor = "#555555";
    } else {
      // All other colors: use the actual track color for selected state
      backgroundColor = trackColor;
    }
  } else {
    if (luminance < 0.1) {
      // Extremely dark colors (like pure black): use fixed light gray
      backgroundColor = "#999999";
    } else if (luminance < 0.2) {
      // Very dark colors: make much lighter for contrast
      backgroundColor = shadeColor(trackColor, 80);
    } else if (luminance < 0.5) {
      // Dark colors: make lighter for contrast
      backgroundColor = shadeColor(trackColor, 60);
    } else if (luminance > 0.8) {
      // Very light colors: make darker for contrast
      backgroundColor = shadeColor(trackColor, -30);
    } else {
      // Light colors: make moderately darker for contrast
      backgroundColor = shadeColor(trackColor, -20);
    }
  }

  return {
    backgroundColor,
    color: getTextColor(backgroundColor),
  };
}
