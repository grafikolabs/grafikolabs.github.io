/* ------------------------------------------------------------------
   data.js — proposal content that drives generated UI.
   Figures here must stay identical to the signed-off proposal document.
------------------------------------------------------------------ */

export const TIER = {
  A: { price: 225, secs: 15, label: 'Hero' },
  B: { price: 175, secs: 12, label: 'Standard' },
  C: { price: 115, secs: 9,  label: 'Compact' },
};
export const POST_FEE = 165;

/* ------------------------------------------------------------------
   Velvet Villa — VTP Manjari V1. Positions are percentages measured off
   the issued automation lighting looping layout, floor by floor.
------------------------------------------------------------------ */
export const PLAN = {
  ground: {
    img: 'assets/img/plan-ground.png',
    label: 'Ground floor',
    rooms: [
      { id: 'g-living',  name: 'Living / Great Room', tier: 'A', x: 36.0, y: 55.0, note: 'DA-1-1 → DA-1-4 · double-height volume' },
      { id: 'g-kitchen', name: 'Kitchen',             tier: 'A', x: 69.0, y: 61.0, note: 'Task + under-cabinet, GF-R4' , side:'right'},
      { id: 'g-dining',  name: 'Dining',              tier: 'B', x: 36.5, y: 39.0, note: 'Chandelier on GF-R6' },
      { id: 'g-bed',     name: 'Bedroom (GF)',        tier: 'B', x: 34.0, y: 20.0, note: 'DA-1-9 → DA-1-12 · fan GF-F1' },
      { id: 'g-bath',    name: 'Bathroom (GF)',       tier: 'C', x: 58.0, y: 19.0, note: 'DA-1-8 · GF-R7 / R8', side:'right' },
      { id: 'g-closet',  name: 'Wardrobe / Dressing', tier: 'C', x: 46.0, y: 16.5, note: 'Occupancy-triggered reveal' },
      { id: 'g-stair',   name: 'Staircase & Landing', tier: 'C', x: 29.5, y: 35.0, note: 'Pathway nosing, GF-R5' },
      { id: 'g-utility', name: 'Utility',             tier: 'C', x: 64.0, y: 34.0, note: 'W/M + D/W run', side:'right' },
      { id: 'g-foyer',   name: 'Foyer / Entry',       tier: 'C', x: 46.0, y: 67.5, note: 'DALI Loop 1 start point · Welcome scene' },
    ],
  },
  first: {
    img: 'assets/img/plan-first.png',
    label: 'First floor',
    rooms: [
      { id: 'f-master',  name: 'Master Bedroom',      tier: 'B', x: 60.0, y: 62.0, note: 'DA-2-14 → DA-2-20 · fans FF-F3 / F4', side:'right' },
      { id: 'f-bed2',    name: 'Bedroom 2',           tier: 'B', x: 25.0, y: 19.0, note: 'DALI Loop 2 start · DA-2-1 → DA-2-4' },
      { id: 'f-bed3',    name: 'Bedroom 3',           tier: 'B', x: 26.0, y: 63.0, note: 'DA-2-9 → DA-2-13' },
      { id: 'f-lounge',  name: 'Family Lounge',       tier: 'B', x: 33.0, y: 40.0, note: 'Chandelier FF-F2 · landing' },
      { id: 'f-mbath',   name: 'Master Bathroom',     tier: 'C', x: 66.0, y: 18.0, note: 'DALI Loop 2 end · DA-2-22 → DA-2-25', side:'right' },
      { id: 'f-bath2',   name: 'Bathroom 2',          tier: 'C', x: 49.0, y: 21.0, note: 'DA-2-5 · FF-R4' },
      { id: 'f-closet',  name: 'Walk-in Closet',      tier: 'C', x: 41.0, y: 16.0, note: 'Shelf and rod lighting' },
      { id: 'f-dress',   name: 'Master Dressing',     tier: 'C', x: 68.0, y: 73.0, note: 'FF-R8', side:'right' },
    ],
  },
};

/* the 4BHK / Villa package, mapped onto this actual plan — 2×A 4×B 3×C */
export const DEFAULT_BUILD = [
  'g-living', 'g-kitchen', 'g-dining', 'g-bed',
  'f-master', 'f-lounge', 'g-bath', 'f-mbath', 'g-foyer',
];

