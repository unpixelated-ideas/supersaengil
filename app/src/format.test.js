import { describe, expect, it } from "vitest";

import { formatLunar } from "./format.js";

describe("date formatting", () => {
  it("omits regular-month labeling for English lunar dates", () => {
    expect(formatLunar({ year: 1993, month: 3, day: 5, isLeapMonth: false }, "en")).toBe("Lunar March 5, 1993");
  });

  it("labels only leap months for English lunar dates", () => {
    expect(formatLunar({ year: 1993, month: 3, day: 27, isLeapMonth: true }, "en")).toBe("Lunar March 27, 1993, leap month");
  });

  it("keeps Korean regular and leap month labels", () => {
    expect(formatLunar({ year: 1993, month: 3, day: 5, isLeapMonth: false }, "ko")).toBe("음력 1993년 3월 5일, 평달");
    expect(formatLunar({ year: 1993, month: 3, day: 27, isLeapMonth: true }, "ko")).toBe("음력 1993년 3월 27일, 윤달");
  });
});
