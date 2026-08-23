import KoreanLunarCalendar from "korean-lunar-calendar";

export const MAX_YEAR = 2127;
export const MIN_YEAR = 1000;
const TABLE_SOLAR_END = { year: 2050, month: 12, day: 31 };
const SYNODIC_MONTH = 29.530588853;
const KST_OFFSET_DAYS = 9 / 24;

const monthCache = new Map();

export function isGregorianDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInGregorianMonth(year, month);
}

export function daysInGregorianMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function solarToLunar(year, month, day) {
  if (!isGregorianDate(year, month, day)) return null;
  if (isWithinTableSolar(year, month, day)) {
    const calendar = new KoreanLunarCalendar();
    if (!calendar.setSolarDate(year, month, day)) return null;
    const lunar = calendar.getLunarCalendar();
    return {
      year: lunar.year,
      month: lunar.month,
      day: lunar.day,
      isLeapMonth: Boolean(lunar.intercalation),
      source: "kari-table"
    };
  }
  return astronomicalSolarToLunar(year, month, day);
}

export function lunarToSolar(year, month, day, isLeapMonth = false) {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 30) return null;
  if (year <= 2050) {
    const calendar = new KoreanLunarCalendar();
    if (!calendar.setLunarDate(year, month, day, Boolean(isLeapMonth))) return null;
    const solar = calendar.getSolarCalendar();
    return { year: solar.year, month: solar.month, day: solar.day, source: "kari-table" };
  }
  return astronomicalLunarToSolar(year, month, day, Boolean(isLeapMonth));
}

export function calculateMatches({ mode, year, month, day, isLeapMonth = false }) {
  let solarBirthday;
  let lunarBirthday;

  if (mode === "solar") {
    solarBirthday = { year, month, day };
    lunarBirthday = solarToLunar(year, month, day);
    if (!lunarBirthday) throw new Error("invalidGregorian");
  } else {
    lunarBirthday = { year, month, day, isLeapMonth };
    const convertedSolar = lunarToSolar(year, month, day, isLeapMonth);
    if (!convertedSolar) throw new Error(isLeapMonth ? "invalidLeap" : "invalidLunar");
    solarBirthday = convertedSolar;
  }

  const rows = [];
  const matches = [];
  for (let currentYear = year; currentYear <= MAX_YEAR; currentYear += 1) {
    const recurrentSolar = lunarToSolar(
      currentYear,
      lunarBirthday.month,
      lunarBirthday.day,
      lunarBirthday.isLeapMonth
    );
    const isMatch = Boolean(
      recurrentSolar &&
      recurrentSolar.month === solarBirthday.month &&
      recurrentSolar.day === solarBirthday.day
    );
    if (isMatch) matches.push(currentYear);
    rows.push({
      year: currentYear,
      solarBirthday: { year: currentYear, month: solarBirthday.month, day: solarBirthday.day },
      recurrentSolar,
      lunarBirthday: {
        year: currentYear,
        month: lunarBirthday.month,
        day: lunarBirthday.day,
        isLeapMonth: lunarBirthday.isLeapMonth
      },
      isMatch,
      missingReason: recurrentSolar ? "" : "missing"
    });
  }

  return { mode, solarBirthday, lunarBirthday, rows, matches };
}

export function calculateReverseMatches({ mode = "solar", year, month, day, isLeapMonth = false, startYear = 1900 }) {
  let targetDate;
  let targetLunarBirthday;

  if (mode === "lunar") {
    targetLunarBirthday = { year, month, day, isLeapMonth };
    targetDate = lunarToSolar(year, month, day, isLeapMonth);
    if (!targetDate) throw new Error(isLeapMonth ? "invalidLeap" : "invalidLunar");
  } else {
    targetDate = { year, month, day };
    targetLunarBirthday = solarToLunar(year, month, day);
    if (!targetLunarBirthday) throw new Error("invalidGregorian");
  }

  const rows = [];
  for (let currentYear = startYear; currentYear <= year; currentYear += 1) {
    let solarBirthday = null;
    let lunarBirthday = null;
    let recurrentSolar = null;
    let isMatch = false;

    if (mode === "lunar") {
      solarBirthday = lunarToSolar(currentYear, month, day, isLeapMonth);
      lunarBirthday = solarBirthday ? { year: currentYear, month, day, isLeapMonth } : null;
      recurrentSolar = solarBirthday ? targetDate : null;
      isMatch = Boolean(
        solarBirthday &&
        solarBirthday.month === targetDate.month &&
        solarBirthday.day === targetDate.day
      );
    } else if (isGregorianDate(currentYear, month, day)) {
      solarBirthday = { year: currentYear, month, day };
      lunarBirthday = solarToLunar(currentYear, month, day);
      recurrentSolar = lunarBirthday
        ? lunarToSolar(year, lunarBirthday.month, lunarBirthday.day, lunarBirthday.isLeapMonth)
        : null;
      isMatch = Boolean(
        recurrentSolar &&
        recurrentSolar.month === targetDate.month &&
        recurrentSolar.day === targetDate.day
      );
    }

    rows.push({
      year: currentYear,
      solarBirthday,
      recurrentSolar,
      lunarBirthday,
      isMatch,
      missingReason: solarBirthday && lunarBirthday && recurrentSolar ? "" : "missing"
    });
  }

  return {
    mode: "reverse",
    targetMode: mode,
    targetDate,
    targetLunarBirthday,
    rows,
    matches: rows.filter((row) => row.isMatch)
  };
}