/* ------------------------------------------------------------------
   Annotated reference renders — the lighting brief hiding inside each
   frame Lutron sent. x / y are percentages of the image.
------------------------------------------------------------------ */
export const REFS = [
  {
    src: 'assets/img/ref-1.jpg', title: 'Master bedroom', sub: 'Cove and picture-light layering',
    hots: [
      { x: 24, y: 8,  t: 'Perimeter cove', d: 'Lumaris tape in a plaster slot, warm and continuous. Carries the room at low level in Goodnight.' },
      { x: 43, y: 11, t: 'Decorative pendant', d: 'Brass rings on a dimmed circuit — decorative, never the working light.' },
      { x: 33, y: 32, t: 'Picture light', d: 'Art accent on its own address. First layer to appear in Read, absent in Morning.' },
      { x: 54, y: 12, t: 'Recessed downlight', d: 'Ketra D3 or Rania. Tunable white — 4000K at breakfast, 2400K at night.' },
      { x: 20, y: 45, t: 'Wardrobe reveal', d: 'Occupancy-triggered shelf and rod lighting. A ten-second beat on its own.', flip: true },
      { x: 73, y: 54, t: 'Portable lamp', d: 'Caséta plug-in module, so bedside lamps join the scene instead of fighting it.', flip: true, up: true },
      { x: 95, y: 33, t: 'Wall sconce', d: 'Vertical grazing element — reads only when downlights drop below 20%.', flip: true },
    ],
  },
  {
    src: 'assets/img/ref-2.jpg', title: 'Master bathroom', sub: 'Marble, mirror ambient and Spa',
    hots: [
      { x: 33, y: 5,  t: 'Skylight', d: 'Daylight aperture. Establishes the Day state before any fixture is switched.' },
      { x: 73, y: 8,  t: 'Ceiling cove', d: 'Indirect wash across the marble — the entire basis of the Spa scene.', flip: true },
      { x: 76, y: 27, t: 'Mirror ambient', d: 'Backlit round mirror on its own channel. Full in Day, 15% in Spa.', flip: true },
      { x: 50, y: 7,  t: 'Shower downlight', d: 'Wet-rated, tight beam. Off entirely in Spa.' },
      { x: 62, y: 55, t: 'Vanity task', d: 'High-CRI task layer for the mirror — the one place colour rendering is non-negotiable.', up: true },
    ],
  },
  {
    src: 'assets/img/ref-3.jpg', title: 'Double-height living', sub: 'The hero volume',
    hots: [
      { x: 42, y: 13, t: 'Sculptural chandelier', d: 'Reads against the void. Dimmed to 30% in Relax so the cove takes over.' },
      { x: 70, y: 12, t: 'Soffit downlights', d: 'Mezzanine underside grid. Cool and bright in Entertain, near-off in Relax.', flip: true },
      { x: 82, y: 41, t: 'Dining rings', d: 'Pendant layer that defines the Dine scene without touching the living zone.', flip: true },
      { x: 20, y: 30, t: 'Sheer + drapery', d: 'Sivoia QS. Sun-tracking through the day, closed for Entertain.' },
      { x: 13, y: 60, t: 'Table lamp', d: 'Low-level warmth at seated eye height. The layer people actually feel.', up: true },
    ],
  },
  {
    src: 'assets/img/ref-4.jpg', title: 'Dining & entry', sub: 'Arrival sequence',
    hots: [
      { x: 53, y: 16, t: 'Ring pendant cluster', d: 'The Dine scene anchor — warm, low, centred on the table.' },
      { x: 21, y: 6,  t: 'Entry downlights', d: 'The Welcome scene. Triggered on arrival, not on a switch.' },
      { x: 35, y: 30, t: 'Full-height sheers', d: 'Shade position is a scene parameter, not a separate control.' },
      { x: 64, y: 52, t: 'Console lamps', d: 'Flanking portables on a single address, dimmed together.', flip: true, up: true },
    ],
  },
];

/* ------------------------------------------------------------------
   Pipeline — seven stages, four gates
------------------------------------------------------------------ */
export const STAGES = [
  {
    n: 'Stage 0', t: 'Onboarding & asset intake',
    b: 'Kickoff call, scope lock, space list confirmed, and collection of all client inputs. We produce a <b>Space &amp; Scene Brief</b> — one page per space listing every fixture, its scene states and the intended camera treatment. Lutron signs this off before any 3D work begins.',
  },
  {
    n: 'Stage 1', t: 'Pre-production — camera blocking & greybox',
    b: 'We build a low-detail greybox of every space in scope and block the full camera path end to end, cut to a rough timeline with placeholder timing. Lutron sees the entire film\'s structure and pacing as an animatic before a single detailed asset exists.',
    gate: 'Review Gate 1 — camera path, space order, pacing and film structure.',
    why: 'This is the cheapest possible moment to change the film. A camera path change here costs nothing; the same change after modelling costs real money.',
  },
  {
    n: 'Stage 2', t: 'Detailed modelling',
    b: 'Full geometry build of all camera-visible elements: architecture, joinery, furniture, fixtures, props and set dressing. Two modellers work in parallel across spaces.',
    gate: 'Review Gate 2 — geometry, layout, furniture selection and set dressing per space.',
  },
  {
    n: 'Stage 3', t: 'Texturing, shading, lighting design & look-dev',
    b: 'PBR material build across all surfaces, followed by full lighting design. Where Lutron supplies IES photometric files we light with those files directly. Delivered for review as <b>still frames — one per space, per scene state</b> — plus one moving test clip.',
    gate: 'Review Gate 3 — materials, finishes and the full lighting scheme. The critical commercial gate.',
    why: 'Still-frame approval before animation is the single largest cost control in this pipeline. Approving lighting on stills costs minutes of render time. Discovering a lighting problem after final render costs days.',
  },
  {
    n: 'Stage 4', t: 'Animation & final render',
    b: 'Final camera animation, scene-transition timing, shade and fixture animation, motion blur, and full-resolution rendering across our render pipeline.',
  },
  {
    n: 'Stage 5', t: 'Post-production',
    b: 'Assembly edit, compositing and beauty passes, colour grade, keypad and app UI overlays where specified, titles and end card, sound design and licensed music, and a technical QC pass — banding, flicker, denoise artefacts, colour-space consistency.',
    gate: 'Review Gate 4 — final cut.',
  },
  {
    n: 'Stage 6', t: 'Delivery & handover',
    b: 'Master export, format variants, file naming per Lutron\'s handover convention, delivery via shared drive. Project assets archived for 90 days.',
  },
];

