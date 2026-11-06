import type { Session } from "./schema";

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

/**
 * Which period a session was last saved in, to group a list by: "Today", the weekday
 * earlier this week, which starts on Monday, then "Last week", "Last month" for the month before
 * today, and "More than a month ago". `locale` defaults to the viewer's.
 */
export function formatSavedPeriod(date: Date, now: Date, locale?: string) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const monday = day - ((now.getDay() + 6) % 7);
  const weekStart = new Date(year, month, monday);
  const lastWeekStart = new Date(year, month, monday - 7);
  // The same day last month, or that month's last day when it is shorter.
  const monthAgo = new Date(year, month - 1, Math.min(day, new Date(year, month, 0).getDate()));
  if (date >= new Date(year, month, day)) return "Today";
  if (date >= weekStart) return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
  if (date >= lastWeekStart) return "Last week";
  if (date >= monthAgo) return "Last month";
  return "More than a month ago";
}

export const formatTrackCount = (count: number) => `${count} ${count === 1 ? "track" : "tracks"}`;

/** Most recently saved first, then by name. */
export const byRecent = (a: Session, b: Session) =>
  b.updatedAt.getTime() - a.updatedAt.getTime() || a.name.localeCompare(b.name);
