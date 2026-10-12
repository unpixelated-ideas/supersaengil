import { describe, expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { calculateHolidays, dateNumber, addDays, solarTerm } from './holidays.js';
import { solarToLunar } from './calendar.js';
import { calculationText } from './holiday-data.js';
const row = (year, id) => calculateHolidays(year).find((item) => item.id === id);
const md = (date) => `${date.month}/${date.day}`;

describe('Korean holiday reference dates', () => {
  // KASI: https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2024
  // Same reference with search_year=2025 and 2026. Fixtures, not production data.
  it.each([
    [2024, '2/10', '9/17', '5/15', '4/5', '7/15', '7/25', '8/14', '12/21'],
    [2025, '1/29', '10/6', '5/5', '4/5', '7/20', '7/30', '8/9', '12/22'],
    [2026, '2/17', '9/25', '5/24', '4/6', '7/15', '7/25', '8/14', '12/22']
  ])('matches KASI for %i', (year, ...expected) => {
    expect(['seollal', 'chuseok', 'buddha', 'hansik', 'chobok', 'jungbok', 'malbok', 'dongji'].map((id) => md(row(year, id).solar))).toEqual(expected);
  });
  it('counts a solstice that is itself a Gyeong day (2023)', () => {
    expect(md(row(2023, 'chobok').solar)).toBe('7/11');
    expect(md(row(2023, 'jungbok').solar)).toBe('7/21');
  });
  it('keeps Buddha’s Birthday in the regular fourth month in 2020', () => {
    expect(md(row(2020, 'buddha').solar)).toBe('4/30');
    expect(row(2020, 'buddha').lunar.isLeapMonth).toBe(false);
    expect(calculateHolidays(2020).filter((r) => r.id === 'buddha')).toHaveLength(1);
  });
  it.each([[2024, 30], [2025, 29]])('finds the actual final lunar day in %i', (year, day) => {
    expect(row(year, 'eve').lunar).toMatchObject({ year: year - 1, month: 12, day });
    expect(dateNumber(row(year, 'seollal').solar) - dateNumber(row(year, 'eve').solar)).toBe(1);
  });
  it('retains leap month labels for seasonal days', () => {
    expect(row(2025, 'jungbok').lunar).toMatchObject({ month: 6, day: 6, isLeapMonth: true });
  });
  it('shows the complete tenth month without inventing an observance day', () => {
    const r = row(2026, 'sangdal');
    expect(md(r.solar)).toBe('11/9');
    expect(md(r.end)).toBe('12/8');
    const next = addDays(r.end, 1);
    expect(solarToLunar(next.year, next.month, next.day)).toMatchObject({ month: 11, day: 1 });
  });
  it('uses the previous winter solstice for Nabil and counts three Mi days', () => {
    for (const year of [2023, 2024, 2025, 2026]) {
      const winter = solarTerm(year - 1, 270);
      const nabil = row(year, 'nabil').solar;
      let miDays = 0;
      for (let d = addDays(winter, 1); dateNumber(d) <= dateNumber(nabil); d = addDays(d, 1)) {
        const calendar = new KoreanLunarCalendar();
        calendar.setSolarDate(d.year, d.month, d.day);
        if (calendar.getChineseGapja().day.includes('未')) miDays++;
      }
      expect(miDays).toBe(3);
      expect(nabil.year).toBe(year);
      expect(nabil.month).toBe(1);
    }
  });
  it('keeps every supported date in the selected Gregorian year and sorts stably', () => {
    for (let year = 1900; year <= 2050; year++) {
      const rows = calculateHolidays(year);
      expect(rows).toHaveLength(20);
      expect(rows.filter((r) => r.publicHoliday)).toHaveLength(4);
      rows.forEach((r, i) => {
        expect(r.solar?.year).toBe(year);
        expect(r.lunar).toEqual(solarToLunar(r.solar.year, r.solar.month, r.solar.day));
        if (i) expect(dateNumber(r.solar)).toBeGreaterThanOrEqual(dateNumber(rows[i - 1].solar));
      });
      expect(rows.findIndex((r) => r.id === 'jungwajeol')).toBe(rows.findIndex((r) => r.id === 'yeongdeung') + 1);
    }
  });
  it('returns all observances with unavailable dates outside the supported range', () => {
    for (const year of [1899, 2051, NaN]) expect(calculateHolidays(year).every((r) => r.solar === null && r.lunar === null)).toBe(true);
  });
  it('writes natural ordinals', () => {
    expect(calculationText(row(2026, 'yeongdeung'), 'en')).toContain('2nd lunar month');
  });
});