export function getDisplayRows(rows, expanded) {
  if (rows.length <= 8) return { before: rows, middle: [], after: [], omitted: 0, hasControl: false };
  const before = rows.slice(0, 3);
  const middle = expanded ? rows.slice(3, -3) : [];
  const after = rows.slice(-3);
  return { before, middle, after, omitted: rows.length - before.length - after.length, hasControl: true };
}

function isWithinTableSolar(year, month, day) {
  if (year < TABLE_SOLAR_END.year) return true;
  if (year > TABLE_SOLAR_END.year) return false;
  if (month < TABLE_SOLAR_END.month) return true;
  if (month > TABLE_SOLAR_END.month) return false;
  return day <= TABLE_SOLAR_END.day;
}

/* Calendar implementation notes:
 * - 1000-2050 conversions use `korean-lunar-calendar`, which bundles KARI
 *   (Korea Astronomy and Space Science Institute) Korean lunar-solar tables.
 * - The package's published range ends at solar 2050-12-31 / lunar 2050-11-18.
 * - For 2051-2127 this module builds Korean lunar years astronomically in KST.
 *   New lunar months start at astronomical new moon in Korea Standard Time.
 *   Month 11 contains winter solstice; in a 13-month lunar year, the first
 *   month without a principal solar term is marked as the leap month.
 * - Leap-month birthdays are not substituted. If a requested leap month does
 *   not occur in a recurrence year, `lunarToSolar` returns null and the table
 *   displays that the date does not exist.
 */

function astronomicalLunarToSolar(year, month, day, isLeapMonth) {
  const months = buildLunarYear(year);
  const target = months.find((item) => item.month === month && item.isLeapMonth === isLeapMonth);
  if (!target || day > target.length) return null;
  const gregorian = jdnToGregorian(target.startJdn + day - 1);
  return { ...gregorian, source: "astronomical-kst" };
}

function astronomicalSolarToLunar(year, month, day) {
  const jdn = gregorianToJdn(year, month, day);
  const approxYear = month >= 12 ? year + 1 : year;
  for (const lunarYear of [approxYear - 1, approxYear, approxYear + 1]) {
    const months = buildLunarYear(lunarYear);
    const target = months.find((item) => jdn >= item.startJdn && jdn < item.nextStartJdn);
    if (target) {
      return {
        year: lunarYear,
        month: target.month,
        day: jdn - target.startJdn + 1,
        isLeapMonth: target.isLeapMonth,
        source: "astronomical-kst"
      };
    }
  }
  return null;
}

function buildLunarYear(lunarYear) {
  if (monthCache.has(lunarYear)) return monthCache.get(lunarYear);
  const prevM11 = month11StartJdn(lunarYear - 1);
  const thisM11 = month11StartJdn(lunarYear);
  const starts = [prevM11];
  while (starts[starts.length - 1] < thisM11) {
    starts.push(nextNewMoonStartJdn(starts[starts.length - 1] + 1));
  }
  const monthCount = starts.length - 1;
  let leapIndex = -1;
  if (monthCount === 13) {
    leapIndex = starts.slice(0, -1).findIndex((start, index) => !hasPrincipalTerm(start, starts[index + 1]));
  }

  const months = starts.slice(0, -1).map((start, index) => {
    let monthNumber = 11 + index;
    if (monthNumber > 12) monthNumber -= 12;
    if (leapIndex >= 0 && index > leapIndex) monthNumber -= 1;
    if (monthNumber < 1) monthNumber += 12;
    return {
      month: monthNumber,
      isLeapMonth: index === leapIndex,
      startJdn: start,
      nextStartJdn: starts[index + 1],
      length: starts[index + 1] - start
    };
  });
  monthCache.set(lunarYear, months);
  return months;
}

