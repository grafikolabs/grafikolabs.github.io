/* ------------------------------------------------------------------
   scenes.js — the scene engine's data model.

   One source of truth for every light state in the experience. The
   same object drives (a) the real-time villa, (b) the on-screen
   programming readout, and (c) the page's own colour palette — so
   pressing a keypad button re-lights the document as well as the room.
------------------------------------------------------------------ */

/* Correlated colour temperature → linear RGB (Tanner Helland approx,
   normalised so the brightest channel is 1.0). Lets us talk in kelvin
   the way a lighting schedule does, instead of in hex. */
export function kelvinToRGB(k) {
  const t = Math.max(1000, Math.min(12000, k)) / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const c = [r, g, b].map(v => Math.max(0, Math.min(255, v)) / 255);
  const m = Math.max(c[0], c[1], c[2]) || 1;
  return [c[0] / m, c[1] / m, c[2] / m];
}

export function kelvinToHex(k) {
  const [r, g, b] = kelvinToRGB(k);
  const h = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/* The addressable layers. `product` is what actually gets specified on
   a Lutron job — naming them is the point, not decoration. */
export const LAYERS = [
  { id: 'daylight', label: 'Daylight',        product: 'Sivoia QS aperture' },
  { id: 'cove',     label: 'Cove',            product: 'Lumaris RGB+TW tape' },
  { id: 'down',     label: 'Downlights',      product: 'Ketra D3 / Rania' },
  { id: 'accent',   label: 'Accent & art',    product: 'Rania adjustable' },
  { id: 'pendant',  label: 'Pendant',         product: 'Decorative, dimmed' },
  { id: 'lamp',     label: 'Table & floor',   product: 'Caséta plug-in' },
  { id: 'step',     label: 'Pathway',         product: 'Lumaris 1", 1800K' },
];

/*  i = intensity 0–1   ·   k = kelvin
    shade: 0 = fully open, 1 = fully closed
    sunEl / sunAz in degrees — drives the daylight direction
    exposure / bloom are the camera's response, not the room's        */
export const SCENES = [
  {
    id: 'morning',
    name: 'Morning',
    clock: '06:40',
    note: 'Shades track the sun open. Electric light stays out of the way.',
    shade: 0.08,
    sunEl: 14, sunAz: -46, sunK: 5100, sunI: 2.4, skyI: 0.42,
    layers: {
      daylight: { i: 0.92, k: 5600 },
      cove:     { i: 0.22, k: 3500 },
      down:     { i: 0.30, k: 4000 },
      accent:   { i: 0.00, k: 3000 },
      pendant:  { i: 0.00, k: 2700 },
      lamp:     { i: 0.00, k: 2700 },
      step:     { i: 0.00, k: 1800 },
    },
    exposure: 1.02, bloom: 0.20,
    page: {
      bg: '#0d1013', panel: 'rgba(255,255,255,.045)', line: 'rgba(255,255,255,.10)',
      ink: '#eef1f3', dim: '#8a949c', accent: '#bcd6e6', glow: 'rgba(150,200,235,.20)',
    },
  },
  {
    id: 'entertain',
    name: 'Entertain',
    clock: '19:10',
    note: 'Full layer set. Bright enough to host, warm enough to sit in.',
    shade: 0.96,
    sunEl: -6, sunAz: -70, sunK: 3200, sunI: 0.12, skyI: 0.10,
    layers: {
      daylight: { i: 0.04, k: 4200 },
      cove:     { i: 0.78, k: 3000 },
      down:     { i: 0.82, k: 3000 },
      accent:   { i: 0.70, k: 3000 },
      pendant:  { i: 0.85, k: 2700 },
      lamp:     { i: 0.55, k: 2700 },
      step:     { i: 0.15, k: 2200 },
    },
    exposure: 1.00, bloom: 0.34,
    page: {
      bg: '#0c0b0a', panel: 'rgba(255,255,255,.05)', line: 'rgba(255,255,255,.11)',
      ink: '#f4f0ea', dim: '#98918a', accent: '#e8c99a', glow: 'rgba(240,190,120,.22)',
    },
  },
  {
    id: 'relax',
    name: 'Relax',
    clock: '21:30',
    note: 'Cove carries the room. Downlights drop below 20%. Contrast returns.',
    shade: 1.0,
    sunEl: -18, sunAz: -80, sunK: 2600, sunI: 0.03, skyI: 0.05,
    layers: {
      daylight: { i: 0.01, k: 3600 },
      cove:     { i: 0.62, k: 2400 },
      down:     { i: 0.16, k: 2500 },
      accent:   { i: 0.42, k: 2600 },
      pendant:  { i: 0.34, k: 2400 },
      lamp:     { i: 0.72, k: 2400 },
      step:     { i: 0.30, k: 2000 },
    },
    exposure: 1.08, bloom: 0.52,
    page: {
      bg: '#0a0806', panel: 'rgba(255,255,255,.045)', line: 'rgba(255,255,255,.09)',
      ink: '#f2e9dd', dim: '#8f8478', accent: '#d9a86a', glow: 'rgba(230,150,70,.26)',
    },
  },
  {
    id: 'goodnight',
    name: 'Goodnight',
    clock: '23:45',
    note: 'Everything off but the pathway. 1800K, 8% — enough to walk by, not enough to wake to.',
    shade: 1.0,
    sunEl: -32, sunAz: -95, sunK: 2200, sunI: 0.015, skyI: 0.035,
    layers: {
      daylight: { i: 0.00, k: 3200 },
      cove:     { i: 0.06, k: 2000 },
      down:     { i: 0.00, k: 2200 },
      accent:   { i: 0.00, k: 2400 },
      pendant:  { i: 0.00, k: 2200 },
      lamp:     { i: 0.06, k: 2200 },
      step:     { i: 0.55, k: 1800 },
    },
    exposure: 1.30, bloom: 0.72,
    page: {
      bg: '#060708', panel: 'rgba(255,255,255,.035)', line: 'rgba(255,255,255,.07)',
      ink: '#e6e3de', dim: '#6f7378', accent: '#c98f52', glow: 'rgba(200,120,50,.20)',
    },
  },
];

export const sceneById = id => SCENES.find(s => s.id === id) || SCENES[0];

/* Blend two scenes. Used for both keypad fades and the Natural Show
   daylight sweep, so a transition is never a cut. */
export function blendScenes(a, b, t) {
  const mix = (x, y) => x + (y - x) * t;
  const out = {
    shade: mix(a.shade, b.shade),
    sunEl: mix(a.sunEl, b.sunEl),
    sunAz: mix(a.sunAz, b.sunAz),
    sunK: mix(a.sunK, b.sunK),
    sunI: mix(a.sunI, b.sunI),
    skyI: mix(a.skyI, b.skyI),
    exposure: mix(a.exposure, b.exposure),
    bloom: mix(a.bloom, b.bloom),
    layers: {},
  };
  for (const { id } of LAYERS) {
    out.layers[id] = {
      i: mix(a.layers[id].i, b.layers[id].i),
      k: mix(a.layers[id].k, b.layers[id].k),
    };
  }
  return out;
}

/* ------------------------------------------------------------------
   Per-space scene sets, straight from §3 of the proposal. Selecting a
   space re-labels the keypad, so the visitor is always looking at a
   real programming list rather than a generic demo.
------------------------------------------------------------------ */
export const SPACE_SETS = [
  { id: 'living',   name: 'Living / Great Room', tier: 'A', states: ['Day', 'Entertain', 'Relax'],  map: ['morning', 'entertain', 'relax'] },
  { id: 'dining',   name: 'Dining',              tier: 'B', states: ['Bright', 'Dine'],             map: ['entertain', 'relax'] },
  { id: 'kitchen',  name: 'Kitchen',             tier: 'A', states: ['Task', 'Night'],              map: ['morning', 'goodnight'] },
  { id: 'master',   name: 'Master Bedroom',      tier: 'B', states: ['Morning', 'Read', 'Goodnight'], map: ['morning', 'relax', 'goodnight'] },
  { id: 'bedroom',  name: 'Bedroom',             tier: 'B', states: ['Bright', 'Relax'],            map: ['entertain', 'relax'] },
  { id: 'bath',     name: 'Bathroom',            tier: 'C', states: ['Day', 'Spa'],                 map: ['morning', 'relax'] },
  { id: 'closet',   name: 'Walk-in Closet',      tier: 'C', states: ['Occupancy reveal'],           map: ['entertain'] },
  { id: 'foyer',    name: 'Foyer / Entry',       tier: 'C', states: ['Welcome'],                    map: ['relax'] },
];
