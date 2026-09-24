import { mount } from 'svelte';
import App from './App.svelte';
import './styles/app.css';
import { registerSelfTest } from './lib/selftest';

registerSelfTest();

export default mount(App, { target: document.getElementById('app')! });
