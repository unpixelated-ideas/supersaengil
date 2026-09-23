import { translations } from './translations.js';
import { routePath } from './routes.js';

export const productionUrl = 'https://unpixelated-ideas.github.io/supersaengil/';

export function pageMetadata({ lang, page }) {
  const copy = translations[lang];
  const title = page ? `${copy[`${page}Title`]} · ${copy.appName}` : `${copy.appName} · ${copy.subtitle}`;
  const descriptions = {
    '': copy.infoSubheadline,
    privacy: copy.privacyIntro[0],
    terms: copy.termsIntro[0],
    updates: copy.updatesIntro,
    history: copy.historyDescription
  };
  const url = (locale) => new URL(routePath({ lang: locale, page }).slice(1), productionUrl).href;
  const description = descriptions[page];
  const socialTitle = page ? title : copy.appName;
  return {
    lang, title,
    metas: [
      ['name', 'description', description],
      ['property', 'og:title', socialTitle],
      ['property', 'og:description', description],
      ['property', 'og:type', 'website'],
      ['property', 'og:url', url(lang)],
      ['property', 'og:image', `${productionUrl}link-preview.png`],
      ['property', 'og:site_name', copy.appName],
      ['property', 'og:locale', lang === 'ko' ? 'ko_KR' : 'en_US'],
      ['property', 'og:locale:alternate', lang === 'ko' ? 'en_US' : 'ko_KR'],
      ['name', 'twitter:card', 'summary_large_image'],
      ['name', 'twitter:title', socialTitle],
      ['name', 'twitter:description', description],
      ['name', 'twitter:image', `${productionUrl}link-preview.png`]
    ],
    links: [
      { rel: 'canonical', href: url(lang) },
      ...['ko', 'en', 'x-default'].map((hreflang) => ({ rel: 'alternate', hreflang, href: url(hreflang === 'en' ? 'en' : 'ko') }))
    ]
  };
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function renderMetadata(metadata) {
  return [
    `<title>${escapeHtml(metadata.title)}</title>`,
    ...metadata.metas.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`),
    ...metadata.links.map((attrs) => `<link ${Object.entries(attrs).map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ')} />`)
  ].join('\n    ');
}

export function syncMetadata(route) {
  const metadata = pageMetadata(route);
  document.title = metadata.title;
  document.documentElement.lang = metadata.lang;
  for (const [attr, key, value] of metadata.metas) {
    let node = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!node) { node = document.createElement('meta'); node.setAttribute(attr, key); document.head.append(node); }
    node.content = value;
  }
  for (const attrs of metadata.links) {
    const selector = `link[rel="${attrs.rel}"]${attrs.hreflang ? `[hreflang="${attrs.hreflang}"]` : ''}`;
    let node = document.head.querySelector(selector);
    if (!node) { node = document.createElement('link'); document.head.append(node); }
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  }
}