function month11StartJdn(gregorianYear) {
  const winterSolsticeJdn = localDateOfSolarLongitude(gregorianYear, 12, 15, 270);
  return previousNewMoonStartJdn(winterSolsticeJdn + 1);
}

function hasPrincipalTerm(startJdn, nextStartJdnValue) {
  const startLongitude = normalizeDegrees(solarLongitude(startJdn - KST_OFFSET_DAYS + 0.5));
  const endLongitude = normalizeDegrees(solarLongitude(nextStartJdnValue - KST_OFFSET_DAYS + 0.5));
  let startTerm = Math.floor(startLongitude / 30);
  let endTerm = Math.floor(endLongitude / 30);
  if (endTerm < startTerm) endTerm += 12;
  return endTerm > startTerm;
}

function localDateOfSolarLongitude(year, month, day, targetLongitude) {
  let low = gregorianToJdn(year, month, day) - 5 - KST_OFFSET_DAYS;
  let high = gregorianToJdn(year, month, day) + 10 - KST_OFFSET_DAYS;
  for (let i = 0; i < 48; i += 1) {
    const mid = (low + high) / 2;
    const diff = normalizeDegrees(solarLongitude(mid) - targetLongitude);
    if (diff < 180) high = mid;
    else low = mid;
  }
  return Math.floor(high + KST_OFFSET_DAYS + 0.5);
}

function previousNewMoonStartJdn(jdn) {
  let k = Math.floor((jdn - 2451550.09765) / SYNODIC_MONTH) + 1;
  while (newMoonLocalStartJdn(k) >= jdn) k -= 1;
  while (newMoonLocalStartJdn(k + 1) < jdn) k += 1;
  return newMoonLocalStartJdn(k);
}

function nextNewMoonStartJdn(jdn) {
  let k = Math.floor((jdn - 2451550.09765) / SYNODIC_MONTH);
  while (newMoonLocalStartJdn(k) < jdn) k += 1;
  return newMoonLocalStartJdn(k);
}

function newMoonLocalStartJdn(k) {
  return Math.floor(newMoon(k) + KST_OFFSET_DAYS + 0.5);
}

function newMoon(k) {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const jde = 2451550.09765 + SYNODIC_MONTH * k + 0.0001337 * t2 - 0.000000150 * t3 + 0.00000000073 * t4;
  const e = 1 - 0.002516 * t - 0.0000074 * t2;
  const m = degToRad(2.5534 + 29.10535670 * k - 0.0000014 * t2 - 0.00000011 * t3);
  const mp = degToRad(201.5643 + 385.81693528 * k + 0.0107582 * t2 + 0.00001238 * t3 - 0.000000058 * t4);
  const f = degToRad(160.7108 + 390.67050284 * k - 0.0016118 * t2 - 0.00000227 * t3 + 0.000000011 * t4);
  const omega = degToRad(124.7746 - 1.56375588 * k + 0.0020672 * t2 + 0.00000215 * t3);
  let correction = -0.40720 * Math.sin(mp);
  correction += 0.17241 * e * Math.sin(m);
  correction += 0.01608 * Math.sin(2 * mp);
  correction += 0.01039 * Math.sin(2 * f);
  correction += 0.00739 * e * Math.sin(mp - m);
  correction -= 0.00514 * e * Math.sin(mp + m);
  correction += 0.00208 * e * e * Math.sin(2 * m);
  correction -= 0.00111 * Math.sin(mp - 2 * f);
  correction -= 0.00057 * Math.sin(mp + 2 * f);
  correction += 0.00056 * e * Math.sin(2 * mp + m);
  correction -= 0.00042 * Math.sin(3 * mp);
  correction += 0.00042 * e * Math.sin(m + 2 * f);
  correction += 0.00038 * e * Math.sin(m - 2 * f);
  correction -= 0.00024 * e * Math.sin(2 * mp - m);
  correction -= 0.00017 * Math.sin(omega);
  return jde + correction;
}

function solarLongitude(jd) {
  const t = (jd - 2451545.0) / 36525;
  const l0 = normalizeDegrees(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
  const m = degToRad(normalizeDegrees(357.52911 + 35999.05029 * t - 0.0001537 * t * t));
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m);
  return normalizeDegrees(l0 + c);
}

function gregorianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function degToRad(value) {
  return (value * Math.PI) / 180;
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}
