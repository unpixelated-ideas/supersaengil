import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureMotion, finishMotion } from './motion.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup(reduced = false) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced })));
  document.body.innerHTML = '<div id="app"><main><section class="summary-card">Result</section><div class="table-section"><div class="table-wrap">Rows</div></div><button data-holiday-year="1">Next</button></main></div>';
  const root = document.querySelector('#app');
  root.dataset.motionPath = location.pathname;
  return root;
}

describe('restrained content motion', () => {
  it('animates changed results immediately and skips identical rerenders', () => {
    const root = setup();
    const previous = captureMotion(root);
    root.querySelector('.summary-card').textContent = 'Updated result';
    finishMotion(root, previous);
    expect(root.querySelector('.summary-card').classList.contains('motion-enter')).toBe(true);
    expect(root.querySelector('.table-wrap').classList.contains('motion-update')).toBe(false);
    const unchanged = captureMotion(root);
    root.querySelector('.summary-card').classList.remove('motion-enter');
    finishMotion(root, unchanged);
    expect(root.querySelector('.summary-card').classList.contains('motion-enter')).toBe(false);
  });

  it('does not mistake nested animation classes for content changes', () => {
    const root = setup();
    root.querySelector('.summary-card').innerHTML = '<span class="motion-update">Same</span>';
    const previous = captureMotion(root);
    root.querySelector('span').removeAttribute('class');
    finishMotion(root, previous);
    expect(root.querySelector('.summary-card').classList.contains('motion-enter')).toBe(false);
  });

  it('does not treat a completed page entrance as another navigation', () => {
    const root = setup();
    root.querySelector('main').classList.add('motion-page');
    const previous = captureMotion(root);
    root.querySelector('main').classList.remove('motion-page');
    root.querySelector('.summary-card').textContent = 'Changed';
    finishMotion(root, previous);
    expect(root.querySelector('main').classList.contains('motion-page')).toBe(false);
    expect(root.querySelector('.summary-card').classList.contains('motion-enter')).toBe(true);
  });

  it('restores keyboard focus after controls are replaced', () => {
    const root = setup();
    root.querySelector('button').focus();
    const previous = captureMotion(root);
    root.innerHTML = root.innerHTML;
    finishMotion(root, previous);
    expect(document.activeElement).toBe(root.querySelector('button'));
  });

  it('skips entrances and updates when reduced motion is requested', () => {
    const root = setup(true);
    const previous = captureMotion(root);
    root.querySelector('.summary-card').textContent = 'Updated';
    finishMotion(root, previous);
    expect(root.querySelector('[class*="motion-"]')).toBeNull();
    delete root.dataset.motionPath;
    finishMotion(root, captureMotion(root));
    expect(root.querySelector('[class*="motion-"]')).toBeNull();
  });
});
