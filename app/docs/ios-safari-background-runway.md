# iOS Safari Background Runway

## Problem

iOS and iPadOS Safari can show a hard horizontal edge between the browser/status area and the page when a page starts with a decorative gradient, radial glow, image, video, or fixed background layer.

This is especially noticeable in Safari 26 / Liquid Glass. Safari may sample a simple `html` or `body` background color for its chrome instead of rendering or sampling the visible CSS gradient. If the first visible page pixels are already tinted by a gradient, the browser chrome and page can disagree, creating an abrupt line at the top.

## Working Pattern

Use a solid top runway before any decorative background begins.

```css
:root {
  --canvas-top: #ffffff;
  --theme-color: #ffffff;
  --canvas-background:
    linear-gradient(180deg, var(--canvas-top) 0, var(--canvas-top) 15rem, rgba(255, 255, 255, 0) 21rem),
    radial-gradient(circle at 0 20rem, rgba(245, 158, 11, 0.16), transparent 30rem),
    linear-gradient(180deg, var(--canvas-top) 0, var(--canvas-top) 15rem, #fff4df 24rem, var(--bg) 38rem, var(--bg) 100%);
}

:root[data-theme="dark"] {
  --canvas-top: #071020;
  --theme-color: #071020;
}

html {
  background: var(--canvas-background);
  background-color: var(--canvas-top);
}

body {
  background: var(--canvas-top);
}
```

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#ffffff" />
```

```js
const themeColor = getComputedStyle(document.documentElement)
  .getPropertyValue("--theme-color")
  .trim();

document
  .querySelector('meta[name="theme-color"]')
  ?.setAttribute("content", themeColor);
```

## Rules Of Thumb

- Do not start the page with a gradient if it needs to touch iOS Safari chrome.
- Give `html` and `body` explicit, non-transparent background colors.
- Make the first visible top band a solid color that matches `theme-color`.
- Delay radial glows, gradients, images, and decorative backgrounds until below the header/safe-area region.
- Avoid fixed full-screen background layers when Safari chrome tinting behaves oddly.
- Keep `viewport-fit=cover`, but do not expect it to make Safari render a CSS gradient in the status area.
- Treat `theme-color` as a flat fallback, not as part of the design.

Short version: solid top runway first, decorative background later.
