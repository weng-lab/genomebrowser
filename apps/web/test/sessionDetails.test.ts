import { expect, it } from "vitest";
import {
  formatSavedAt,
  formatSavedPeriod,
  formatTrackCount,
} from "../features/sessions/sessionDetails";

// Tuesday, 3 November 2026, 15:30 local time.
const now = new Date(2026, 10, 3, 15, 30);
const format = (date: Date) => formatSavedAt(date, now, "en-US");

it("shows the time for today, the weekday this past week, and the date before that", () => {
  expect(format(new Date(2026, 10, 3, 10, 4))).toBe("10:04 AM");
  expect(format(new Date(2026, 10, 3, 0, 0))).toBe("12:00 AM");
  expect(format(new Date(2026, 10, 2, 23, 59))).toBe("Monday");
  expect(format(new Date(2026, 9, 28, 0, 0))).toBe("Wednesday");
  expect(format(new Date(2026, 9, 27, 23, 59))).toBe("Oct 27");
  expect(format(new Date(2025, 10, 3, 12, 0))).toBe("Nov 3, 2025");
});

it("groups saves by today, weekday this week, then last week, last month, and before", () => {
  const period = (date: Date) => formatSavedPeriod(date, now, "en-US");
  // This week starts on Monday, 2 November.
  expect(period(new Date(2026, 10, 3, 10, 4))).toBe("Today");
  expect(period(new Date(2026, 10, 3, 0, 0))).toBe("Today");
  expect(period(new Date(2026, 10, 2, 23, 59))).toBe("Monday");
  expect(period(new Date(2026, 10, 2, 0, 0))).toBe("Monday");
  // Last week runs from Monday, 26 October, across the month's end.
  expect(period(new Date(2026, 10, 1, 23, 59))).toBe("Last week");
  expect(period(new Date(2026, 9, 26, 0, 0))).toBe("Last week");
  // Last month reaches back to the same day in October.
  expect(period(new Date(2026, 9, 25, 23, 59))).toBe("Last month");
  expect(period(new Date(2026, 9, 3, 0, 0))).toBe("Last month");
  expect(period(new Date(2026, 9, 2, 23, 59))).toBe("More than a month ago");
  // On a Sunday, the week began six days before.
  const sunday = new Date(2026, 10, 8, 9, 0);
  expect(formatSavedPeriod(new Date(2026, 10, 2, 0, 0), sunday, "en-US")).toBe("Monday");
  expect(formatSavedPeriod(new Date(2026, 10, 1, 23, 59), sunday, "en-US")).toBe("Last week");
  // A month back from 31 March is the last day of February.
  const march = new Date(2026, 2, 31, 9, 0);
  expect(formatSavedPeriod(new Date(2026, 1, 28, 0, 0), march, "en-US")).toBe("Last month");
  expect(formatSavedPeriod(new Date(2026, 1, 27, 23, 59), march, "en-US")).toBe(
    "More than a month ago",
  );
});

it("counts tracks", () => {
  expect(formatTrackCount(0)).toBe("0 tracks");
  expect(formatTrackCount(1)).toBe("1 track");
  expect(formatTrackCount(4)).toBe("4 tracks");
});
