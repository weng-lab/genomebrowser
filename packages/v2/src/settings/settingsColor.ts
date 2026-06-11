export function isHexColor(value: string | undefined) {
  return value ? /^#[0-9a-fA-F]{6}$/.test(value) : false;
}

export function getReadableTextColor(background: string) {
  if (!isHexColor(background)) return "#000000";
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 186 ? "#000000" : "#ffffff";
}
