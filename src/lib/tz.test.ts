import { describe, it, expect } from "vitest";
import {
  zonedWallTimeToUtc,
  utcToZonedParts,
  localDateKey,
  parseHhMm,
  weekdayOfDateKey,
  eachDateKey,
} from "./tz";

const CHI = "America/Chicago";

describe("zonedWallTimeToUtc", () => {
  it("uses the winter offset (CST = UTC-6) outside DST", () => {
    // If we ignored DST and hardcoded one offset, half the year of slots would be
    // an hour wrong. Jan is CST.
    const utc = zonedWallTimeToUtc(2026, 1, 15, 9, 0, CHI);
    expect(utc.toISOString()).toBe("2026-01-15T15:00:00.000Z");
  });

  it("uses the summer offset (CDT = UTC-5) during DST", () => {
    const utc = zonedWallTimeToUtc(2026, 7, 4, 9, 0, CHI);
    expect(utc.toISOString()).toBe("2026-07-04T14:00:00.000Z");
  });
});

describe("utcToZonedParts", () => {
  it("round-trips a wall-clock time and reports the right weekday", () => {
    const utc = zonedWallTimeToUtc(2026, 7, 4, 9, 30, CHI);
    const parts = utcToZonedParts(utc, CHI);
    expect(parts).toMatchObject({ year: 2026, month: 7, day: 4, hour: 9, minute: 30 });
    expect(parts.weekday).toBe(6); // 2026-07-04 is a Saturday
  });
});

describe("localDateKey", () => {
  it("attributes a late-evening instant to the correct local day, not the UTC day", () => {
    // 02:00 UTC on the 4th is still the evening of the 3rd in Chicago. Booking a
    // slot must land on the day the customer sees, so this boundary matters.
    const instant = new Date("2026-07-04T02:00:00Z");
    expect(localDateKey(instant, CHI)).toBe("2026-07-03");
  });
});

describe("parseHhMm", () => {
  it("parses valid times", () => {
    expect(parseHhMm("09:05")).toEqual({ hour: 9, minute: 5 });
    expect(parseHhMm("17:00")).toEqual({ hour: 17, minute: 0 });
  });
  it("rejects malformed or out-of-range input loudly", () => {
    expect(() => parseHhMm("9am")).toThrow();
    expect(() => parseHhMm("25:00")).toThrow();
  });
});

describe("weekdayOfDateKey", () => {
  it("maps a known Monday to 1", () => {
    expect(weekdayOfDateKey("2024-01-01")).toBe(1); // 2024-01-01 was a Monday
  });
});

describe("eachDateKey", () => {
  it("is inclusive and crosses month boundaries", () => {
    expect(eachDateKey("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });
  it("returns a single day when start === end", () => {
    expect(eachDateKey("2026-05-20", "2026-05-20")).toEqual(["2026-05-20"]);
  });
});
