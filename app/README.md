# 슈퍼생일 · Super Saengil

A responsive Korean/English web app that finds every year through 2127 when a recurring Korean lunar birthday falls on the same Gregorian month and day as the person's solar birthday.

## Install

```bash
cd app
pnpm install
```

## Run locally

```bash
cd app
pnpm dev
```

Open the local URL printed by Vite, usually `http://localhost:5173/`.

## Build

```bash
cd app
pnpm build
```

The repository root contains a single launcher file: `../index.html`. Open that file from Finder to enter the app.

Inside this `app/` folder, `index.html` is the Vite source entry. It imports source modules and npm packages that the browser cannot resolve without Vite.

After building, `dist/index.html` is the standalone app. The root launcher forwards to it and preserves query strings for shared birthday results.

## Test

```bash
cd app
pnpm test
```

## Calendar source and range

The app uses `korean-lunar-calendar` for dates within its supported KARI/KASI-standard data range:

- Solar: 1000-02-13 through 2050-12-31
- Lunar: 1000-01-01 through 2050-11-18

For 2051-2127, the app uses an embedded astronomical Korean lunisolar implementation based on the standard Korean-calendar rules: months begin at the astronomical new moon in Korea Standard Time, month 11 contains the winter solstice, and leap months are months without a principal solar term in years with 13 lunar months. This fallback is included because common KASI table packages do not currently cover the requested range through 2127.

## Leap-month behavior

The selected leap state is preserved. A leap-month birthday recurs only in years that have the same leap lunar month and a valid day in that month. If a year has no matching leap month, the table shows that the recurring lunar date does not exist for that year. The app never silently substitutes a regular month or a neighboring day.

## Known calendar limitations

KASI/KARI-backed table conversion is used through 2050. Dates after that are astronomical rule calculations in Korea Standard Time rather than direct KASI API/table lookups. They are suitable for the requested forward search, but future official KASI publications should be preferred if they publish verified data beyond 2050.
