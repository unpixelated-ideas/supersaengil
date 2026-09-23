export const languages = ['ko', 'en'];
export const pages = ['', 'privacy', 'terms', 'updates', 'history'];

// Strip the supported route suffix; the remaining segments are the deployment base.
// This also accepts the old explicit index.html links.
export function parseRoute(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.at(-1) === 'index.html') parts.pop();
  const page = pages.slice(1).includes(parts.at(-1)) ? parts.pop() : '';
  const lang = parts.at(-1) === 'en' ? (parts.pop(), 'en') : 'ko';
  const basePath = `/${parts.length ? `${parts.join('/')}/` : ''}`;
  return { basePath, lang, page, isHome: page === '' };
}

export function routePath({ basePath = '/', lang = 'ko', page = '' } = {}) {
  return `${basePath}${lang === 'en' ? 'en/' : ''}${page ? `${page}/` : ''}`;
}
