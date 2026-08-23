import { describe, expect, it } from "vitest";
import { calculateMatches, calculateReverseMatches, getDisplayRows, isGregorianDate, lunarToSolar, solarToLunar } from "./calendar.js";

describe("Korean lunar calendar conversion", () => {
  it("converts April 4, 1992 solar to lunar March 2, 1992", () => {
    expect(solarToLunar(1992, 4, 4)).toMatchObject({ year: 1992, month: 3, day: 2, isLeapMonth: false });
  });

  it("converts March 27, 1993 solar to lunar March 5, 1993", () => {
    expect(solarToLunar(1993, 3, 27)).toMatchObject({ year: 1993, month: 3, day: 5, isLeapMonth: false });
  });

  it("detects matching years for a known birthday", () => {
    const result = calculateMatches({ mode: "solar", year: 1993, month: 3, day: 27 });
    expect(result.matches.slice(0, 5)).toEqual([1993, 2031, 2050, 2069, 2088]);
  });

  it("handles leap lunar months without substituting regular months", () => {
    expect(lunarToSolar(2017, 5, 1, true)).toMatchObject({ year: 2017, month: 6, day: 24 });
    expect(lunarToSolar(2018, 5, 1, true)).toBeNull();
  });

  it("reverse-searches birth dates against the target solar date", () => {
    const result = calculateReverseMatches({ year: 2026, month: 8, day: 11 });
    expect(result.targetLunarBirthday).toMatchObject(solarToLunar(2026, 8, 11));
    expect(result.targetMode).toBe("solar");
    expect(result.rows[0]).toMatchObject({ year: 1900 });
    expect(result.rows.at(-1)).toMatchObject({ year: 2026 });
    expect(result.rows.find((row) => row.year === 2026).solarBirthday).toMatchObject({ year: 2026, month: 8, day: 11 });
    expect(result.rows.find((row) => row.year === 2026).recurrentSolar).toMatchObject({ year: 2026, month: 8, day: 11 });
  });

  it("reverse solar search marks years whose converted lunar birthday matches the target", () => {
    const result = calculateReverseMatches({ mode: "solar", year: 2006, month: 8, day: 11 });
    const row1900 = result.rows.find((row) => row.year === 1900);
    const row2006 = result.rows.find((row) => row.year === 2006);
    expect(result.targetLunarBirthday).toMatchObject(solarToLunar(2006, 8, 11));
    expect(row1900.solarBirthday).toMatchObject({ year: 1900, month: 8, day: 11 });
    expect(row1900.lunarBirthday).toMatchObject(solarToLunar(1900, 8, 11));
    expect(row1900.recurrentSolar).toMatchObject({ year: 2006, month: 8, day: 10 });
    expect(row1900.isMatch).toBe(false);
    expect(row2006.solarBirthday).toMatchObject({ year: 2006, month: 8, day: 11 });
    expect(row2006.recurrentSolar).toMatchObject({ year: 2006, month: 8, day: 11 });
    expect(row2006.lunarBirthday).toMatchObject({ year: 2006, month: result.targetLunarBirthday.month, day: result.targetLunarBirthday.day });
    expect(row2006.isMatch).toBe(true);
    expect(result.matches.every((row) => row.isMatch)).toBe(true);
    expect(result.matches.map((row) => row.year)).not.toContain(1900);
  });

  it("reverse-searches directly from a target lunar birthday", () => {
    const result = calculateReverseMatches({ mode: "lunar", year: 2017, month: 5, day: 1, isLeapMonth: true });
    expect(result.targetMode).toBe("lunar");
    expect(result.targetDate).toMatchObject({ year: 2017, month: 6, day: 24 });
    expect(result.targetLunarBirthday).toMatchObject({ year: 2017, month: 5, day: 1, isLeapMonth: true });
    expect(result.rows.find((row) => row.year === 2017).solarBirthday).toMatchObject({ year: 2017, month: 6, day: 24 });
    expect(result.rows.find((row) => row.year === 2017).recurrentSolar).toMatchObject({ year: 2017, month: 6, day: 24 });
    expect(result.rows.find((row) => row.year === 2017).isMatch).toBe(true);
  });

  it("keeps reverse leap-month years missing when that leap month does not exist", () => {
    const result = calculateReverseMatches({ mode: "lunar", year: 2017, month: 5, day: 1, isLeapMonth: true });
    expect(result.targetLunarBirthday).toMatchObject({ month: 5, day: 1, isLeapMonth: true });
    expect(result.rows.find((row) => row.year === 2016)).toMatchObject({ solarBirthday: null, recurrentSolar: null, missingReason: "missing" });
    expect(result.rows.find((row) => row.year === 2017).solarBirthday).toMatchObject({ year: 2017, month: 6, day: 24 });
  });

  it("validates Gregorian leap years", () => {
    expect(isGregorianDate(2000, 2, 29)).toBe(true);
    expect(isGregorianDate(2100, 2, 29)).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(solarToLunar(1993, 2, 31)).toBeNull();
    expect(lunarToSolar(2017, 5, 31, false)).toBeNull();
  });

  it("supports years close to 2127 with astronomical KST fallback", () => {
    const solar = lunarToSolar(2127, 3, 5, false);
    expect(solar).toMatchObject({ year: 2127, month: 4, day: 16 });
    expect(solarToLunar(2127, solar.month, solar.day)).toMatchObject({ year: 2127, month: 3, day: 5 });
  });

  it("keeps the expand control in the omitted middle range", () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ year: 2000 + index }));
    expect(getDisplayRows(rows, false)).toMatchObject({ before: rows.slice(0, 3), middle: [], after: rows.slice(-3), omitted: 6 });
    expect(getDisplayRows(rows, true).middle).toEqual(rows.slice(3, -3));
  });
});
