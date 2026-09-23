import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { languages, pages, routePath } from "../src/routes.js";
import { pageMetadata, renderMetadata } from "../src/metadata.js";

const distDir = resolve("dist");
const indexPath = resolve(distDir, "index.html");
let html = await readFile(indexPath, "utf8");

const stylesheetMatch = html.match(/<link rel="stylesheet" crossorigin href="(\.\/assets\/[^"]+\.css)">/);
if (!stylesheetMatch) throw new Error("Expected a single Vite stylesheet to inline");
if (stylesheetMatch) {
  const css = await readFile(resolve(distDir, stylesheetMatch[1]), "utf8");
  html = html.replace(stylesheetMatch[0], () => `<style>\n${css}\n</style>`);
}

const scriptMatch = html.match(/<script type="module" crossorigin src="(\.\/assets\/[^"]+\.js)"><\/script>/);
if (!scriptMatch) throw new Error("Expected a single Vite application script to inline");
if (scriptMatch) {
  const js = await readFile(resolve(distDir, scriptMatch[1]), "utf8");
  html = html.replace(scriptMatch[0], () => `<script type="module">\n${js}\n</script>`);
}

// Remove only the source head defaults, never strings within the bundled app.
const headEnd = html.indexOf('<script type="module">');
const head = html.slice(0, headEnd).replace(/<title>[\s\S]*?<\/title>/, '').replace(/<meta name="description"[^>]*>/, '');
const template = head + html.slice(headEnd);
for (const lang of languages) {
  for (const page of pages) {
    const route = { lang, page };
    const routeDir = resolve(distDir, routePath(route).slice(1));
    const depth = (lang === "en" ? 1 : 0) + (page ? 1 : 0);
    const assetPrefix = depth ? "../".repeat(depth) : "./";
    const localized = template
      .replace('<html lang="ko">', `<html lang="${lang}">`)
      .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${assetPrefix}favicon.png" type="image/png" />`)
      .replace('</head>', () => `${renderMetadata(pageMetadata(route))}\n  </head>`);
    await mkdir(routeDir, { recursive: true });
    await writeFile(resolve(routeDir, "index.html"), localized);
  }
}
