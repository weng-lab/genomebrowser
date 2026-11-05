import { expect, it } from "vitest";
import { formatSavedAt, formatTrackCount } from "../features/sessions/sessionDetails";

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

it("counts tracks", () => {
  expect(formatTrackCount(0)).toBe("0 tracks");
  expect(formatTrackCount(1)).toBe("1 track");
  expect(formatTrackCount(4)).toBe("4 tracks");
});
