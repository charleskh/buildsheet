/**
 * The maker saves a copy of itself.
 *
 * Everything is already inlined into this one document, so its own markup is a
 * complete working application. Someone who keeps a copy is no longer dependent
 * on this domain, this repository, or anyone continuing to host anything.
 *
 * The mount point is emptied first so the saved copy starts clean rather than
 * carrying a frozen snapshot of whatever was on screen.
 */

export function makerCopy(): Blob {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  const app = clone.querySelector('#app');
  if (app) app.innerHTML = '';
  // Drop any state the running app parked in the DOM.
  clone.querySelectorAll('[data-transient]').forEach((node) => node.remove());
  const html = `<!doctype html>\n${clone.outerHTML}`;
  return new Blob([html], { type: 'text/html' });
}
