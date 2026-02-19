import { describe, expect, test } from "bun:test";
import { formatDuration, parseDate } from "./api";

describe("formatDuration", () => {
  test("zero seconds", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  test("minutes only", () => {
    expect(formatDuration(300)).toBe("5m");
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(59)).toBe("0m");
  });

  test("hours and minutes", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(3660)).toBe("1h 1m");
    expect(formatDuration(7200)).toBe("2h 0m");
    expect(formatDuration(5400)).toBe("1h 30m");
  });

  test("large values", () => {
    expect(formatDuration(86400)).toBe("24h 0m");
    expect(formatDuration(90061)).toBe("25h 1m");
  });
});

describe("parseDate", () => {
  test("today returns current date", () => {
    const result = parseDate("today");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe(new Date().toISOString().slice(0, 10));
  });

  test("yesterday returns previous date", () => {
    const result = parseDate("yesterday");
    const expected = new Date();
    expected.setDate(expected.getDate() - 1);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  test("this-week returns Monday of current week", () => {
    const result = parseDate("this-week");
    const date = new Date(result);
    // Monday = 1
    expect(date.getUTCDay()).toBe(1);
    // Should be within the last 7 days
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    expect(diff).toBeGreaterThanOrEqual(0);
    expect(diff).toBeLessThan(7 * 24 * 60 * 60 * 1000);
  });

  test("this-month returns first of current month", () => {
    const result = parseDate("this-month");
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    expect(result).toBe(expected);
  });

  test("this-quarter returns first of current quarter", () => {
    const result = parseDate("this-quarter");
    const now = new Date();
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3 + 1;
    const expected = `${now.getFullYear()}-${String(quarterMonth).padStart(2, "0")}-01`;
    expect(result).toBe(expected);
  });

  test("this-year returns Jan 1 of current year", () => {
    const result = parseDate("this-year");
    expect(result).toBe(`${new Date().getFullYear()}-01-01`);
  });

  test("YYYY-MM-DD passes through unchanged", () => {
    expect(parseDate("2026-01-15")).toBe("2026-01-15");
    expect(parseDate("2025-12-31")).toBe("2025-12-31");
  });
});
