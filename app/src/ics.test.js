import { describe, expect, it } from "vitest";
import { calculateMatches, calculateReverseMatches } from "./calendar.js";
import { createBirthdayIcs, createReverseIcs, escapeIcsText } from "./ics.js";

const generatedAt = new Date("2026-08-29T12:34:56Z");

function eventCount(content) {
  return content.match(/BEGIN:VEVENT/g)?.length || 0;
}

function unfold(content) {
  return content.replace(/\r\n /g, "");
}

describe("ICS calendar generation", () => {
  it("escapes reserved iCalendar text characters", () => {
    expect(escapeIcsText("A, B; C\\D\nE")).toBe("A\\, B\\; C\\\\D\\nE");
  });

  it("creates multiple all-day birthday events and marks Super Saengil years in English", () => {
    const result = calculateMatches({ mode: "solar", year: 1993, month: 3, day: 27 });
    const calendar = createBirthdayIcs({ result, lang: "en", name: "Mina", generatedAt });

    expect(calendar.filename).toBe("super-saengil-mina-3-5-regular.ics");
    expect(eventCount(calendar.content)).toBe(result.rows.filter((row) => row.recurrentSolar).length);
    expect(calendar.content).toContain("DTSTAMP:20260829T123456Z");
    expect(calendar.content).toContain("DTSTART;VALUE=DATE:19930327");
    expect(calendar.content).toContain("DTEND;VALUE=DATE:19930328");
    expect(calendar.content).toContain("SUMMARY:Mina's Super Saengil");
    expect(calendar.content).toContain("SUMMARY:Mina's Lunar Birthday");
    expect(unfold(calendar.content)).toContain("DESCRIPTION:Original input: March 27\\, 1993\\nKorean lunar birthday: Lunar March 5\\, 1993");
    expect(unfold(calendar.content)).toContain("Source: This content was retrieved from Super Saengil.");
    expect(calendar.content).not.toContain("Calculation note");
    expect(calendar.content).not.toContain("KARI/KASI-standard data");
  });

  it("limits birthday events by selected start and ending years", () => {
    const result = calculateMatches({ mode: "solar", year: 1993, month: 3, day: 27 });
    const calendar = createBirthdayIcs({ result, lang: "en", startYear: 1994, endYear: 1995, generatedAt });

    expect(eventCount(calendar.content)).toBe(2);
    expect(calendar.content).not.toContain("DTSTART;VALUE=DATE:19930327");
    expect(calendar.content).toContain("DTSTART;VALUE=DATE:19940415");
    expect(calendar.content).toContain("DTSTART;VALUE=DATE:19950404");
    expect(calendar.content).not.toContain("DTSTART;VALUE=DATE:19960422");
  });

  it("localizes birthday event text in Korean when Korean is active", () => {
    const result = calculateMatches({ mode: "lunar", year: 2017, month: 5, day: 1, isLeapMonth: true });
    const calendar = createBirthdayIcs({ result, lang: "ko", name: "민아", generatedAt });

    expect(calendar.filename).toBe("super-saengil-민아-5-1-leap.ics");
    expect(calendar.content).toContain("SUMMARY:민아 음력 생일");
    expect(calendar.content).toContain("입력한 생일: 2017년 5월 1일\\, 윤달");
    expect(calendar.content).toContain("출처: 이 콘텐츠는 슈퍼생일에서 가져왔습니다.");
    expect(eventCount(calendar.content)).toBeLessThan(result.rows.length);
  });

  it("uses the Korean honorific birthday term when selected", () => {
    const result = calculateMatches({ mode: "lunar", year: 2017, month: 5, day: 1, isLeapMonth: true });
    const calendar = createBirthdayIcs({ result, lang: "ko", name: "어머니", birthdayTerm: "honorific", generatedAt });

    expect(calendar.filename).toBe("super-saengil-어머니-5-1-leap.ics");
    expect(calendar.content).toContain("SUMMARY:어머니 음력 생신");
    expect(calendar.content).toContain("음력 생신: 2017년 5월 1일\\, 윤달");
  });

  it("creates reverse-search events from matching rows only", () => {
    const result = calculateReverseMatches({ mode: "solar", year: 2006, month: 8, day: 11 });
    const calendar = createReverseIcs({ result, lang: "en", name: "", generatedAt });

    expect(calendar.filename).toBe("super-saengil-reverse-search-2006-08-11.ics");
    expect(eventCount(calendar.content)).toBe(result.matches.length);
    expect(calendar.content).toContain("SUMMARY:Reverse Birthday Match");
    expect(calendar.content).toContain("Target date: August 11\\, 2006");
    expect(calendar.content).not.toContain("DTSTART;VALUE=DATE:19000811");
  });
});
