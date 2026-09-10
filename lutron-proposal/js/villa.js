/* ------------------------------------------------------------------
   villa.js — the real-time set.

   A double-height great room with a mezzanine, dining zone and open
   kitchen run, built to carry the same lighting layers a real Lutron
   job carries: cove, downlights, accent, pendant, portable and
   pathway — each independently addressable, each driven by scenes.js.
------------------------------------------------------------------ */
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { makeMarble, makeWood, makeFabric, makePlaster, makeGlow, makeShadeFabric } from './textures.js';
import { kelvinToRGB, LAYERS } from './scenes.js';

/* room envelope (metres) */
const X0 = -6.5, X1 = 6.5;      // left glazing → right wall
const Z0 = -8.0, Z1 = 6.0;      // far glazing → entry wall
const H_HI = 6.6;               // double-height ceiling
const H_LO = 3.2;               // mezzanine soffit
const MEZ_X = 1.0;              // where the double-height volume ends

export function createVilla() {
  RectAreaLightUniformsLib.init();

  const root = new THREE.Group();
  const layerLights = {};   // layer id → [{ light, base }]
  const layerEmis = {};     // layer id → [{ mat, base }]
  const pools = [];         // floor light pools
  const cones = [];         // volumetric beams
  for (const { id } of LAYERS) { layerLights[id] = []; layerEmis[id] = []; }

  const reg = (layer, light, base) => { layerLights[layer].push({ light, base }); return light; };
  const regEmis = (layer, mat, base = 1) => { layerEmis[layer].push({ mat, base }); return mat; };

  /* ---------------- materials ---------------- */
  const marbleFloor = makeMarble({ size: 1024, base: '#e7e3db', deep: '#d3cec4', vein: '#a7a29a', scale: 1.6, veinSharp: 6, contrast: 0.55 });
  marbleFloor.map.repeat.set(2, 2);
  marbleFloor.roughnessMap.repeat.set(2, 2);

  const marbleSlab = makeMarble({ size: 512, base: '#f6f4f0', deep: '#e6e2da', vein: '#6f6c66', scale: 1.2, veinSharp: 9, contrast: 1.2 });
  const woodTex = makeWood({ light: '#a86c3e', dark: '#4e2c14', rings: 18 });
  const woodDark = makeWood({ light: '#6b4526', dark: '#2c1a0d', rings: 22 });
  const plaster = makePlaster({ tint: '#eae4da' });
  plaster.repeat.set(3, 2);
  const fabricLight = makeFabric({ tint: '#b9b2a6', weave: 80 });
  const fabricDark = makeFabric({ tint: '#6a655c', weave: 80 });
  const rugTex = makeFabric({ tint: '#7d7a70', weave: 9 });
  rugTex.repeat.set(3, 2);
  const shadeTex = makeShadeFabric({ tint: '#cdc4b4' });
  shadeTex.repeat.set(6, 4);
  const glowTex = makeGlow({ power: 2.2 });

  const M = {
    floor: new THREE.MeshPhysicalMaterial({
      map: marbleFloor.map, roughnessMap: marbleFloor.roughnessMap,
      roughness: 0.20, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.035,
      envMapIntensity: 1.1, transparent: true, opacity: 0.60,
    }),
    wall: new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.94, metalness: 0, envMapIntensity: 0.22 }),
    ceil: new THREE.MeshStandardMaterial({ color: 0xeae5dd, roughness: 0.96, metalness: 0, envMapIntensity: 0.18 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.42, metalness: 0, envMapIntensity: 0.8 }),
    woodDark: new THREE.MeshStandardMaterial({ map: woodDark, roughness: 0.5, metalness: 0, envMapIntensity: 0.6 }),
    marble: new THREE.MeshPhysicalMaterial({
      map: marbleSlab.map, roughnessMap: marbleSlab.roughnessMap,
      roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.3,
    }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a25e, roughness: 0.26, metalness: 1, envMapIntensity: 1.5 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.38, metalness: 1, envMapIntensity: 1.1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x25262a, roughness: 0.55, metalness: 0.2, envMapIntensity: 0.7 }),
    fabric: new THREE.MeshStandardMaterial({ map: fabricLight, roughness: 0.92, metalness: 0, envMapIntensity: 0.4 }),
    fabricAlt: new THREE.MeshStandardMaterial({ map: fabricDark, roughness: 0.9, metalness: 0, envMapIntensity: 0.4 }),
    leather: new THREE.MeshPhysicalMaterial({ color: 0x8a5c3e, roughness: 0.62, metalness: 0, sheen: 0.4, envMapIntensity: 0.7 }),
    rug: new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.98, metalness: 0, envMapIntensity: 0.25 }),
    /* Cheap glass on purpose: transmission on 13m panes is expensive and
       reads milky. A low-opacity physical surface with strong env
       reflection sells glazing better at a fraction of the cost. */
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xc8d8e2, roughness: 0.04, metalness: 0,
      transparent: true, opacity: 0.13, envMapIntensity: 1.8,
      side: THREE.DoubleSide, depthWrite: false,
    }),
    sheer: new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 1, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }),
    shade: new THREE.MeshStandardMaterial({ map: shadeTex, roughness: 1, transparent: true, opacity: 0.94, side: THREE.DoubleSide }),
    plant: new THREE.MeshStandardMaterial({ color: 0x3f5f38, roughness: 0.78, side: THREE.DoubleSide, envMapIntensity: 0.5 }),
  };

  /* ---------------- helpers ---------------- */
  const box = (w, h, d, mat, x = 0, y = 0, z = 0, parent = root) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const plane = (w, h, mat, parent = root) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const emissiveMat = (hex = 0xffffff) => new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: new THREE.Color(hex), emissiveIntensity: 1,
    roughness: 1, metalness: 0, toneMapped: true,
  });

  /* A tapered, slightly curled leaf. Rectangles read as cardboard at
     any light level; a silhouette costs the same and doesn't. */
  function leafGeometry(len = 1, wide = 0.16, curl = 0.22) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.bezierCurveTo(wide, len * 0.22, wide * 0.95, len * 0.72, 0, len);
    sh.bezierCurveTo(-wide * 0.95, len * 0.72, -wide, len * 0.22, 0, 0);
    const g = new THREE.ShapeGeometry(sh, 10);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), x = p.getX(i);
      p.setZ(i, -curl * (y / len) * (y / len) - Math.abs(x) * 0.35);   // droop + fold
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }

  /* =================================================================
     EXTERIOR — a window has to look out at something
  ================================================================= */
  const skyUni = {
    uZenith: { value: new THREE.Color(0x2a4a6e) },
    uHorizon: { value: new THREE.Color(0xd8c4a6) },
    uGround: { value: new THREE.Color(0x0d0f12) },
    uSunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.6) },
    uSunCol: { value: new THREE.Color(0xffd8a0) },
    uSunPow: { value: 1.0 },
  };
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUni,
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uZenith, uHorizon, uGround, uSunCol; uniform vec3 uSunDir; uniform float uSunPow;
        varying vec3 vP;
        void main(){
          float h = vP.y;
          vec3 c = mix(uHorizon, uZenith, pow(clamp(h,0.0,1.0), 0.55));
          c = mix(c, uGround, smoothstep(0.0, -0.10, h));
          // sun disc and the haze around it
          float d = max(dot(normalize(vP), normalize(uSunDir)), 0.0);
          c += uSunCol * pow(d, 220.0) * 5.0 * uSunPow;
          c += uSunCol * pow(d, 5.0) * 0.34 * uSunPow;
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  skyDome.renderOrder = -1;
  root.add(skyDome);

  // grounds and distant massing, so the view has depth rather than a gradient
  const extGround = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 180),
    new THREE.MeshStandardMaterial({ color: 0x2e3a2c, roughness: 1, metalness: 0 })
  );
  extGround.rotation.x = -Math.PI / 2;
  extGround.position.set(0, -0.06, 0);
  extGround.receiveShadow = true;
  root.add(extGround);

  const massGeos = [];
  [[-26, -34, 11, 7, 9], [-38, -12, 9, 6, 14], [-30, 16, 10, 7, 11],
   [-16, -46, 8, 6, 10], [-46, -40, 13, 8, 12], [-22, 34, 9, 6, 10]].forEach(([x, z, w, h, d]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, h / 2 - 0.05, z);
    massGeos.push(g);
  });
  const massing = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(massGeos),
    new THREE.MeshStandardMaterial({ color: 0x3a3b3d, roughness: 0.95, metalness: 0 }));
  root.add(massing);

  // a screen of foliage just outside the glazing
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x33502f, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const a = -0.9 + i * 0.24;
    g.position.set(X0 - 3.2 - Math.random() * 4, 0, -12 + i * 3.1 + Math.random() * 2);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.16, 3.4, 7), M.woodDark);
    trunk.position.y = 1.7; g.add(trunk);
    const frond = leafGeometry(2.9, 0.30, 0.9);
    for (let f = 0; f < 11; f++) {
      const fr = new THREE.Mesh(frond, palmMat);
      const fa = (f / 11) * Math.PI * 2;
      fr.position.set(0, 3.45, 0);
      fr.rotation.set(-1.15 - (f % 3) * 0.16, fa, 0);
      g.add(fr);
    }
    g.rotation.y = a;
    root.add(g);
  }

  /* =================================================================
     SHELL
  ================================================================= */
  const W = X1 - X0, D = Z1 - Z0, CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2;

  // floor (visible marble sits just above the mirror plane in stage.js)
  const floor = plane(W, D, M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(CX, 0.004, CZ);
  floor.renderOrder = 1;

  // right wall + entry wall
  const wallR = plane(D, H_HI, M.wall); wallR.rotation.y = -Math.PI / 2; wallR.position.set(X1, H_HI / 2, CZ);
  const wallE = plane(W, H_HI, M.wall); wallE.rotation.y = Math.PI; wallE.position.set(CX, H_HI / 2, Z1);

  // far wall — solid only behind the mezzanine side
  const wallF = plane(X1 - MEZ_X, H_HI, M.wall); wallF.position.set((MEZ_X + X1) / 2, H_HI / 2, Z0);

  // high ceiling over the double-height volume, low soffit under the mezzanine
  const ceilHi = plane(MEZ_X - X0, D, M.ceil); ceilHi.rotation.x = Math.PI / 2; ceilHi.position.set((X0 + MEZ_X) / 2, H_HI, CZ);
  const ceilUp = plane(X1 - MEZ_X, D, M.ceil); ceilUp.rotation.x = Math.PI / 2; ceilUp.position.set((MEZ_X + X1) / 2, H_HI, CZ);

  // mezzanine slab
  const mez = new THREE.Group(); root.add(mez);
  const mezW = X1 - MEZ_X;
  const soffit = plane(mezW, D, M.ceil); soffit.rotation.x = Math.PI / 2; soffit.position.set(MEZ_X + mezW / 2, H_LO, CZ); mez.add(soffit);
  box(mezW, 0.30, D, M.wall, MEZ_X + mezW / 2, H_LO + 0.15, CZ, mez);          // slab edge
  const mezTop = plane(mezW, D, M.wall); mezTop.rotation.x = -Math.PI / 2; mezTop.position.set(MEZ_X + mezW / 2, H_LO + 0.301, CZ); mez.add(mezTop);

  // glass balustrade along the mezzanine edge
  const balu = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.05, D - 0.2), M.glass);
  balu.position.set(MEZ_X, H_LO + 0.85, CZ); mez.add(balu);
  const baluRail = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, D - 0.2, 12), M.steel);
  baluRail.rotation.x = Math.PI / 2; baluRail.position.set(MEZ_X, H_LO + 1.40, CZ); mez.add(baluRail);

  /* ---------------- glazing: left wall + far-left return ---------------- */
  const glazing = new THREE.Group(); root.add(glazing);
  const gL = new THREE.Mesh(new THREE.PlaneGeometry(D, H_HI), M.glass);
  gL.rotation.y = Math.PI / 2; gL.position.set(X0, H_HI / 2, CZ); glazing.add(gL);
  const gF = new THREE.Mesh(new THREE.PlaneGeometry(MEZ_X - X0, H_HI), M.glass);
  gF.position.set((X0 + MEZ_X) / 2, H_HI / 2, Z0); glazing.add(gF);

  // mullions
  const mulGeos = [];
  const mull = (w, h, d, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z); mulGeos.push(g);
  };
  for (let z = Z0; z <= Z1 + 0.01; z += 2.8) mull(0.09, H_HI, 0.09, X0, H_HI / 2, z);
  for (let x = X0; x <= MEZ_X + 0.01; x += 2.5) mull(0.09, H_HI, 0.09, x, H_HI / 2, Z0);
  mull(0.12, 0.12, D, X0, H_HI, CZ); mull(0.12, 0.12, D, X0, 0.06, CZ);
  mull(MEZ_X - X0, 0.12, 0.12, (X0 + MEZ_X) / 2, H_HI, Z0);
  mull(MEZ_X - X0, 0.12, 0.12, (X0 + MEZ_X) / 2, 3.35, Z0);
  for (let z = Z0; z <= Z1 + 0.01; z += 2.8) mull(0.10, 0.10, 2.8, X0, 3.35, z + 1.4);
  const mullions = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(mulGeos), M.steel);
  mullions.castShadow = true; glazing.add(mullions);

  // sheer curtain returns
  [[X0 + 0.22, Z0 + 1.6, Math.PI / 2, 3.0], [X0 + 0.22, Z1 - 1.4, Math.PI / 2, 2.6]].forEach(([x, z, ry, w]) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, H_HI - 0.1, 12, 1), M.sheer);
    const p = s.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 3.4) * 0.11);
    p.needsUpdate = true;
    s.rotation.y = ry; s.position.set(x, (H_HI - 0.1) / 2, z); root.add(s);
  });

  /* ---------------- Sivoia shades ---------------- */
  const shades = [];
  const mkShade = (w, x, z, ry) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1), M.shade);
    m.geometry.translate(0, -0.5, 0);          // hang from the top edge
    g.add(m);
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, w, 10), M.steel);
    roller.rotation.z = Math.PI / 2; roller.position.y = 0.06; g.add(roller);
    g.position.set(x, H_HI - 0.16, z); g.rotation.y = ry;
    root.add(g);
    shades.push({ mesh: m, full: H_HI - 0.3 });
    return g;
  };
  mkShade(D - 0.3, X0 + 0.14, CZ, Math.PI / 2);
  mkShade(MEZ_X - X0 - 0.2, (X0 + MEZ_X) / 2, Z0 + 0.14, 0);

  /* ---------------- wood slat feature wall (far, behind dining) ------- */
  const slatGeos = [];
  for (let x = MEZ_X + 0.3; x < X1 - 0.2; x += 0.26) {
    const g = new THREE.BoxGeometry(0.13, H_LO - 0.1, 0.09);
    g.translate(x, (H_LO - 0.1) / 2, Z0 + 0.06); slatGeos.push(g);
  }
  const slats = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(slatGeos), M.wood);
  slats.castShadow = true; slats.receiveShadow = true; root.add(slats);

  /* =================================================================
     FURNITURE
  ================================================================= */
  /* --- rug + sofa cluster in the double-height volume --- */
  const rug = plane(6.2, 4.6, M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(-3.0, 0.012, -0.4); rug.renderOrder = 2;

  function sofa(len, x, z, ry, mat) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    box(len, 0.34, 0.95, mat, 0, 0.30, 0, g);                       // seat block
    box(len, 0.62, 0.24, mat, 0, 0.62, -0.44, g);                   // back
    box(0.24, 0.42, 0.95, mat, -len / 2 + 0.12, 0.50, 0, g);        // arms
    box(0.24, 0.42, 0.95, mat, len / 2 - 0.12, 0.50, 0, g);
    const n = Math.max(2, Math.round(len / 1.1));
    for (let i = 0; i < n; i++) {
      const cx = -len / 2 + len * (i + 0.5) / n;
      const c = box(len / n - 0.06, 0.16, 0.88, mat, cx, 0.55, 0.02, g);   // cushions
      c.rotation.x = -0.03;
    }
    for (const sx of [-len / 2 + 0.2, len / 2 - 0.2]) for (const sz of [-0.36, 0.36])
      box(0.06, 0.13, 0.06, M.steel, sx, 0.065, sz, g);
    return g;
  }
  sofa(3.6, -3.0, 1.9, Math.PI, M.fabric);            // faces the window
  sofa(2.8, -3.2, -2.7, 0, M.fabricAlt);

  function armchair(x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    box(0.78, 0.14, 0.76, M.leather, 0, 0.40, 0, g);
    box(0.78, 0.52, 0.14, M.leather, 0, 0.68, -0.34, g);
    box(0.12, 0.30, 0.76, M.brass, -0.38, 0.55, 0, g);
    box(0.12, 0.30, 0.76, M.brass, 0.38, 0.55, 0, g);
    for (const sx of [-0.33, 0.33]) for (const sz of [-0.31, 0.31])
      box(0.05, 0.34, 0.05, M.brass, sx, 0.17, sz, g);
    return g;
  }
  armchair(-0.35, -1.5, -Math.PI / 2);
  armchair(-0.35, 0.7, -Math.PI / 2);

  // marble coffee table + brass tray table
  box(1.5, 0.36, 0.92, M.marble, -3.1, 0.20, -0.4);
  box(0.9, 0.02, 0.62, M.marble, -2.0, 0.44, -0.4);
  for (const sx of [-2.38, -1.62]) for (const sz of [-0.66, -0.14])
    box(0.03, 0.42, 0.03, M.brass, sx, 0.22, sz);

  // console + side tables
  box(1.5, 0.06, 0.42, M.marble, -5.6, 0.62, -3.4);
  box(1.4, 0.56, 0.38, M.woodDark, -5.6, 0.32, -3.4);
  box(0.52, 0.04, 0.52, M.marble, -5.5, 0.56, 3.0);
  box(0.05, 0.54, 0.05, M.brass, -5.5, 0.27, 3.0);

  /* --- dining under the mezzanine --- */
  const DT = { x: 3.9, z: -4.3 };
  box(2.5, 0.07, 1.15, M.marble, DT.x, 0.755, DT.z);
  box(0.16, 0.72, 0.9, M.woodDark, DT.x - 0.85, 0.36, DT.z);
  box(0.16, 0.72, 0.9, M.woodDark, DT.x + 0.85, 0.36, DT.z);
  box(1.9, 0.10, 0.14, M.woodDark, DT.x, 0.16, DT.z);

  function chair(x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    box(0.48, 0.07, 0.46, M.leather, 0, 0.45, 0, g);
    const b = box(0.46, 0.52, 0.06, M.leather, 0, 0.74, -0.21, g); b.rotation.x = -0.12;
    for (const sx of [-0.20, 0.20]) for (const sz of [-0.19, 0.19])
      box(0.045, 0.45, 0.045, M.woodDark, sx, 0.225, sz, g);
    return g;
  }
  [-0.82, 0, 0.82].forEach(o => { chair(DT.x + o, DT.z - 0.86, 0); chair(DT.x + o, DT.z + 0.86, Math.PI); });

  // table dressing
  for (const o of [-0.82, 0, 0.82]) for (const s of [-0.42, 0.42]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.02, 20), M.marble);
    p.position.set(DT.x + o, 0.80, DT.z + s); root.add(p);
  }
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.26, 18), M.glass);
  vase.position.set(DT.x, 0.92, DT.z); root.add(vase);

  /* --- kitchen run along the right wall --- */
  const KZ = 2.4;
  box(0.68, 0.9, 4.6, M.dark, X1 - 0.36, 0.45, KZ);
  box(0.72, 0.05, 4.7, M.marble, X1 - 0.36, 0.92, KZ);
  box(0.42, 0.72, 3.4, M.woodDark, X1 - 0.22, 2.24, KZ);      // upper cabinets
  const hob = box(0.5, 0.012, 0.7, M.dark, X1 - 0.4, 0.95, KZ - 1.2);
  const island = new THREE.Group(); root.add(island);
  box(1.1, 0.9, 2.6, M.woodDark, 4.2, 0.45, KZ, island);
  box(1.25, 0.06, 2.75, M.marble, 4.2, 0.93, KZ, island);
  for (const z of [KZ - 0.7, KZ + 0.7]) {
    const st = new THREE.Group(); st.position.set(3.2, 0, z); root.add(st);
    box(0.36, 0.05, 0.36, M.leather, 0, 0.66, 0, st);
    for (const sx of [-0.14, 0.14]) for (const sz of [-0.14, 0.14])
      box(0.035, 0.66, 0.035, M.brass, sx, 0.33, sz, st);
  }

  /* --- staircase to the mezzanine --- */
  const stair = new THREE.Group(); root.add(stair);
  const RISE = 0.19, GO = 0.28, NSTEP = Math.round((H_LO + 0.30) / RISE);
  for (let i = 0; i < NSTEP; i++) {
    const t = box(1.15, 0.055, GO - 0.02, M.wood, 4.9, RISE * (i + 1), 3.4 - i * GO, stair);
    t.castShadow = true;
  }
  const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.34, NSTEP * GO * 1.02), M.steel);
  stringer.position.set(4.9, (NSTEP * RISE) / 2 - 0.18, 3.4 - (NSTEP * GO) / 2);
  stringer.rotation.x = -Math.atan2(NSTEP * RISE, NSTEP * GO) * -1;
  stair.add(stringer);
  const sGlass = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.95, NSTEP * GO * 1.02), M.glass);
  sGlass.position.set(4.32, (NSTEP * RISE) / 2 + 0.42, 3.4 - (NSTEP * GO) / 2);
  sGlass.rotation.x = stringer.rotation.x; stair.add(sGlass);

  /* --- art wall + plants --- */
  const artFrame = box(0.05, 1.5, 2.1, M.brass, X1 - 0.03, 2.0, -2.2);
  const artMat = new THREE.MeshStandardMaterial({ map: makeMarble({ size: 256, base: '#c9b48f', deep: '#8f7b57', vein: '#4a3f2e', scale: 1.4, veinSharp: 5 }).map, roughness: 0.8 });
  const art = plane(1.95, 1.38, artMat); art.rotation.y = -Math.PI / 2; art.position.set(X1 - 0.06, 2.0, -2.2);

  function plant(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); root.add(g);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.46, 18), M.marble);
    pot.position.y = 0.23; pot.castShadow = true; g.add(pot);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + Math.random() * 0.5;
      const h = 0.5 + Math.random() * 0.85;
      const leaf = new THREE.Mesh(leafGeometry(h, 0.085 + Math.random() * 0.05, 0.28), M.plant);
      leaf.position.set(Math.cos(a) * 0.10, 0.44, Math.sin(a) * 0.10);
      leaf.rotation.set(-0.30 - Math.random() * 0.55, a, (Math.random() - 0.5) * 0.4);
      leaf.castShadow = true; g.add(leaf);
    }
    return g;
  }
  plant(-6.0, -5.6, 1.25); plant(0.3, 4.6, 1.0); plant(X1 - 1.0, -6.6, 1.1);

  /* =================================================================
     LIGHTING — every fixture belongs to an addressable layer
  ================================================================= */

  /* --- daylight ------------------------------------------------- */
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  sun.target.position.set(-1, 1, -1);
  root.add(sun, sun.target);
  layerLights.daylight.push({ light: sun, base: 1, isSun: true });

  const sky = new THREE.HemisphereLight(0xbcd7ee, 0x2e2a26, 0.6);
  root.add(sky);
  layerLights.daylight.push({ light: sky, base: 0.42 });

  // soft window fill so glazing reads as a light source, not a hole
  const winFillL = new THREE.RectAreaLight(0xcfe2f2, 6, D - 0.4, H_HI - 0.4);
  winFillL.position.set(X0 + 0.05, H_HI / 2, CZ); winFillL.lookAt(X0 + 4, H_HI / 2 - 1, CZ);
  root.add(winFillL); layerLights.daylight.push({ light: winFillL, base: 1 });

  const winFillF = new THREE.RectAreaLight(0xcfe2f2, 5, MEZ_X - X0 - 0.3, H_HI - 0.4);
  winFillF.position.set((X0 + MEZ_X) / 2, H_HI / 2, Z0 + 0.05); winFillF.lookAt((X0 + MEZ_X) / 2, H_HI / 2 - 1, Z0 + 4);
  root.add(winFillF); layerLights.daylight.push({ light: winFillF, base: 1 });

  /* --- cove: perimeter slot washing the high ceiling ------------ */
  function coveRun(w, h, x, y, z, ry, up = true) {
    const l = new THREE.RectAreaLight(0xffffff, 8, w, h);
    l.position.set(x, y, z);
    l.lookAt(x, up ? y + 3 : y - 3, z + (up ? 0.001 : 0.001));
    if (ry) l.rotation.z = ry;
    root.add(l);
    layerLights.cove.push({ light: l, base: 1 });
    // the visible tape itself
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, h), regEmis('cove', emissiveMat(), 1.6));
    strip.position.set(x, y - 0.02, z);
    root.add(strip);
    return l;
  }
  // high perimeter cove
  coveRun(D - 1.2, 0.5, X0 + 0.55, H_HI - 0.22, CZ, Math.PI / 2);
  coveRun(MEZ_X - X0 - 0.8, 0.5, (X0 + MEZ_X) / 2, H_HI - 0.22, Z0 + 0.55, 0);
  // mezzanine soffit cove — grazes the wood wall and the dining zone
  coveRun(mezW - 0.8, 0.45, MEZ_X + mezW / 2, H_LO - 0.14, Z0 + 0.5, 0);
  // the strip along the front of the high cove is emissive only
  {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(D - 1.2, 0.03, 0.5),
      regEmis('cove', emissiveMat(), 1.6));
    strip.rotation.y = Math.PI / 2;
    strip.position.set(MEZ_X - 0.35, H_HI - 0.24, CZ);
    root.add(strip);
  }
  const coveEdge = new THREE.RectAreaLight(0xffffff, 6, D - 0.6, 0.4);
  coveEdge.position.set(MEZ_X + 0.14, H_LO - 0.12, CZ);
  coveEdge.lookAt(MEZ_X + 3, H_LO - 2.2, CZ);
  root.add(coveEdge); layerLights.cove.push({ light: coveEdge, base: 1 });

  /* --- downlights ------------------------------------------------ */
