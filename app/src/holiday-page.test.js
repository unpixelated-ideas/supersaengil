import { describe, expect, it } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { koreanYearInfo, holidayCopy, holidayPageTemplate } from './holiday-page.js';
import { MIN_YEAR, MAX_YEAR } from './calendar.js';

describe('Korean year indicators', () => {
  it.each([
    [2024, '🐉', 'Dragon', 'Blue', '갑진년 · 甲辰年'],
    [2025, '🐍', 'Snake', 'Blue', '을사년 · 乙巳年'],
    [2026, '🐎', 'Horse', 'Red', '병오년 · 丙午年'],
    [2027, '🐑', 'Sheep', 'Red', '정미년 · 丁未年'],
    [2028, '🐒', 'Monkey', 'Yellow', '무신년 · 戊申年']
  ])('matches reference year %i', (year, emoji, animal, color, designation) => {
    const info = koreanYearInfo(year);
    expect([info.emoji, holidayCopy.en.animals[info.animalIndex], holidayCopy.en.colors[info.colorIndex], info.designation]).toEqual([emoji, animal, color, designation]);
  });
  it('uses all twelve specified Korean animals and emoji', () => {
    const expected = [
      ['Rat', '쥐', '🐀'], ['Cow', '소', '🐄'], ['Tiger', '호랑이', '🐅'],
      ['Rabbit', '토끼', '🐇'], ['Dragon', '용', '🐉'], ['Snake', '뱀', '🐍'],
      ['Horse', '말', '🐎'], ['Sheep', '양', '🐑'], ['Monkey', '원숭이', '🐒'],
      ['Chicken', '닭', '🐔'], ['Dog', '개', '🐕'], ['Pig', '돼지', '🐖']
    ];
    expect(expected.map((_, i) => {
      const info = koreanYearInfo(1984 + i);
      return [holidayCopy.en.animals[info.animalIndex], holidayCopy.ko.animals[info.animalIndex], info.emoji];
    })).toEqual(expected);
  });
  it('matches independent calendar gapja results and repeats every 60 years across the full selector range', () => {
    const calendar = new KoreanLunarCalendar();
    for (let year = MIN_YEAR; year <= MAX_YEAR; year++) {
      const info = koreanYearInfo(year);
      expect(koreanYearInfo(year + 60)).toEqual(info);
      if (year <= 2050) {
        calendar.setLunarDate(year, 1, 1, false);
        expect(info.designation).toBe(`${calendar.getKoreanGapja().year} · ${calendar.getChineseGapja().year}`);
      }
    }
    expect(new Set(Array.from({ length: 60 }, (_, i) => koreanYearInfo(1984 + i).designation)).size).toBe(60);
  });
  it('maps all ten heavenly stems to five traditional colors in both languages', () => {
    expect(Array.from({ length: 10 }, (_, i) => {
      const info = koreanYearInfo(1984 + i);
      return [info.color, holidayCopy.en.colors[info.colorIndex], holidayCopy.ko.colors[info.colorIndex]];
    })).toEqual([
      ...Array(2).fill(['blue', 'Blue', '푸른색']), ...Array(2).fill(['red', 'Red', '붉은색']),
      ...Array(2).fill(['yellow', 'Yellow', '노란색']), ...Array(2).fill(['white', 'White', '흰색']),
      ...Array(2).fill(['black', 'Black', '검은색'])
    ]);
  });
  it.each(['en', 'ko'])('renders localized accessible information below the selector in %s', (lang) => {
    document.body.innerHTML = holidayPageTemplate(lang, 2026, '/', 'Back');
    const indicators = document.querySelector('.holiday-year-indicators');
    expect([...indicators.querySelectorAll('dt')].map(e => e.textContent)).toEqual(lang === 'ko' ? ['띠', '색상'] : ['Animal', 'Color']);
    expect([...indicators.querySelectorAll('dd')].map(e => e.textContent)).toEqual(lang === 'ko' ? ['말', '붉은색'] : ['Horse', 'Red']);
    expect(indicators.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
    expect(indicators.querySelector('button')).toBeNull();
    expect(document.querySelector('.holiday-year').nextElementSibling.className).toBe('holiday-year-info');
    expect(document.querySelector('.holiday-year-info').nextElementSibling.textContent).toBe(holidayCopy[lang].intro);
  });
});
