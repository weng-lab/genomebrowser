/**
 * When a session was last saved, as briefly as is clear: the time for today, the
 * weekday within the past six days, otherwise the date, with the year only when it
 * is not this year's. `locale` defaults to the viewer's.
 */
export function formatSavedAt(date: Date, now: Date, locale?: string) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  let options: Intl.DateTimeFormatOptions;
  if (date >= today) options = { hour: "numeric", minute: "2-digit" };
  else if (date >= weekAgo) options = { weekday: "long" };
  else if (date.getFullYear() === now.getFullYear()) options = { month: "short", day: "numeric" };
  else options = { month: "short", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export const formatTrackCount = (count: number) => `${count} ${count === 1 ? "track" : "tracks"}`;
