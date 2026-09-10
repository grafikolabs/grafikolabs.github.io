# Grafiko Labs × Lutron — interactive proposal

A single-page pitch for the 3D handover-film engagement. No build step, no
framework, no runtime dependencies beyond a vendored copy of three.js. Serve the
folder from any static host and it runs.

## Running it locally

```bash
python3 -m http.server 8899
# → http://localhost:8899
```

A server is required — ES modules and the import map will not load over `file://`.

## Structure

```
index.html          all copy and section structure
css/style.css       one stylesheet; palette lives in CSS custom properties
js/
  main.js           boot sequence and loader
  stage.js          renderer, post chain, camera rig, transition clock, quality governor
  villa.js          the real-time set — geometry and the seven light layers
  scenes.js         scene definitions; the single source of truth for light states
  textures.js       procedural marble, wood, fabric, plaster — no image files
  ui.js             every interactive section
  data.js           proposal figures, plan hotspots, pipeline, checklists
assets/img/         reference renders, floor plans, wordmark
vendor/three/       three.js r186, pruned to the 17 modules actually imported
```

**Scene engine.** `scenes.js` defines each scene as seven light layers, each with
an intensity and a colour temperature, plus shade position, sun angle, exposure
and bloom. One blended state object drives the 3D lights, the on-screen readout
and the page's CSS variables — so they can never disagree.

**Figures.** Every number comes from the signed-off proposal document and lives
in `js/data.js` and `js/scenes.js`. Those two files are the only place to change
a price, a tier, a duration or a schedule.

**Performance.** Quality is tiered on load (pointer type, core count, viewport),
and a governor watches frame time in flight: if the budget slips it drops the
floor mirror, then resolution, then bloom — in that order, one way only. On a
phone it starts without shadows, bloom or mirror.

**Accessibility.** `prefers-reduced-motion` shortens every transition and stops
the camera drift, the diagram sweep and the reveal animations. Pipeline rows are
keyboard-operable. Without JavaScript the page states that a PDF is available on
request.

---

*Confidential. Prepared for Lutron Electronics.*
