import { SearchSunLongitude } from 'astronomy-engine';
import { lunarToSolar, solarToLunar } from './calendar.js';
import { holidays } from './holiday-data.js';

// Limit this reference page to modern, table-backed Korean lunar dates.
// The birthday calculator's post-2050 astronomical fallback is not used here.
export const HOLIDAY_MIN_YEAR = 1900;
export const HOLIDAY_MAX_YEAR = 2050;
const DAY = 86400000;
const cache = new Map();
const mod = (n, divisor) => ((n % divisor) + divisor) % divisor;
export const dateNumber = ({ year, month, day }) => Date.UTC(year, month - 1, day) / DAY;
const fromNumber = (n) => {
  const date = new Date(n * DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};
export const addDays = (date, days) => fromNumber(dateNumber(date) + days);

export function solarTerm(year, longitude) {
  const month = { 90: 6, 135: 8, 270: 12 }[longitude];
  if (!month) return null;
  const event = SearchSunLongitude(longitude, new Date(Date.UTC(year, month - 1, 1)), 30);
  if (!event) return null;
  // Convert the instant to a Korean civil date, independently of browser timezone.
  return fromNumber(Math.floor((event.date.getTime() + 9 * 3600000) / DAY));
}

export function cycleDay(date, cycle, target, occurrence, inclusive = true) {
  // JDN + 49 is the zero-based sexagenary day (갑자 = 0).
  // Heavenly stem 庚 = 6 (mod 10); earthly branch 未 = 7 (mod 12).
  const first = dateNumber(date) + (inclusive ? 0 : 1);
  const index = mod(first + 2440588 + 49, cycle);
  return fromNumber(first + mod(target - index, cycle) + (occurrence - 1) * cycle);
}

function regularLunarDate(year, month, day) {
  const result = lunarToSolar(year, month, day, false);
  if (!result || result.source !== 'kari-table') return null;
  const back = solarToLunar(result.year, result.month, result.day);
  return back && back.year === year && back.month === month && back.day === day && !back.isLeapMonth ? result : null;
}

function calculateDate(holiday, year, terms) {
  if (holiday.rule === 'lunar') {
    return [year - 1, year, year + 1].map((y) => regularLunarDate(y, holiday.month, holiday.day)).find((date) => date?.year === year) || null;
  }
  switch (holiday.rule) {
    case 'eve': {
      const newYear = regularLunarDate(year, 1, 1);
      return newYear ? addDays(newYear, -1) : null;
    }
    case 'sangdal': return regularLunarDate(year, 10, 1);
    case 'hansik': return addDays(terms.previousWinter, 105);
    case 'chobok': return cycleDay(terms.summer, 10, 6, 3);
    case 'jungbok': return cycleDay(terms.summer, 10, 6, 4);
    case 'malbok': return cycleDay(terms.autumn, 10, 6, 1);
    case 'dongji': return terms.winter;
    case 'nabil': return cycleDay(terms.previousWinter, 12, 7, 3, false);
    default: return null;
  }
}

export function calculateHolidays(year) {
  if (cache.has(year)) return cache.get(year);
  const supported = Number.isInteger(year) && year >= HOLIDAY_MIN_YEAR && year <= HOLIDAY_MAX_YEAR;
  const terms = supported ? {
    previousWinter: solarTerm(year - 1, 270), winter: solarTerm(year, 270),
    summer: solarTerm(year, 90), autumn: solarTerm(year, 135)
  } : null;
  const rows = holidays.map((holiday) => {
    let solar = supported ? calculateDate(holiday, year, terms) : null;
    let lunar = solar ? solarToLunar(solar.year, solar.month, solar.day) : null;
    let end = null;
    if (solar && holiday.rule === 'sangdal') {
      // Walk the actual regular month, stopping before a leap month if present.
      end = solar;
      for (let offset = 1; offset <= 30; offset++) {
        const next = addDays(solar, offset);
        const value = solarToLunar(next.year, next.month, next.day);
        if (!value || value.month !== 10 || value.isLeapMonth) break;
        end = next;
      }
    }
    if (solar?.year !== year || !lunar || (end && end.year !== year)) { solar = null; lunar = null; end = null; }
    return { ...holiday, solar, lunar, end };
  }).sort((a, b) => (a.solar ? dateNumber(a.solar) : Infinity) - (b.solar ? dateNumber(b.solar) : Infinity));
  if (supported) cache.set(year, rows);
  return rows;
}
