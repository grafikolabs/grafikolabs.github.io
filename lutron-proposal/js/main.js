/* ------------------------------------------------------------------
   main.js — boot.
   Texture synthesis and geometry build both happen up front, so the
   loader is real progress rather than a decorative delay.
------------------------------------------------------------------ */
import { createStage } from './stage.js';
import { initUI } from './ui.js';
import { sceneById } from './scenes.js';

const boot = document.getElementById('boot');
const fill = document.getElementById('bootFill');
const msg = document.getElementById('bootMsg');

const step = (pct, text) => new Promise(res => {
  fill.style.width = pct + '%';
  if (text) msg.textContent = text;
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 30)));
});

function fail(e) {
  console.error(e);
  msg.innerHTML = 'This proposal needs WebGL.<br>Open in Chrome, Safari or Edge — or ask us for the PDF.';
  msg.style.color = '#c98f52';
  fill.style.width = '100%';
  document.body.classList.add('no-webgl');
}

(async function boot3d() {
  // apply the opening palette before anything paints
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(sceneById('relax').page)) root.setProperty('--' + k, v);

  try {
    await step(12, 'Synthesising materials');
    const stage = createStage(document.getElementById('stage'), document.querySelector('.stage-veil'));

    await step(58, 'Building the set');
    await step(78, 'Resolving lighting layers');

    initUI(stage);

    await step(94, 'Compiling shaders');
    stage.renderer.compile(stage.scene, stage.camera);

    await step(100, 'Ready');
    stage.start();
    stage.refresh();

    setTimeout(() => {
      boot.classList.add('done');
      document.body.classList.add('booted');
      setTimeout(() => boot.remove(), 1200);
    }, 260);

    // one late refresh once fonts and images have settled the layout
    addEventListener('load', () => setTimeout(() => stage.refresh(), 200));
  } catch (e) {
    fail(e);
  }
})();
