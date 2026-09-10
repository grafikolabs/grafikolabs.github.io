/* ------------------------------------------------------------------
   textures.js — procedural material maps, generated in-browser.
   No external image files: every surface in the villa is synthesised
   from value-noise so the whole experience stays self-contained.
------------------------------------------------------------------ */
import * as THREE from 'three';

/* --- deterministic value noise + fbm ------------------------------ */
const PERM = new Uint8Array(512);
(function seed() {
  let s = 1337;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

function vnoise(x, y) {
  const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x), yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const aa = PERM[PERM[xi] + yi] / 255;
  const ba = PERM[PERM[xi + 1] + yi] / 255;
  const ab = PERM[PERM[xi] + yi + 1] / 255;
  const bb = PERM[PERM[xi + 1] + yi + 1] / 255;
  return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v);
}

function fbm(x, y, oct = 5, gain = 0.5, lac = 2.0) {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += a * vnoise(x * f, y * f);
    norm += a; a *= gain; f *= lac;
  }
  return sum / norm;
}

/* --- canvas helpers ----------------------------------------------- */
function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function finish(c, repeat = 1, srgb = false) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const hex2rgb = h => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/* ------------------------------------------------------------------
   MARBLE — turbulence-driven veining. Returns { map, roughnessMap }.
------------------------------------------------------------------ */
export function makeMarble({
  size = 1024,
  base = '#f2f0ec',
  deep = '#d9d5cd',
  vein = '#8d8b86',
  scale = 3.2,
  veinSharp = 8.0,
  contrast = 1.0,
} = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const [br, bg, bb] = hex2rgb(base);
  const [dr, dg, db] = hex2rgb(deep);
  const [vr, vg, vb] = hex2rgb(vein);

  const rc = canvas(size), rctx = rc.getContext('2d');
  const rimg = rctx.createImageData(size, size);
  const rd = rimg.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * scale, v = (y / size) * scale;
      const turb = fbm(u * 4, v * 4, 6);
      // classic marble: sinusoid displaced by turbulence
      let m = Math.sin((u * 6 + v * 2 + turb * veinSharp) * Math.PI);
      m = Math.pow(Math.abs(m), 6);                 // tighten into thin veins
      const blotch = fbm(u * 1.3 + 40, v * 1.3 + 40, 4);
      const mix = Math.min(1, m * contrast);
      const bl = (blotch - 0.5) * 0.55 + 0.5;

      const rr = lerp(lerp(br, dr, bl), vr, mix);
      const gg = lerp(lerp(bg, dg, bl), vg, mix);
      const bbb = lerp(lerp(bb, db, bl), vb, mix);

      const i = (y * size + x) * 4;
      d[i] = rr; d[i + 1] = gg; d[i + 2] = bbb; d[i + 3] = 255;

      // veins read slightly rougher than the polished field
      const rough = 22 + mix * 70 + (blotch - 0.5) * 26;
      rd[i] = rd[i + 1] = rd[i + 2] = Math.max(0, Math.min(255, rough));
      rd[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  rctx.putImageData(rimg, 0, 0);
  return { map: finish(c, 1, true), roughnessMap: finish(rc, 1) };
}

/* ------------------------------------------------------------------
   WOOD — walnut / teak grain with directional streaking.
------------------------------------------------------------------ */
export function makeWood({
  size = 512,
  light = '#a4693c',
  dark = '#5c3418',
  rings = 26,
} = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const [lr, lg, lb] = hex2rgb(light);
  const [dr, dg, db] = hex2rgb(dark);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      // grain runs along Y, wobbled by low-frequency noise
      const wob = fbm(u * 3.0, v * 0.5, 4) - 0.5;
      let g = Math.sin((u * rings + wob * 5.0) * Math.PI * 2) * 0.5 + 0.5;
      g = Math.pow(g, 1.6);
      const fine = fbm(u * 60, v * 6, 3) * 0.22;
      const t = Math.min(1, Math.max(0, g * 0.8 + fine));
      const i = (y * size + x) * 4;
      d[i] = lerp(dr, lr, t);
      d[i + 1] = lerp(dg, lg, t);
      d[i + 2] = lerp(db, lb, t);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(c, 1, true);
}

/* ------------------------------------------------------------------
   FABRIC — soft woven noise for upholstery and rugs.
------------------------------------------------------------------ */
export function makeFabric({ size = 256, tint = '#8c8880', weave = 90 } = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const [r, g, b] = hex2rgb(tint);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const w = (Math.sin(u * weave * Math.PI * 2) * Math.sin(v * weave * Math.PI * 2)) * 0.5 + 0.5;
      const n = fbm(u * 14, v * 14, 3);
      const t = 0.78 + w * 0.10 + (n - 0.5) * 0.26;
      const i = (y * size + x) * 4;
      d[i] = Math.min(255, r * t);
      d[i + 1] = Math.min(255, g * t);
      d[i + 2] = Math.min(255, b * t);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(c, 1, true);
}

/* ------------------------------------------------------------------
   PLASTER — very subtle wall break-up so flat paint isn't flat.
------------------------------------------------------------------ */
export function makePlaster({ size = 512, tint = '#e8e3da' } = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const [r, g, b] = hex2rgb(tint);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm((x / size) * 8, (y / size) * 8, 4);
      const t = 0.94 + (n - 0.5) * 0.12;
      const i = (y * size + x) * 4;
      d[i] = Math.min(255, r * t);
      d[i + 1] = Math.min(255, g * t);
      d[i + 2] = Math.min(255, b * t);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(c, 1, true);
}

/* ------------------------------------------------------------------
   RADIAL FALLOFF — used as an alpha map for light pools and glows.
------------------------------------------------------------------ */
export function makeGlow({ size = 256, power = 2.4 } = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half, dy = (y - half) / half;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const a = Math.pow(1 - r, power) * 255;
      const i = (y * size + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/* ------------------------------------------------------------------
   SHADE FABRIC — Sivoia-style translucent weave with a subtle slub.
------------------------------------------------------------------ */
export function makeShadeFabric({ size = 256, tint = '#cfc7b8' } = {}) {
  const c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const [r, g, b] = hex2rgb(tint);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const warp = Math.sin(u * 26 * Math.PI) * 0.5 + 0.5;
      const weft = Math.sin(v * 26 * Math.PI) * 0.5 + 0.5;
      const slub = fbm(u * 30, v * 4, 3);
      const t = 0.84 + warp * 0.035 + weft * 0.035 + (slub - 0.5) * 0.12;
      const i = (y * size + x) * 4;
      d[i] = Math.min(255, r * t);
      d[i + 1] = Math.min(255, g * t);
      d[i + 2] = Math.min(255, b * t);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(c, 1, true);
}
