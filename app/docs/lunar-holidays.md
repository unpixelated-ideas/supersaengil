# Lunar Holidays

Routes: `/holidays/` (Korean), `/en/holidays/` (English), beneath the existing deployment base. The static build emits both routes with localized metadata. The footer places this link immediately after Lunar Calendar Explained.

`holiday-data.js` holds the 20 observances and bilingual editorial content. `holidays.js` calculates and sorts dates. `holiday-page.js` renders the desktop table and native mobile disclosures. Changing languages retains the selected Gregorian year; a fresh page load defaults to the current local calendar year.

## Calendar conventions

- Supported years: 1900–2050, deliberately restricted to modern Korean table-backed conversions. Other years retain all 20 rows with localized unavailable values. The birthday calculator's broader range and astronomical fallback are unchanged.
- Fixed lunar holidays use the existing `calendar.js` conversions with regular months, plus a round-trip check. Seasonal dates can fall in a leap month and display that fact.
- New Year's Eve is the day before Seollal, including both 29- and 30-day twelfth months.
- Astronomy Engine calculates apparent solar-longitude crossings at 90°, 135°, and 270°. Event instants become civil dates in UTC+9 regardless of the browser's timezone. One new dependency: `astronomy-engine`.
- Sexagenary indexing uses `(JDN + 49) mod 60`, with Gyeong as heavenly stem 6 and Mi as earthly branch 7 (zero based).
- Bok counting includes the solar-term date if it is a Gyeong day. This matters for 2023, when June 21 is itself Gyeong and Chobok is July 11.
- Hansik adds 105 civil days to the previous winter solstice (the next day is day 1).
- Nabil counts the third Mi day strictly after the previous December solstice, so its displayed date is in January of the selected Gregorian year. The Joseon convention may put it after Seollal; it is not forcibly assigned to lunar month 12.
- Sangdal is the entire regular tenth lunar month, sorted by its start date.
- Public-holiday labels describe current classifications, not historical legal status or substitute holidays.

## References

- KASI calendar data: https://astro.kasi.re.kr/kor/life/post/calendarData?search_year=2024 (also 2025 and 2026). Independent fixtures cover Seollal, Chuseok, Buddha's Birthday, Hansik, the three Bok days, and Dongji. In particular, 2025 Dongji is shortly after Korean midnight on December 22.
- Academy of Korean Studies, Hansik: https://encykorea.aks.ac.kr/Article/E0061793
- Academy of Korean Studies, Nabil: https://encykorea.aks.ac.kr/Article/E0012335
- Astronomy Engine implementation: https://github.com/cosinekitty/astronomy

## Validation

`pnpm test` covers reference fixtures, leap months, both year-end month lengths, different Bok intervals, Nabil's branch/count using the Korean calendar library, tenth-month boundaries, chronological ordering and conversion consistency throughout 1900–2050, unavailable dates, footer order, language switching, and keyboard focus retention on year changes.

Browser inspection used the Codex in-app browser at 320, 375, 390, 430, 740, 844, and 1440 pixels, including portrait and landscape dimensions. Both languages have no page-wide horizontal overflow. Mobile cards retain every field without duplicating the name and date already in their summaries. The desktop table has its own overflow container. Header controls are adjusted only on this page to prevent Korean controls overflowing at narrow widths.

Physical iOS Safari and Android Chrome were not available for device testing. Browser-engine-specific and physical touch behavior remains a manual follow-up; viewport checks are not a substitute for real-device testing.