/* day ranges are inclusive, over a 28-day calendar */
export const GANTT = [
  { t: 'Stage 0 — Onboarding & brief',        d: '2 days',  a: 1,  b: 2 },
  { t: 'Stage 1 — Greybox & camera blocking', d: '3 days',  a: 3,  b: 5 },
  { t: 'Gate 1 review',                       d: 'Day 6',   a: 6,  b: 6, gate: true },
  { t: 'Stage 2 — Detailed modelling',        d: '9–10 days', a: 6, b: 14 },
  { t: 'Gate 2 review',                       d: 'Day 15',  a: 15, b: 15, gate: true },
  { t: 'Stage 3 — Texture, shade & look-dev', d: '5 days',  a: 16, b: 20 },
  { t: 'Gate 3 review',                       d: 'Day 21',  a: 21, b: 21, gate: true },
  { t: 'Stage 4 — Animation & final render',  d: '3 days',  a: 22, b: 24 },
  { t: 'Stage 5 — Post-production',           d: '2 days',  a: 25, b: 26 },
  { t: 'Gate 4 review',                       d: 'Day 27',  a: 27, b: 27, gate: true },
  { t: 'Stage 6 — Revisions & delivery',      d: '1 day',   a: 28, b: 28 },
];

export const INPUTS = [
  { g: 'Architectural', items: [
    'Floor plans and reflected ceiling plans — DWG / CAD preferred, PDF acceptable',
    'Elevations and section drawings where available',
    'Ceiling heights, cove details and custom joinery drawings',
    'Window and opening schedule',
  ]},
  { g: 'Lighting & controls', items: [
    'Fixture schedule with product SKUs — Ketra, Rania, Lumaris, downlights',
    ['IES photometric files', ' for each specified fixture — the single highest-impact input for accuracy'],
    'Keypad models, locations, finishes and engraving text',
    'Scene programming list per space — name, fixtures, intensity, CCT',
    'Shade specifications and fabric selections, if shading is in scope',
  ]},
  { g: 'Interiors', items: [
    'Material and finish schedule from the builder, or moodboard equivalent',
    'Furniture package details, if specified by the developer',
    'Reference photography of the show flat or comparable completed unit',
  ]},
  { g: 'Brand', items: [
    'Lutron logo files, brand fonts, colour codes, brand guidelines',
    'Builder co-brand assets, where applicable',
    'Any existing Lutron film for tone reference',
    'Preferred music direction, or an approved brand track',
  ]},
];

export const EXCLUSIONS = [
  'Architectural design, CAD drafting or drawing production',
  'Lighting design consultancy — we visualise the scheme Lutron specifies, we do not author it',
  'Live-action photography or videography',
  'Voiceover, scripting and translation',
  'Custom music composition',
  'Physical fixture procurement, installation or site visits',
  'Exterior, landscape, façade or common-area modelling',
  'Geometry outside the approved camera path',
  'Third-party software licences, plugins or stock assets outside our standard library',
  'Print, social or campaign collateral beyond the listed deliverables',
  'Hosting, distribution or CRM integration for handover delivery',
  'Taxes and applicable withholding',
];

export const SLABS = [
  { min: 1,  max: 4,        d: 0,    label: '1–4 units' },
  { min: 5,  max: 9,        d: 0.10, label: '5–9 units' },
  { min: 10, max: 24,       d: 0.18, label: '10–24 units' },
  { min: 25, max: Infinity, d: 0.25, label: '25+ units' },
];

export const DIST = [
  { l: 'Pre-production, blocking & animatic', v: 10 },
  { l: 'Detailed modelling', v: 28 },
  { l: 'Texturing & shading', v: 14 },
  { l: 'Lighting design & look-development', v: 22 },
  { l: 'Animation & final render', v: 16 },
  { l: 'Post-production & delivery', v: 10 },
];

export const PACKAGES = [
  { name: '2BHK Compact',  spaces: 4, price: 855 },
  { name: '3BHK Signature', spaces: 6, price: 1195 },
  { name: '4BHK / Villa',  spaces: 9, price: 1660 },
];