/* Forward rendering evaluates every light in every fragment, so the
   fixture count is a frame-time budget as much as a design choice.
   Eight downlights, placed where the camera actually passes, read the
   same as a full RCP grid at a fraction of the cost. */
  const DOWN_POS = [
    [2.4, -6.2], [5.4, -6.2],            // under the mezzanine, far end
    [2.6, -4.3], [5.2, -4.3],            // over the dining table
    [4.4, 1.2], [5.8, 3.6],              // kitchen run
    [-4.6, -5.0], [-3.2, 3.4],           // high ceiling wash, living volume
  ];
  let shadowBudget = 2;
  DOWN_POS.forEach(([x, z], i) => {
    const high = x < MEZ_X && Math.abs(z) > 2.5;
    const y = x < MEZ_X ? H_HI - 0.06 : H_LO - 0.06;
    const sp = new THREE.SpotLight(0xffffff, 60, y * 3.2, high ? 0.42 : 0.62, 0.72, 2);
    sp.position.set(x, y, z);
    sp.target.position.set(x, 0, z);
    if (shadowBudget > 0 && (i === 2 || i === 6)) {
      sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024);
      sp.shadow.bias = -0.0012; sp.shadow.normalBias = 0.02;
      shadowBudget--;
    }
    root.add(sp, sp.target);
    layerLights.down.push({ light: sp, base: high ? 1.5 : 1 });

    // trim + aperture
    const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16), M.steel);
    trim.position.set(x, y + 0.005, z); root.add(trim);
    const ap = new THREE.Mesh(new THREE.CircleGeometry(0.058, 16), regEmis('down', emissiveMat(), 2.2));
    ap.rotation.x = Math.PI / 2; ap.position.set(x, y - 0.008, z); root.add(ap);

    // pool of light on the marble — cheap, and it is what sells the floor
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(high ? 4.2 : 2.6, high ? 4.2 : 2.6),
      new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })
    );
    pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.02, z); pool.renderOrder = 3;
    root.add(pool); pools.push({ mesh: pool, layer: 'down', peak: high ? 0.16 : 0.26 });

    // volumetric cone, only visible when the room is dark
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(high ? 1.9 : 1.25, y, 20, 1, true),
      new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0 })
    );
    cone.position.set(x, y / 2, z); cone.renderOrder = 4;
    root.add(cone); cones.push({ mesh: cone, layer: 'down', peak: 0.035 });
  });

  /* --- accent: art light + wall grazers -------------------------- */
  const pic = new THREE.SpotLight(0xffffff, 40, 6, 0.5, 0.85, 2);
  pic.position.set(X1 - 0.75, 3.05, -2.2); pic.target.position.set(X1 - 0.05, 1.9, -2.2);
  root.add(pic, pic.target); layerLights.accent.push({ light: pic, base: 1 });
  const picBar = box(0.06, 0.06, 0.5, M.brass, X1 - 0.62, 3.02, -2.2);
  const picGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.42), regEmis('accent', emissiveMat(), 2.0));
  picGlow.position.set(X1 - 0.62, 2.985, -2.2); root.add(picGlow);

  // grazers on the slat wall
  [2.6, 5.4].forEach(x => {
    const gz = new THREE.SpotLight(0xffffff, 34, 6, 0.36, 0.9, 2);
    gz.position.set(x, H_LO - 0.12, Z0 + 0.55);
    gz.target.position.set(x, 0.4, Z0 + 0.06);
    root.add(gz, gz.target); layerLights.accent.push({ light: gz, base: 1 });
  });

  // under-cabinet run in the kitchen
  const ucStrip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 3.3), regEmis('accent', emissiveMat(), 1.4));
  ucStrip.position.set(X1 - 0.4, 1.865, KZ); root.add(ucStrip);

  /* --- pendant: three brass rings over the dining table ---------- */
  const pendant = new THREE.Group(); root.add(pendant);
  const ringSpec = [[0.62, 2.42, 0, 0], [0.46, 2.06, 0.34, -0.26], [0.34, 1.78, -0.28, 0.22]];
  ringSpec.forEach(([r, y, dx, dz]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.028, 10, 48), M.brass);
    ring.rotation.x = Math.PI / 2; ring.position.set(DT.x + dx, y, DT.z + dz);
    pendant.add(ring);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(r, 0.019, 8, 48), regEmis('pendant', emissiveMat(0xffd9a0), 2.6));
    inner.rotation.x = Math.PI / 2; inner.position.set(DT.x + dx, y - 0.028, DT.z + dz);
    pendant.add(inner);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, H_LO - y, 4), M.steel);
    wire.position.set(DT.x + dx, (H_LO + y) / 2, DT.z + dz); pendant.add(wire);
  });
  const pLight = new THREE.PointLight(0xffca82, 26, 9, 2);
  pLight.position.set(DT.x, 2.1, DT.z); root.add(pLight);
  layerLights.pendant.push({ light: pLight, base: 1 });
  const pPool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  pPool.rotation.x = -Math.PI / 2; pPool.position.set(DT.x, 0.02, DT.z); pPool.renderOrder = 3;
  root.add(pPool); pools.push({ mesh: pPool, layer: 'pendant', peak: 0.30 });

  /* --- portable: table + floor lamps ----------------------------- */
  function tableLamp(x, y, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); root.add(g);
    box(0.10, 0.34, 0.10, M.brass, 0, 0.17, 0, g);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.26, 22, 1, true),
      regEmis('lamp', new THREE.MeshStandardMaterial({
        color: 0x2a2015, emissive: new THREE.Color(0xffcf94), emissiveIntensity: 1,
        roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.95,
      }), 1.9));
    sh.position.y = 0.46; g.add(sh);
    const l = new THREE.PointLight(0xffc98a, 14, 6, 2);
    l.position.set(0, 0.44, 0); g.add(l);
    layerLights.lamp.push({ light: l, base: 1 });
    return g;
  }
  tableLamp(-5.6, 0.65, -3.4);
  tableLamp(-5.5, 0.58, 3.0);

  // floor lamp with an arc arm beside the sofa
  const fl = new THREE.Group(); fl.position.set(-5.9, 0, 0.4); root.add(fl);
  box(0.34, 0.03, 0.34, M.steel, 0, 0.02, 0, fl);
  box(0.05, 1.75, 0.05, M.brass, 0, 0.88, 0, fl);
  const flShade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.24, 20, 1, true),
    regEmis('lamp', new THREE.MeshStandardMaterial({
      color: 0x2a2015, emissive: new THREE.Color(0xffcf94), emissiveIntensity: 1,
      roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.95,
    }), 1.9));
  flShade.position.set(0, 1.66, 0); fl.add(flShade);
  const flLight = new THREE.PointLight(0xffc98a, 18, 8, 2);
  flLight.position.set(0, 1.6, 0); fl.add(flLight);
  layerLights.lamp.push({ light: flLight, base: 1 });

  /* --- pathway: stair nosing + skirting run ---------------------- */
  for (let i = 0; i < NSTEP; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.012, 0.03),
      regEmis('step', emissiveMat(0xffb066), 2.4));
    s.position.set(4.9, RISE * (i + 1) + 0.035, 3.4 - i * GO + GO / 2 - 0.02);
    root.add(s);
  }
  const stepL = new THREE.PointLight(0xff9d4d, 8, 7, 2);
  stepL.position.set(4.7, 1.4, 2.0); root.add(stepL);
  layerLights.step.push({ light: stepL, base: 1 });

  // skirting wash along the entry wall
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(W - 1.0, 0.02, 0.05), regEmis('step', emissiveMat(0xffb066), 2.0));
  skirt.position.set(CX, 0.055, Z1 - 0.08); root.add(skirt);
  const skirtL = new THREE.PointLight(0xff9d4d, 6, 9, 2);
  skirtL.position.set(CX, 0.35, Z1 - 0.6);
  root.add(skirtL); layerLights.step.push({ light: skirtL, base: 1 });

  /* =================================================================
     APPLY — push a blended scene state onto every fixture
  ================================================================= */
  const _c = new THREE.Color();
  const SUN_DIST = 26;

  /* Rect-area lights are metered in nits across their whole surface, so
     a 13-metre window strip needs a fraction of what a 40cm cove strip
     does. These gains put every layer on one perceptual footing. */
  const RECT_GAIN = { daylight: 0.85, cove: 3.2, down: 2.2, accent: 2.6, pendant: 2.4, lamp: 2.4, step: 1.6 };
  const PT_GAIN   = { daylight: 1.8, cove: 26, down: 58, accent: 38, pendant: 26, lamp: 15, step: 9 };

  const _z = new THREE.Color(), _h = new THREE.Color();
  const ZEN_NIGHT = new THREE.Color(0.030, 0.045, 0.075), ZEN_DAY = new THREE.Color(0.10, 0.24, 0.46);
  const HOR_NIGHT = new THREE.Color(0.035, 0.038, 0.055), HOR_DAY = new THREE.Color(0.74, 0.63, 0.50);

  function apply(state) {
    /* --- exterior first: the sky sets the mood the interior sits in --- */
    {
      const el = state.sunEl * Math.PI / 180, az = state.sunAz * Math.PI / 180;
      skyUni.uSunDir.value.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
      const day = Math.max(0, Math.min(1, (state.sunEl + 7) / 26));
      const [sr, sg, sb] = kelvinToRGB(state.sunK);
      skyUni.uSunCol.value.setRGB(sr, sg, sb, THREE.SRGBColorSpace);
      skyUni.uSunPow.value = day * 0.95 + 0.04;
      skyUni.uZenith.value.copy(_z.copy(ZEN_NIGHT).lerp(ZEN_DAY, day));
      skyUni.uHorizon.value.copy(_h.copy(HOR_NIGHT).lerp(HOR_DAY, Math.pow(day, 0.75)));
      const gm = 0.10 + day * 0.72;
      extGround.material.color.setRGB(0.055 * gm + 0.012, 0.085 * gm + 0.016, 0.050 * gm + 0.012);
      massing.material.color.setRGB(0.035 + day * 0.14, 0.038 + day * 0.14, 0.045 + day * 0.15);
      palmMat.color.setRGB(0.022 + day * 0.11, 0.045 + day * 0.19, 0.020 + day * 0.09);
    }

    for (const { id } of LAYERS) {
      const L = state.layers[id];
      const [r, g, b] = kelvinToRGB(L.k);
      _c.setRGB(r, g, b, THREE.SRGBColorSpace);

      for (const entry of layerLights[id]) {
        const { light, base } = entry;
        if (entry.isSun) {
          const el = state.sunEl * Math.PI / 180, az = state.sunAz * Math.PI / 180;
          light.position.set(
            Math.cos(el) * Math.sin(az) * SUN_DIST,
            Math.max(0.5, Math.sin(el) * SUN_DIST),
            Math.cos(el) * Math.cos(az) * SUN_DIST
          );
          const [sr, sg, sb] = kelvinToRGB(state.sunK);
          light.color.setRGB(sr, sg, sb, THREE.SRGBColorSpace);
          // shades cut the beam, not just the view
          light.intensity = state.sunI * (1 - state.shade * 0.92) * L.i;
          continue;
        }
        if (light.isHemisphereLight) {
          light.intensity = base * state.skyI * (1 - state.shade * 0.55);
          continue;
        }
        const shadeCut = id === 'daylight' ? (1 - state.shade * 0.90) : 1;
        light.color.copy(_c);
        light.intensity = base * L.i * shadeCut * (light.isRectAreaLight ? RECT_GAIN[id] : PT_GAIN[id]);
      }

      for (const { mat, base } of layerEmis[id]) {
        mat.emissive.copy(_c);
        mat.emissiveIntensity = base * Math.pow(L.i, 0.7);
      }
    }

    // floor pools + volumetrics respond to how dark the room actually is
    const ambient = state.layers.daylight.i * (1 - state.shade * 0.9);
    for (const p of pools) {
      const L = state.layers[p.layer];
      const [r, g, b] = kelvinToRGB(L.k);
      p.mesh.material.color.setRGB(r, g, b, THREE.SRGBColorSpace);
      p.mesh.material.opacity = p.peak * L.i * (1 - Math.min(1, ambient * 1.15));
    }
    for (const c of cones) {
      const L = state.layers[c.layer];
      const [r, g, b] = kelvinToRGB(L.k);
      c.mesh.material.color.setRGB(r, g, b, THREE.SRGBColorSpace);
      c.mesh.material.opacity = c.peak * L.i * (1 - Math.min(1, ambient * 1.6));
    }

    // shades travel
    for (const s of shades) {
      const h = Math.max(0.001, state.shade * s.full);
      s.mesh.scale.y = h;
      s.mesh.material.opacity = 0.94;
      s.mesh.visible = state.shade > 0.02;
    }

    // glazing picks up the sky
    const [gr, gg, gb] = kelvinToRGB(state.sunK);
    M.glass.color.setRGB(
      0.55 + gr * 0.35, 0.60 + gg * 0.32, 0.66 + gb * 0.30, THREE.SRGBColorSpace
    );
  }

  return { root, apply, skyUni, pendant, DT };
}
