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

## Install as a desktop app

Open the deployed HTTPS homepage in Microsoft Edge and use the address-bar
installation icon, or Settings and more > More tools > Apps > Install this site
as an app. Install from the hosted site rather than the local file launcher.

`public/manifest.webmanifest` defines one standalone app covering both languages
and all pages. Its identity, start URL, scope, and icon URLs are relative to the
manifest, so they work at `/` and under the GitHub Pages `/supersaengil/` prefix.
The build adds a link to the same manifest at the correct depth in each generated
HTML page. Icons are resized from the existing `public/favicon.png` artwork.

No service worker is used or required for Edge installation. Updates are deployed
through the normal Pages workflow and loaded on refresh or a subsequent launch,
subject to normal HTTP caching. Offline launch is not guaranteed.

After deployment, verify installation in Edge on Windows, including the app icon,
language and page navigation, resizing, external links, calendar downloads, and
loading a new deployment after refreshing. Confirm HTTPS is enforced in the
repository's Pages settings.

## Calendar source and range

The app uses `korean-lunar-calendar` for dates within its supported KARI/KASI-standard data range:

- Solar: 1000-02-13 through 2050-12-31
- Lunar: 1000-01-01 through 2050-11-18

For 2051-2127, the app uses an embedded astronomical Korean lunisolar implementation based on the standard Korean-calendar rules: months begin at the astronomical new moon in Korea Standard Time, month 11 contains the winter solstice, and leap months are months without a principal solar term in years with 13 lunar months. This fallback is included because common KASI table packages do not currently cover the requested range through 2127.

## Leap-month behavior

The selected leap state is preserved. A leap-month birthday recurs only in years that have the same leap lunar month and a valid day in that month. If a year has no matching leap month, the table shows that the recurring lunar date does not exist for that year. The app never silently substitutes a regular month or a neighboring day.

## Known calendar limitations

KASI/KARI-backed table conversion is used through 2050. Dates after that are astronomical rule calculations in Korea Standard Time rather than direct KASI API/table lookups. They are suitable for the requested forward search, but future official KASI publications should be preferred if they publish verified data beyond 2050.

### Language routes and link previews

The URL selects the language: `/` is Korean and `/en/` is English. Both
support `privacy/`, `terms/`, `updates/`, and `history/`, under the same
hosting base (production uses `/supersaengil/`). Language switching preserves
the current page, query string, and hash; saved preferences do not override URLs.

`src/routes.js` defines the route matrix and shared path helpers.
`src/metadata.js` uses existing translations for metadata and owns the production
URL. `scripts/inline-build.mjs` generates all ten static HTML entries from one
Vite build, including localized canonical, hreflang, Open Graph, and Twitter
metadata. Runtime navigation uses the same metadata configuration.
The shared preview artwork is deployed from `public/link-preview.png`.

### Motion

`src/styles.css` defines shared 150 ms control, 220 ms content, and 300 ms
page timings. `src/motion.js` compares content around the existing render,
animates only changed regions, and restores focus on replaced controls.
Calculations and navigation remain synchronous; animations never gate actions.
Page entrances use opacity, while results and dialog entrances move only 3 px.
Holiday disclosures use native automatic-height interpolation where supported,
with ordinary native disclosure behavior elsewhere. Large result tables fade
rather than animating their height, preserving the existing scroll anchoring.
Reduced motion disables CSS animations/transitions (including the existing
export spinner) and uses immediate result scrolling. No motion library is used.
