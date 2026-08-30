import { formatIsoDate, formatLunar, formatSolar } from "./format.js";

const CALENDAR_ATTRIBUTION = {
  ko: "이 콘텐츠는 슈퍼생일에서 가져왔습니다.",
  en: "This content was retrieved from Super Saengil."
};

const TEXT = {
  ko: {
    lunarBirthday: "음력 {birthdayTerm}",
    superSaengil: "슈퍼생일",
    reverseMatch: "역방향 생일 일치",
    originalInput: "입력한 {birthdayTerm}",
    targetDate: "대상 날짜",
    birthDate: "생년월일",
    lunarBirthdayLabel: "음력 {birthdayTerm}",
    gregorianDate: "양력 날짜",
    superSaengilNote: "이 해에는 양력 생일과 음력 생일이 같은 날짜에 만나는 슈퍼생일입니다.",
    reverseNote: "이 날짜는 대상 날짜와 같은 양력/음력 관계를 가진 역방향 검색 결과입니다.",
    sourceNote: "출처",
    filenameBirthday: "음력-{birthdayTerm}",
    filenameReverse: "역방향-검색"
  },
  en: {
    lunarBirthday: "Lunar Birthday",
    superSaengil: "Super Saengil",
    reverseMatch: "Reverse Birthday Match",
    originalInput: "Original input",
    targetDate: "Target date",
    birthDate: "Birth date",
    lunarBirthdayLabel: "Korean lunar birthday",
    gregorianDate: "Gregorian date",
    superSaengilNote: "This is a Super Saengil year, when the solar and lunar birthdays fall on the same date.",
    reverseNote: "This date is a reverse-search result with the same solar/lunar date relationship as the target date.",
    sourceNote: "Source",
    filenameBirthday: "lunar-birthday",
    filenameReverse: "reverse-search"
  }
};

export function createBirthdayIcs({ result, lang = "en", name = "", birthdayTerm = "birthday", startYear = -Infinity, endYear = Infinity, generatedAt = new Date() }) {
  const normalizedLang = normalizeLang(lang);
  const text = localizedText(normalizedLang, birthdayTerm);
  const cleanName = String(name || "").trim();
  const events = result.rows
    .filter((row) => row.recurrentSolar && row.recurrentSolar.year >= startYear && row.recurrentSolar.year <= endYear)
    .map((row) => {
      const isSuper = Boolean(row.isMatch);
      const summary = personTitle(cleanName, isSuper ? text.superSaengil : text.lunarBirthday, normalizedLang);
      const description = [
        `${text.originalInput}: ${formatInput(result.mode, result.solarBirthday, result.lunarBirthday, normalizedLang)}`,
        `${text.lunarBirthdayLabel}: ${formatLunar(row.lunarBirthday, normalizedLang, false)}`,
        `${text.gregorianDate}: ${formatSolar(row.recurrentSolar, normalizedLang, false)}`,
        ...(isSuper ? [text.superSaengilNote] : []),
        `${text.sourceNote}: ${CALENDAR_ATTRIBUTION[normalizedLang]}`
      ].join("\n");

      return {
        date: row.recurrentSolar,
        summary,
        description,
        uid: `birthday-${formatIsoDate(row.recurrentSolar)}-${lunarKey(row.lunarBirthday)}@super-saengil`
      };
    });

  return {
    content: buildIcsCalendar(events, generatedAt),
    filename: safeFilename(["super-saengil", cleanName || text.filenameBirthday, lunarKey(result.lunarBirthday)])
  };
}

export function createReverseIcs({ result, lang = "en", name = "", startYear = -Infinity, endYear = Infinity, generatedAt = new Date() }) {
  const normalizedLang = normalizeLang(lang);
  const text = TEXT[normalizedLang];
  const cleanName = String(name || "").trim();
  const events = result.matches
    .filter((row) => row.solarBirthday && row.solarBirthday.year >= startYear && row.solarBirthday.year <= endYear)
    .map((row) => {
      const summary = personTitle(cleanName, text.reverseMatch, normalizedLang);
      const description = [
        `${text.targetDate}: ${formatSolar(result.targetDate, normalizedLang, false)}`,
        `${text.birthDate}: ${formatSolar(row.solarBirthday, normalizedLang, false)}`,
        `${text.lunarBirthdayLabel}: ${formatLunar(row.lunarBirthday, normalizedLang, false)}`,
        text.reverseNote,
        `${text.sourceNote}: ${CALENDAR_ATTRIBUTION[normalizedLang]}`
      ].join("\n");

      return {
        date: row.solarBirthday,
        summary,
        description,
        uid: `reverse-${formatIsoDate(row.solarBirthday)}-${formatIsoDate(result.targetDate)}@super-saengil`
      };
    });

  return {
    content: buildIcsCalendar(events, generatedAt),
    filename: safeFilename(["super-saengil", cleanName || text.filenameReverse, formatIsoDate(result.targetDate)])
  };
}

export function buildIcsCalendar(events, generatedAt = new Date()) {
  const stamp = formatIcsTimestamp(generatedAt);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Super Saengil//Lunar Birthday Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flatMap((event) => eventLines(event, stamp)),
    "END:VCALENDAR"
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function downloadTextFile(content, filename, mimeType = "text/calendar;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function escapeIcsText(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function eventLines(event, stamp) {
  return [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(event.date)}`,
    `DTEND;VALUE=DATE:${formatIcsDate(addDays(event.date, 1))}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT"
  ];
}

function formatInput(mode, solarBirthday, lunarBirthday, lang) {
  return mode === "solar"
    ? formatSolar(solarBirthday, lang, false)
    : formatLunar(lunarBirthday, lang, false);
}

function personTitle(name, title, lang) {
  if (!name) return title;
  return lang === "ko" ? `${name} ${title}` : `${name}'s ${title}`;
}

function formatIcsDate(date) {
  return `${date.year}${String(date.month).padStart(2, "0")}${String(date.day).padStart(2, "0")}`;
}

function formatIcsTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function addDays(date, days) {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

function lunarKey(date) {
  const leap = date.isLeapMonth ? "leap" : "regular";
  return `${date.month}-${date.day}-${leap}`;
}

function safeFilename(parts) {
  const basename = parts
    .filter(Boolean)
    .join("-")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${basename || "super-saengil"}.ics`;
}

function foldIcsLine(line) {
  if (line.length <= 75) return line;
  const chunks = [];
  let remaining = line;
  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75));
    remaining = ` ${remaining.slice(75)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

function normalizeLang(lang) {
  return lang === "ko" ? "ko" : "en";
}

function localizedText(lang, birthdayTerm) {
  const term = lang === "ko" && birthdayTerm === "honorific" ? "생신" : "생일";
  return Object.fromEntries(
    Object.entries(TEXT[lang]).map(([key, value]) => [key, String(value).replaceAll("{birthdayTerm}", term)])
  );
}
