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

export function makerHtml(mode?: 'edit-site'): string {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  const app = clone.querySelector('#app');
  if (app) app.innerHTML = '';
  // Drop any state the running app parked in the DOM.
  clone.querySelectorAll('[data-transient]').forEach((node) => node.remove());

  const body = clone.querySelector('body');
  if (body) {
    if (mode) body.setAttribute('data-buildsheet-mode', mode);
    else body.removeAttribute('data-buildsheet-mode');
  }

  const title = clone.querySelector('title');
  if (title && mode === 'edit-site') title.textContent = 'Edit this build';

  return `<!doctype html>\n${clone.outerHTML}`;
}

export function makerCopy(): Blob {
  return new Blob([makerHtml()], { type: 'text/html' });
}

/**
 * The editor that ships inside a published site.
 *
 * It is a copy of this very page, so a site always carries the same version of
 * the maker that built it. Nothing else has to be built or kept in sync, and it
 * keeps working when everything else has gone away.
 */
export function siteEditorHtml(): string {
  return makerHtml('edit-site');
}
