// Compare rendered content, not actions: repeated calculations and unrelated
// settings changes should not replay entrances across the entire interface.
const regions = [
  '.summary-card', '.table-section .table-wrap', '.holiday-table-scroll',
  '.holiday-mobile', '#holidayYear', '#birthdayForm',
  '.modal-backdrop', '.password-dialog', '.error', '#copyResults'
];

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function contentSignature(node) {
  if (!node) return undefined;
  const copy = node.cloneNode(true);
  copy.querySelectorAll(".motion-page, .motion-update, .motion-enter").forEach((child) => {
    child.classList.remove("motion-page", "motion-update", "motion-enter");
    if (!child.className) child.removeAttribute("class");
  });
  // Copy confirmation has its own transition, independent of the results.
  copy.querySelector("#copyResults")?.remove();
  return copy.innerHTML;
}

export function captureMotion(root) {
  const content = new Map(regions.map((selector) => [selector, contentSignature(root.querySelector(selector))]));
  const active = root.contains(document.activeElement) ? document.activeElement : null;
  // These attributes identify existing controls without depending on translated text.
  const identity = active && ['id', 'data-mode', 'data-reverse-mode', 'data-lang',
    'data-appearance', 'data-lang-select', 'data-appearance-select',
    'data-holiday-year', 'data-reset-search', 'name'].find((attr) => active.hasAttribute(attr));
  return { content, page: root.querySelector('main')?.className.replace(/\bmotion-(page|enter|update)\b/g, '').trim(), path: root.dataset.motionPath,
    focus: identity ? { attr: identity, value: active.getAttribute(identity), inputValue: active.value } : null };
}

export function finishMotion(root, previous) {
  const path = location.pathname;
  root.dataset.motionPath = path;
  if (previous.focus) {
    const { attr, value, inputValue } = previous.focus;
    const control = [...root.querySelectorAll(`[${attr}]`)].find((node) =>
      node.getAttribute(attr) === value && (node.type !== 'radio' || node.value === inputValue));
    control?.focus({ preventScroll: true });
  }
  if (prefersReducedMotion()) return;
  const pageChanged = previous.path !== path || previous.page !== root.querySelector('main')?.className;
  if (pageChanged) {
    root.querySelector('main')?.classList.add('motion-page');
    return;
  }
  const animated = [];
  for (const selector of regions) {
    const node = root.querySelector(selector);
    if (!node || !node.textContent.trim() || contentSignature(node) === previous.content.get(selector)) continue;
    if (animated.some((parent) => parent.contains(node))) continue;
    const className = selector === '.summary-card' || selector === '.password-dialog' ? 'motion-enter' : 'motion-update';
    // Results can start below the fold: play the entrance when scrolling
    // brings them into view, without hiding content or delaying calculation.
    const rect = node.getBoundingClientRect();
    if (selector === '.summary-card' && rect.top >= window.innerHeight && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (!node.isConnected || entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          if (node.isConnected && !prefersReducedMotion()) node.classList.add(className);
        }
      });
      observer.observe(node);
    } else {
      node.classList.add(className);
    }
    animated.push(node);
  }
}
