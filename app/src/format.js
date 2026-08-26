const koMonths = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const enMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export function formatSolar(date, lang, includePrefix = true) {
  if (!date) return "";
  if (lang === "ko") {
    const value = `${date.year}년 ${date.month}월 ${date.day}일`;
    return includePrefix ? `양력 ${value}` : value;
  }
  const value = `${enMonths[date.month - 1]} ${date.day}, ${date.year}`;
  return includePrefix ? `Solar: ${value}` : value;
}

export function formatIsoDate(date) {
  if (!date) return "";
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function formatLunar(date, lang, includePrefix = true) {
  if (!date) return "";
  if (lang === "ko") {
    const kind = date.isLeapMonth ? "윤달" : "평달";
    const value = `${date.year}년 ${date.month}월 ${date.day}일, ${kind}`;
    return includePrefix ? `음력 ${value}` : value;
  }
  const value = `Lunar ${enMonths[date.month - 1]} ${date.day}, ${date.year}`;
  return date.isLeapMonth ? `${value}, leap month` : value;
}

export function formatYear(year, lang) {
  return lang === "ko" ? `${year}년` : String(year);
}
