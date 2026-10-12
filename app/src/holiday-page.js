import { calculateHolidays, HOLIDAY_MIN_YEAR, HOLIDAY_MAX_YEAR } from './holidays.js';
import { calculationText } from './holiday-data.js';
import { escapeHtml as escape } from './metadata.js';
import { MIN_YEAR, MAX_YEAR } from './calendar.js';

export const holidayCopy = {
  en: {
    title: 'Lunar Holidays', intro: 'Explore 20 Korean holidays and seasonal traditions, in the order they fall each year.',
    columns: ['English', 'Korean', 'Solar Calendar Date', 'Calculation', 'Lunar Calendar Date', 'Description', 'Public Holiday?'],
    previous: 'Previous year', next: 'Next year', year: 'Gregorian year', yes: 'Yes', no: 'No',
    unavailable: 'Date unavailable', month: '10th lunar month', leap: 'Leap ',
    note: 'Dates use the Korean calendar and Korea Standard Time. Regular lunar months are used; holidays are not repeated in leap months.',
    publicNote: 'Public-holiday labels reflect current South Korean classifications, not historical status or substitute days off. Lunar New Year’s Eve is part of the Seollal holiday period.',
    range: `Calculated dates are supported for ${HOLIDAY_MIN_YEAR}–${HOLIDAY_MAX_YEAR}. Dates outside this range are unavailable.`,
    hint: 'Select a holiday to see its calculation, lunar date, and story.',
    sources: 'Calendar references', kasi: 'Korea Astronomy and Space Science Institute', hansik: 'Hansik', nabil: 'Nabil'
  },
  ko: {
    title: '음력 명절', intro: '한국의 명절과 세시풍속 20가지를 해마다 돌아오는 날짜순으로 살펴보세요.',
    columns: ['한국어', '양력 날짜', '날짜 계산', '음력 날짜', '설명', '공휴일 여부'],
    previous: '이전 연도', next: '다음 연도', year: '양력 연도', yes: '예', no: '아니요',
    unavailable: '날짜 제공 불가', month: '음력 10월', leap: '윤',
    note: '한국 음력과 한국 표준시를 기준으로 계산합니다. 음력 명절은 평달을 기준으로 하며 윤달에 반복하지 않습니다.',
    publicNote: '공휴일 여부는 현재 대한민국의 분류를 나타내며, 과거의 공휴일 지정 여부나 대체공휴일은 반영하지 않습니다. 섣달그믐은 설 연휴에 포함되는 공휴일입니다.',
    range: `${HOLIDAY_MIN_YEAR}~${HOLIDAY_MAX_YEAR}년의 날짜를 제공합니다. 이 범위를 벗어난 연도는 정확한 날짜를 제공하지 않습니다.`,
    hint: '명절을 누르면 날짜 계산 방법과 음력 날짜, 설명을 볼 수 있습니다.',
    sources: '달력 참고 자료', kasi: '한국천문연구원', hansik: '한식', nabil: '납일'
  }
};

export function holidayPageTemplate(lang, year, homeHref, backLabel) {
  const c = holidayCopy[lang];
  const dateFormatter = new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const date = (value) => dateFormatter.format(new Date(Date.UTC(value.year, value.month - 1, value.day)));
  const solar = (row) => row.solar ? `${date(row.solar)}${row.end ? ` – ${date(row.end)}` : ''}` : c.unavailable;
  const lunar = (row) => !row.lunar ? c.unavailable : row.end ? c.month : `${row.lunar.isLeapMonth ? c.leap : ''}${lang === 'ko' ? `${row.lunar.month}월 ${row.lunar.day}일` : `${row.lunar.month}/${row.lunar.day}`}`;
  const status = (row) => `<span class="holiday-status ${row.publicHoliday ? 'is-public' : ''}"><span aria-hidden="true">${row.publicHoliday ? '✓' : ''}</span><span class="visually-hidden">${row.publicHoliday ? c.yes : c.no}</span></span>`;
  const name = (value) => {
    const [primary, ...secondary] = value.split(' / ');
    return `${escape(primary)}${secondary.length ? `<span class="holiday-secondary-name">${escape(secondary.join(' / '))}</span>` : ''}`;
  };
  const rows = calculateHolidays(year);
  const cells = (row) => [...(lang === 'en' ? [name(row.en)] : []), `<span lang="ko">${name(row.ko)}</span>`, escape(solar(row)), escape(calculationText(row, lang)), escape(lunar(row)), escape(row.description[lang]), status(row)];
  return `<main class="holidays-main">
    <article class="legal-card holidays-card" aria-labelledby="holidaysTitle">
      <a class="back-link" href="${escape(homeHref)}">${escape(backLabel)}</a>
      <header class="holiday-header">
        <h1 id="holidaysTitle">${c.title}</h1>
        <div class="holiday-year" role="group" aria-label="${c.year}">
          <button type="button" data-holiday-year="-1" aria-label="${c.previous}" ${year <= MIN_YEAR ? 'disabled' : ''}>←</button>
          <span id="holidayYear" role="status" aria-live="polite" aria-atomic="true">${lang === 'ko' ? `${year}년` : year}</span>
          <button type="button" data-holiday-year="1" aria-label="${c.next}" ${year >= MAX_YEAR ? 'disabled' : ''}>→</button>
        </div>
        <p>${c.intro}</p>
      </header>
      ${year < HOLIDAY_MIN_YEAR || year > HOLIDAY_MAX_YEAR ? `<p class="holiday-range holiday-unavailable">${c.range}</p>` : ''}
      <div class="holiday-table-scroll" role="region" aria-label="${c.title}" tabindex="0">
        <table class="holiday-table"><caption class="visually-hidden">${c.title} · ${year}</caption>
          <thead><tr>${c.columns.map((heading) => `<th scope="col">${heading}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((row) => `<tr data-holiday="${row.id}">${cells(row).map((value, index) => index === 0 ? `<th scope="row">${value}</th>` : `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="holiday-mobile"><p class="holiday-hint">${c.hint}</p>
        ${rows.map((row) => `<details class="holiday-item" data-holiday="${row.id}">
          <summary><span class="holiday-summary"><strong>${name(lang === 'ko' ? row.ko : row.en)}</strong><span class="holiday-date">${escape(solar(row))}</span></span><span class="holiday-chevron" aria-hidden="true">⌄</span></summary>
          <dl>${cells(row).map((value, index) => index === 0 || index === (lang === 'en' ? 2 : 1) ? '' : `<div><dt>${c.columns[index]}</dt><dd>${value}</dd></div>`).join('')}</dl>
        </details>`).join('')}
      </div>
      <div class="holiday-footnotes" hidden>
      <p class="holiday-note">${c.note}</p>
      ${year >= HOLIDAY_MIN_YEAR && year <= HOLIDAY_MAX_YEAR ? `<p class="holiday-range">${c.range}</p>` : ''}
      <p class="holiday-note holiday-public-note">${c.publicNote}</p>
      <p class="holiday-sources">${c.sources}: <a href="https://astro.kasi.re.kr/kor/life/post/calendarData">${c.kasi}</a> · <a href="https://encykorea.aks.ac.kr/Article/E0061793">${c.hansik}</a> · <a href="https://encykorea.aks.ac.kr/Article/E0012335">${c.nabil}</a></p>
      </div>
    </article>
  </main>`;
}
