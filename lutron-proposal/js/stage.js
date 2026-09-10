/* ------------------------------------------------------------------
   stage.js — renderer, camera rig, post chain and the transition clock.

   Owns the single RAF loop. Scroll scrubs the camera through named
   shots; the keypad scrubs the lighting. The two are independent, so
   you can re-light any shot at any point in the scroll.
------------------------------------------------------------------ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createVilla } from './villa.js';
import { SCENES, sceneById, blendScenes } from './scenes.js';

/* ---------------- camera shots ---------------- */
/* Copy sits on the left third of the screen, so every shot is composed
   to put its subject centre-right of frame. */
const SHOTS = {
  arrival:  { p: [-2.00, 1.92, 4.60], t: [ 4.20, 1.48, -4.60], fov: 48 },
  living:   { p: [-0.60, 1.66, 3.60], t: [-4.60, 1.15, -2.60], fov: 42 },
  volume:   { p: [-4.40, 1.24, 3.20], t: [ 1.40, 5.50, -5.00], fov: 58 },
  dining:   { p: [ 0.60, 1.60, 0.40], t: [ 4.60, 1.25, -5.20], fov: 42 },
  kitchen:  { p: [ 0.90, 1.72, 5.20], t: [ 5.60, 1.05, 1.40], fov: 44 },
  mezz:     { p: [ 3.20, 4.25, 2.60], t: [-3.40, 0.80, -3.20], fov: 50 },
  settle:   { p: [-1.20, 1.36, 2.60], t: [ 3.40, 1.50, -4.60], fov: 36 },
};

const smooth = t => t * t * (3 - 2 * t);
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = v => Math.max(0, Math.min(1, v));

