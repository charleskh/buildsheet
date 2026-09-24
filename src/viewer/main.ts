import { mount } from 'svelte';
import Viewer from './Viewer.svelte';
import '../styles/app.css';
import type { SiteData } from './types';

/**
 * Data is read from an inline script tag rather than fetched, so the page works
 * from file:// where a fetch of a sibling file is blocked.
 */
const node = document.getElementById('buildsheet-data');
const data = JSON.parse(node?.textContent ?? '{}') as SiteData;

if (data.buildsheet === 1) {
  mount(Viewer, { target: document.getElementById('app')!, props: { data } });
} else {
  document.getElementById('app')!.textContent =
    'This page is missing its build data. Re-export it from buildsheet.';
}
