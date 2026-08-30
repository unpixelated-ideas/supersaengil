import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const distDir = resolve("dist");
const indexPath = resolve(distDir, "index.html");
let html = await readFile(indexPath, "utf8");

const stylesheetMatch = html.match(/<link rel="stylesheet" crossorigin href="(\.\/assets\/[^"]+\.css)">/);
if (stylesheetMatch) {
  const css = await readFile(resolve(distDir, stylesheetMatch[1]), "utf8");
  html = html.replace(stylesheetMatch[0], `<style>\n${css}\n</style>`);
}

const scriptMatch = html.match(/<script type="module" crossorigin src="(\.\/assets\/[^"]+\.js)"><\/script>/);
if (scriptMatch) {
  const js = await readFile(resolve(distDir, scriptMatch[1]), "utf8");
  html = html.replace(scriptMatch[0], `<script type="module">\n${js}\n</script>`);
}

await writeFile(indexPath, html);

for (const route of ["privacy", "terms", "updates", "history"]) {
  const routeDir = resolve(distDir, route);
  await mkdir(routeDir, { recursive: true });
  await writeFile(resolve(routeDir, "index.html"), html);
}