/* final grade: vignette, halation lift and a whisper of grain */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 1.05 },
    uGrain: { value: 0.034 },
    uAber: { value: 0.0016 },
    uWarm: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uAber, uWarm;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      float r2 = dot(d,d);
      // lateral chromatic aberration, strongest at the corners
      vec2 off = d * uAber * (0.4 + r2 * 2.2);
      vec3 c;
      c.r = texture2D(tDiffuse, vUv + off).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv - off).b;
      // warm the highlights a touch, cool the shadows
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      c += uWarm * vec3(0.045,0.012,-0.028) * l;
      c *= 1.0 - uVignette * r2 * 0.72;
      float g = hash(vUv * vec2(1920.0,1080.0) + uTime) - 0.5;
      c += g * uGrain * (1.0 - l * 0.55);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function createStage(canvas, veil) {
  /* ---------------- quality tier ---------------- */
  const cores = navigator.hardwareConcurrency || 4;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const narrow = innerWidth < 900;
  const tier = (coarse || narrow || cores <= 4) ? (cores <= 4 ? 'low' : 'mid') : 'high';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: tier !== 'low', powerPreference: 'high-performance', alpha: false,
  });
  let dpr = Math.min(devicePixelRatio, tier === 'high' ? 1.5 : 1.2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (tier !== 'low') {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0b0d);
  scene.fog = new THREE.FogExp2(0x0a0b0d, 0.0055);

  const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 120);
  camera.position.set(...SHOTS.arrival.p);

  /* environment for PBR reflections */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.30;   // RoomEnvironment is a bright white box; used as a whisper of fill, not as lighting

  /* ---------------- the set ---------------- */
  const villa = createVilla();
  scene.add(villa.root);

  /* mirror plane under the marble — the single biggest look upgrade */
  let mirror = null;
  if (tier === 'high') {
    mirror = new Reflector(new THREE.PlaneGeometry(13, 14.4), {
      textureWidth: Math.min(1024, innerWidth * 0.55),
      textureHeight: Math.min(576, innerHeight * 0.55),
      color: 0x8f8f8f,
      clipBias: 0.004,
    });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.set(0, 0.001, -1);
    scene.add(mirror);
  }

  /* ---------------- post chain ---------------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let bloom = null;
  if (tier !== 'low') {
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.55, 0.88);
    composer.addPass(bloom);
  }
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  if (tier === 'low') grade.uniforms.uGrain.value = 0.02;

  /* ---------------- scene-state transitions ---------------- */
  const OPENING = sceneById('relax');   // the room is at its most articulate here
  let from = OPENING, to = OPENING, mixT = 1, mixDur = 1;
  let current = blendScenes(from, to, 1);
  let natural = false, naturalPhase = 0.18;
  let shadeBias = 0, shadeBiasEased = 0;
  const listeners = [];
  const onSceneChange = [];

  function pushState() { for (const cb of listeners) cb(current, to); }

  function setScene(id, dur = 1.9) {
    const next = sceneById(id);
    if (next === to && mixT >= 1 && !natural) return;
    from = { ...current };                        // depart from wherever we are
    to = next;
    mixDur = reduced ? 0.35 : dur;
    mixT = 0;
    natural = false;
    shadeBias = 0;
    for (const cb of onSceneChange) cb(next);
  }

  /* Nudge the shade off the scene's programmed position without
     leaving the scene — the raise/lower rocker, not a preset. */
  function setShadeBias(v) { shadeBias = Math.max(-1, Math.min(1, v)); }

  /* Natural Show: sun-tracking compressed into a loop. Shades and
     colour temperature follow the sun rather than a fixed preset. */
  function setNatural(on) {
    if (on) { natural = true; naturalPhase = 0.18; mixT = 1; return; }
    natural = false;
    from = { ...current };
    mixDur = reduced ? 0.35 : 1.3;
    mixT = 0;
    for (const cb of onSceneChange) cb(to);
  }

  function naturalState(phase) {
    // phase 0 → 1 maps to roughly 05:30 → 20:30
    const el = -8 + 70 * Math.sin(Math.PI * phase);
    const az = -110 + 150 * phase;
    const k = 2100 + 3900 * Math.pow(Math.sin(Math.PI * clamp01(phase)), 0.42);
    const day = clamp01(Math.sin(Math.PI * phase) * 1.8);
    const s = {
      shade: clamp01(0.10 + 0.72 * Math.pow(Math.max(0, Math.sin(Math.PI * phase)), 2.5)),
      sunEl: el, sunAz: az, sunK: k,
      sunI: 0.15 + 4.0 * clamp01(Math.sin(Math.PI * phase)),
      skyI: 0.05 + 0.75 * day,
      exposure: 1.24 - 0.24 * day,
      bloom: 0.85 - 0.6 * day,
      layers: {},
    };
    const dusk = 1 - day;
    const put = (id, i, kk) => (s.layers[id] = { i, k: kk });
    put('daylight', 0.05 + 0.95 * day, 4200 + 1800 * day);
    put('cove', 0.18 + 0.5 * dusk, 2400 + 1100 * day);
    put('down', 0.20 + 0.38 * dusk, 2600 + 1400 * day);
    put('accent', 0.42 * dusk, 2700);
    put('pendant', 0.5 * dusk, 2500);
    put('lamp', 0.6 * dusk, 2400);
    put('step', 0.35 * Math.pow(dusk, 2), 1800);
    s.clockLabel = fmtClock(5.5 + 15 * phase);
    return s;
  }
  const fmtClock = h => {
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  /* ---------------- three-beat playback ---------------- */
  let beat = null;
  function playBeats(fromId, toId, onTick) {
    const a = sceneById(fromId), b = sceneById(toId);
    setScene(fromId, 0.5);
    beat = { a, b, t: 0, dur: reduced ? 4 : 11, onTick };
  }
  function stopBeats() { beat = null; }

  /* ---------------- scroll-driven camera ---------------- */
  const regions = [];
  function collectRegions() {
    regions.length = 0;
    document.querySelectorAll('.stage-region').forEach(region => {
      const shots = [...region.querySelectorAll('[data-shot]')]
        .map(el => SHOTS[el.dataset.shot]).filter(Boolean);
      if (shots.length) regions.push({ el: region, shots });
    });
  }

  const camPos = new THREE.Vector3(...SHOTS.arrival.p);
  const camTgt = new THREE.Vector3(...SHOTS.arrival.t);
  const wantPos = camPos.clone(), wantTgt = camTgt.clone();
  let wantFov = SHOTS.arrival.fov;
  let visible = 0, wantVisible = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const visListeners = []; let visState = null;

  if (!reduced) addEventListener('pointermove', e => {
    pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  function readScroll() {
    let active = null, best = Infinity;
    for (const r of regions) {
      const b = r.el.getBoundingClientRect();
      const overlap = Math.min(b.bottom, innerHeight) - Math.max(b.top, 0);
      if (overlap > 0 && -b.top < best) { best = -b.top; active = r; }
    }
    if (!active) { wantVisible = 0; return; }

    const b = active.el.getBoundingClientRect();
    const span = Math.max(1, b.height - innerHeight);
    const p = clamp01(-b.top / span);
    const n = active.shots.length;
    const f = p * (n - 1);
    const i = n > 1 ? Math.min(n - 2, Math.max(0, Math.floor(f))) : 0;
    const t = n > 1 ? smooth(clamp01(f - i)) : 0;
    const s0 = active.shots[i], s1 = active.shots[Math.min(n - 1, i + 1)];

    wantPos.set(
      s0.p[0] + (s1.p[0] - s0.p[0]) * t,
      s0.p[1] + (s1.p[1] - s0.p[1]) * t,
      s0.p[2] + (s1.p[2] - s0.p[2]) * t
    );
    wantTgt.set(
      s0.t[0] + (s1.t[0] - s0.t[0]) * t,
      s0.t[1] + (s1.t[1] - s0.t[1]) * t,
      s0.t[2] + (s1.t[2] - s0.t[2]) * t
    );
    wantFov = s0.fov + (s1.fov - s0.fov) * t;

    // fade the set in and out at the edges of its region
    const fadeIn = clamp01((innerHeight - b.top) / (innerHeight * 0.55));
    const fadeOut = clamp01(b.bottom / (innerHeight * 0.55));
    wantVisible = Math.min(fadeIn, fadeOut);
  }

  /* ---------------- resize ---------------- */
  function resize() {
    const w = innerWidth, h = innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    if (bloom) bloom.setSize(w, h);
    if (mirror) mirror.getRenderTarget().setSize(
      Math.min(1280, w * 0.75), Math.min(720, h * 0.75)
    );
    collectRegions();
  }
  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', readScroll, { passive: true });

  /* ---------------- loop ---------------- */
  const clock = {
    last: 0, elapsed: 0,
    delta() {
      const now = performance.now() / 1000;
      const d = this.last ? now - this.last : 0;
      this.last = now; this.elapsed += Math.min(0.25, d);
      return d;
    },
    reset() { this.last = performance.now() / 1000; },
  };
  let running = true, idle = 0;

  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(0.25, clock.delta());
    const time = clock.elapsed;

    /* --- state --- */
    if (beat) {
      beat.t += dt;
      const p = clamp01(beat.t / beat.dur);
      // reveal (0–0.25) hold A · shift (0.25–0.72) · settle (0.72–1) hold B
      const k = p < 0.25 ? 0 : p > 0.72 ? 1 : easeInOut((p - 0.25) / 0.47);
      current = blendScenes(beat.a, beat.b, k);
      if (beat.onTick) beat.onTick(p, k);
      if (p >= 1) { from = to = beat.b; mixT = 1; beat = null; }
      pushState();
    } else if (natural) {
      naturalPhase = (naturalPhase + dt * 0.055) % 1;
      current = naturalState(naturalPhase);
      pushState();
    } else if (mixT < 1) {
      mixT = Math.min(1, mixT + dt / mixDur);
      current = blendScenes(from, to, easeInOut(mixT));
      pushState();
    }

    /* the rocker rides on top of the scene's programmed position, so
       nudging the shades never drops you out of the scene */
    shadeBiasEased += (shadeBias - shadeBiasEased) * Math.min(1, dt * 2.6);
    if (current.shadeBase === undefined) current.shadeBase = current.shade;
    current.shade = clamp01(current.shadeBase + shadeBiasEased);

    villa.apply(current);
    scene.fog.color.copy(villa.skyUni.uHorizon.value);   // aerial haze matches the sky
    renderer.toneMappingExposure = current.exposure;
    if (bloom) bloom.strength = current.bloom;
    grade.uniforms.uTime.value = time;
    grade.uniforms.uWarm.value = 0.5 + current.bloom * 0.6;

    /* --- camera --- */
    readScrollThrottled(time);
    const k = 1 - Math.pow(0.0016, dt);          // frame-rate independent ease
    camPos.lerp(wantPos, k);
    camTgt.lerp(wantTgt, k);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);

    idle += dt;
    const driftX = reduced ? 0 : Math.sin(idle * 0.17) * 0.08;
    const driftY = reduced ? 0 : Math.cos(idle * 0.13) * 0.05;
    camera.position.set(
      camPos.x + pointer.x * 0.22 + driftX,
      camPos.y - pointer.y * 0.13 + driftY,
      camPos.z
    );
    camera.lookAt(camTgt);
    camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 2.2);
    camera.updateProjectionMatrix();

    visible += (wantVisible - visible) * Math.min(1, dt * 4);
    const o = visible.toFixed(3);
    canvas.style.opacity = o;
    if (veil) veil.style.opacity = o;   // scrim and set fade as one thing

    const onStage = wantVisible > 0.28;   // open the console only once the set is actually readable
    if (onStage !== visState) { visState = onStage; for (const cb of visListeners) cb(onStage); }

    if (visible > 0.004) { composer.render(); governor(dt); }
  }

  /* ------------------------------------------------------------------
     Quality governor. The pitch has to be smooth on whatever machine it
     is opened on, so if the frame budget slips we shed the expensive
     things in order of least visual cost: mirror, then resolution, then
     bloom. One-way — we never oscillate.
  ------------------------------------------------------------------ */
  let avgFrame = 16, downgrades = 0, settle = 0;
  function governor(dt) {
    settle += dt;
    if (settle < 2.5) return;                 // ignore shader-compile spikes
    avgFrame += (dt * 1000 - avgFrame) * 0.05;
    if (avgFrame < 27 || downgrades >= 3) return;
    downgrades++;
    settle = 0; avgFrame = 16;
    if (downgrades === 1 && mirror) {
      mirror.visible = false;
    } else if (downgrades <= 2) {
      dpr = Math.max(1, dpr * 0.78);
      renderer.setPixelRatio(dpr);
      composer.setPixelRatio?.(dpr);
      composer.setSize(innerWidth, innerHeight);
    } else if (bloom) {
      bloom.enabled = false;
    }
    console.info(`[stage] quality step ${downgrades} — holding frame rate`);
  }

  let lastRead = -1;
  function readScrollThrottled(t) {
    if (t - lastRead > 0.05) { readScroll(); lastRead = t; }
  }

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) clock.reset();
  });

  collectRegions();
  readScroll();
  villa.apply(current);

  return {
    renderer, scene, camera, tier,
    setScene, setNatural, setShadeBias, playBeats, stopBeats,
    get sceneId() { return to.id; },
    get isNatural() { return natural; },
    get state() { return current; },
    onState: cb => { listeners.push(cb); cb(current, to); },
    onVisibility: cb => { visListeners.push(cb); if (visState !== null) cb(visState); },
    onSceneChange: cb => onSceneChange.push(cb),
    start: () => { clock.reset(); frame(); },
    refresh: () => { resize(); readScroll(); },
  };
}
