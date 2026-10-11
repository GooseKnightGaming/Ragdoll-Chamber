/*
  RAGDOLL CHAMBER — drawing
  Three.js (r128). V0.2: the look-and-feel pass.
  - The dungeon: irregular stone with mortar and grime (bump-mapped), wet flagstones that
    catch the light, a timbered ceiling, a studded door, a barred window letting in cold
    moonlight, torches that really light the room, straw, a barrel, chains and dust in the air.
    The room runs on towards the camera (no black void at the sides), with a stone sill
    marking where the play area ends.
  - The rag doll: chunkier, toon-shaded felt with a stitched seam down its front, an ink
    outline round every part, yarn hair, and a flash when it is hit.
  - Juice: camera shake, a drop marker under falling props, dust where things land,
    a cannon that fires and recoils, a muzzle flash, smoke.
*/
(function (root) {
  'use strict';
  const RC = root.RC;
  const T = root.THREE;

  const rnd = (a, b) => a + Math.random() * (b - a);
  // a seeded random, so the room is the same each time
  let seed = 7;
  const srnd = (a, b) => { seed = (seed * 16807) % 2147483647; return a + ((seed - 1) / 2147483646) * (b - a); };

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, repeat, color) {
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    if (color) t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }
  // speckle: fine noise over a canvas
  function speckle(c, w, h, n, alpha, dark) {
    for (let i = 0; i < n; i++) {
      c.fillStyle = dark ? `rgba(0,0,0,${alpha * Math.random()})` : `rgba(255,255,255,${alpha * Math.random()})`;
      c.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 3));
    }
  }

  // ── textures ──
  // stone wall: rows of irregular blocks; returns { map, bump }
  function stoneWall(W, H, rows, tint) {
    const col = canvas(W, H), bmp = canvas(W, H), c = col.getContext('2d'), b = bmp.getContext('2d');
    c.fillStyle = '#2a221d'; c.fillRect(0, 0, W, H);
    b.fillStyle = '#202020'; b.fillRect(0, 0, W, H);
    let y = 0;
    const rowH = H / rows;
    for (let r = 0; r < rows; r++) {
      const h = rowH * srnd(0.85, 1.15);
      let x = -srnd(0, 60);
      while (x < W) {
        const w = srnd(70, 150);
        const g = 4 + srnd(0, 3);
        const base = srnd(78, 112), warm = srnd(-6, 10);
        const R = base + 18 + warm + tint[0], G = base + 8 + tint[1], B = base - 4 - warm + tint[2];
        c.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`;
        const rr = 7;
        c.beginPath(); c.roundRect ? c.roundRect(x + g, y + g, w - 2 * g, h - 2 * g, rr) : c.rect(x + g, y + g, w - 2 * g, h - 2 * g); c.fill();
        // a lit top edge and a shadowed lower edge on each stone
        c.fillStyle = 'rgba(255,240,220,0.07)'; c.fillRect(x + g + 2, y + g, w - 2 * g - 4, 4);
        c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x + g + 2, y + h - g - 5, w - 2 * g - 4, 5);
        // bump: stones raised, a little rounded
        const lv = srnd(150, 200) | 0;
        b.fillStyle = `rgb(${lv},${lv},${lv})`;
        b.beginPath(); b.roundRect ? b.roundRect(x + g, y + g, w - 2 * g, h - 2 * g, rr) : b.rect(x + g, y + g, w - 2 * g, h - 2 * g); b.fill();
        b.fillStyle = 'rgba(255,255,255,0.15)'; b.fillRect(x + g + 6, y + g + 6, w - 2 * g - 12, h - 2 * g - 12);
        // mottling: soft patches of lighter and darker stone, and a darker rim
        c.save(); c.beginPath(); c.rect(x + g, y + g, w - 2 * g, h - 2 * g); c.clip();
        for (let i = 0; i < 5; i++) {
          const px = x + srnd(0, w), py = y + srnd(0, h), rr2 = srnd(12, 40), dark = srnd(0, 1) < 0.55;
          const gm = c.createRadialGradient(px, py, 0, px, py, rr2);
          gm.addColorStop(0, dark ? 'rgba(20,12,6,0.22)' : 'rgba(255,240,215,0.1)'); gm.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = gm; c.fillRect(px - rr2, py - rr2, rr2 * 2, rr2 * 2);
        }
        const edge = c.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, x + w / 2, y + h / 2, Math.max(w, h) * 0.65);
        edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,0.35)');
        c.fillStyle = edge; c.fillRect(x, y, w, h);
        c.restore();
        x += w;
      }
      y += h;
    }
    speckle(c, W, H, 7000, 0.08, true);
    speckle(b, W, H, 2500, 0.06, true);
    // grime: darker towards the floor, damp streaks down from the top
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.55, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,12,4,0.5)');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      const sx = srnd(0, W), sw = srnd(6, 26), sl = srnd(H * 0.15, H * 0.6);
      const st = c.createLinearGradient(0, 0, 0, sl);
      st.addColorStop(0, 'rgba(10,14,8,0.35)'); st.addColorStop(1, 'rgba(10,14,8,0)');
      c.fillStyle = st; c.fillRect(sx, 0, sw, sl);
    }
    return { map: tex(col, null, true), bump: tex(bmp) };
  }
  // flagstones: big irregular slabs, cracks, and puddles that shine (roughness map)
  function flagFloor(W) {
    const col = canvas(W, W), bmp = canvas(W, W), rgh = canvas(W, W);
    const c = col.getContext('2d'), b = bmp.getContext('2d'), r = rgh.getContext('2d');
    c.fillStyle = '#1d1815'; c.fillRect(0, 0, W, W);
    b.fillStyle = '#181818'; b.fillRect(0, 0, W, W);
    r.fillStyle = '#ffffff'; r.fillRect(0, 0, W, W);
    const n = 4, cell = W / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      // split some cells into two slabs
      const parts = srnd(0, 1) < 0.4 ? [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]] : srnd(0, 1) < 0.5 ? [[0, 0, 0.55, 1], [0.55, 0, 0.45, 1]] : [[0, 0, 1, 1]];
      for (const [px, py, pw, ph] of parts) {
        const x = i * cell + px * cell, y = j * cell + py * cell, w = pw * cell, h = ph * cell, g = 5;
        const base = srnd(70, 98);
        c.fillStyle = `rgb(${base + 14 | 0},${base + 6 | 0},${base - 2 | 0})`;
        c.fillRect(x + g, y + g, w - 2 * g, h - 2 * g);
        const lv = srnd(150, 190) | 0;
        b.fillStyle = `rgb(${lv},${lv},${lv})`; b.fillRect(x + g, y + g, w - 2 * g, h - 2 * g);
        // worn edges
        c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(x + g, y + h - g - 6, w - 2 * g, 6); c.fillRect(x + w - g - 6, y + g, 6, h - 2 * g);
        // a crack now and then
        if (srnd(0, 1) < 0.35) {
          c.strokeStyle = 'rgba(0,0,0,0.45)'; b.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = b.lineWidth = 2;
          let cx = x + srnd(10, w - 10), cy = y + g;
          c.beginPath(); b.beginPath(); c.moveTo(cx, cy); b.moveTo(cx, cy);
          for (let k = 0; k < 6; k++) { cx += srnd(-18, 18); cy += h / 7; c.lineTo(cx, cy); b.lineTo(cx, cy); }
          c.stroke(); b.stroke();
        }
      }
    }
    speckle(c, W, W, 12000, 0.14, true); speckle(c, W, W, 5000, 0.05, false);
    speckle(b, W, W, 8000, 0.25, true);
    // puddles: darker, and glossy
    for (let i = 0; i < 5; i++) {
      const px = srnd(0, W), py = srnd(0, W), rx = srnd(30, 90), ry = rx * srnd(0.4, 0.8);
      const gc = c.createRadialGradient(px, py, 0, px, py, rx);
      gc.addColorStop(0, 'rgba(8,10,14,0.45)'); gc.addColorStop(1, 'rgba(8,10,14,0)');
      c.fillStyle = gc; c.beginPath(); c.ellipse(px, py, rx, ry, srnd(0, 3), 0, 7); c.fill();
      const gr = r.createRadialGradient(px, py, 0, px, py, rx);
      gr.addColorStop(0, 'rgb(40,40,40)'); gr.addColorStop(0.7, 'rgb(90,90,90)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      r.fillStyle = gr; r.beginPath(); r.ellipse(px, py, rx, ry, 0, 0, 7); r.fill();
    }
    // the mortar lines are rough; slabs a bit smoother than mortar
    return { map: tex(col, [2, 2], true), bump: tex(bmp, [2, 2]), rough: tex(rgh, [2, 2]) };
  }
  function woodTex(W, H, base) {
    const col = canvas(W, H), c = col.getContext('2d');
    c.fillStyle = base; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      c.strokeStyle = `rgba(0,0,0,${rnd(0.05, 0.22)})`; c.lineWidth = rnd(1, 3);
      const y = rnd(0, H); c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x <= W; x += 32) c.lineTo(x, y + Math.sin(x / rnd(40, 90) + i) * rnd(1, 4));
      c.stroke();
    }
    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(rnd(0, W), rnd(0, H), rnd(4, 9), rnd(2, 4), 0, 0, 7); c.fill(); }
    speckle(c, W, H, 2000, 0.1, true);
    return tex(col, null, true);
  }
  // felt: soft woven cloth with a little colour variation; seams drawn on where asked
  function feltTex(seams) {
    const W = 512, col = canvas(W, W), c = col.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, W);
    for (let i = 0; i < 2500; i++) { const v = rnd(225, 255) | 0; c.fillStyle = `rgba(${v},${v},${v},0.5)`; c.fillRect(rnd(0, W), rnd(0, W), rnd(2, 6), rnd(2, 6)); }
    c.globalAlpha = 0.07; c.fillStyle = '#000';
    for (let i = 0; i < W; i += 4) c.fillRect(i, 0, 1, W);
    for (let i = 0; i < W; i += 4) c.fillRect(0, i, W, 1);
    c.globalAlpha = 1;
    if (seams) {
      // a stitched seam straight down the front (u = 0.25 is the sphere's +z) and round the waist
      const stitchLine = (x0, y0, x1, y1, n) => {
        c.strokeStyle = 'rgba(60,30,20,0.55)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        c.strokeStyle = '#f4e2c0'; c.lineWidth = 5; c.lineCap = 'round';
        for (let i = 0; i <= n; i++) {
          const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
          const dx = (y1 - y0), dy = -(x1 - x0), l = Math.hypot(dx, dy) || 1;
          c.beginPath(); c.moveTo(x - dx / l * 9, y - dy / l * 9); c.lineTo(x + dx / l * 9, y + dy / l * 9); c.stroke();
        }
      };
      stitchLine(W * 0.25, W * 0.12, W * 0.25, W * 0.88, 16);
      stitchLine(0, W * 0.62, W, W * 0.62, 34);
    }
    return tex(col, null, true);
  }
  // a soft round glow, for flames, halos, flashes and dust
  function glowTex(inner, outer) {
    const W = 128, col = canvas(W, W), c = col.getContext('2d');
    const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    g.addColorStop(0, inner); g.addColorStop(0.35, outer); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, W);
    return new T.CanvasTexture(col);
  }
  function flameTex() {
    const W = 64, H = 128, col = canvas(W, H), c = col.getContext('2d');
    const g = c.createRadialGradient(W / 2, H * 0.72, 2, W / 2, H * 0.6, H * 0.5);
    g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,200,90,0.95)'); g.addColorStop(0.6, 'rgba(255,110,30,0.6)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(W / 2, 0); c.bezierCurveTo(W * 0.95, H * 0.45, W * 0.9, H * 0.95, W / 2, H * 0.95); c.bezierCurveTo(W * 0.1, H * 0.95, W * 0.05, H * 0.45, W / 2, 0); c.fill();
    return new T.CanvasTexture(col);
  }

  class Renderer {
    constructor(canvasEl, world, buddy) {
      this.world = world; this.buddy = buddy;
      this.r = new T.WebGLRenderer({ canvas: canvasEl, antialias: true });
      this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.r.shadowMap.enabled = true;
      this.r.shadowMap.type = T.PCFSoftShadowMap;
      this.r.outputEncoding = T.sRGBEncoding;
      this.r.toneMapping = T.ACESFilmicToneMapping;
      this.r.toneMappingExposure = 1.25;
      this.r.physicallyCorrectLights = false;
      this.scene = new T.Scene();
      this.scene.background = new T.Color('#0a0706');
      this.scene.fog = new T.Fog('#0a0706', 7, 17);
      this.camera = new T.PerspectiveCamera(46, 1, 0.1, 60);
      this.cam = { az: 0.35, el: 0.3, dist: 5.6, target: new T.Vector3(0, 0.9, 0) };
      this.shakeT = 0; this.shakeA = 0;
      const g = new Uint8Array([60, 120, 190, 255]);
      this.toon = new T.DataTexture(g, 4, 1, T.LuminanceFormat);
      this.toon.minFilter = this.toon.magFilter = T.NearestFilter; this.toon.needsUpdate = true;
      this.mat = (color, opts) => new T.MeshToonMaterial(Object.assign({ color, gradientMap: this.toon }, opts || {}));
      this.ink = new T.MeshBasicMaterial({ color: '#120a06', side: T.BackSide, toneMapped: false });
      this.glow = { fire: glowTex('rgba(255,220,150,1)', 'rgba(255,120,30,0.35)'), cool: glowTex('rgba(200,220,255,0.9)', 'rgba(120,150,220,0.25)'), white: glowTex('rgba(255,255,255,1)', 'rgba(255,255,255,0.4)'), smoke: glowTex('rgba(150,140,130,0.75)', 'rgba(110,100,95,0.35)'), dust: glowTex('rgba(160,130,100,0.7)', 'rgba(120,95,70,0.3)') };
      this.flame = flameTex();
      this.buildRoom();
      this.buildBuddy();
      this.props = new Map();
      this.markers = new Map();
      this.fx = [];
      this.stars = this.buildStars();
      this.cannons = [];
    }

    // an ink outline round a mesh: its own shape, a little bigger, drawn inside out
    outline(mesh, k) {
      const o = new T.Mesh(mesh.geometry, this.ink);
      o.scale.set(k[0], k[1], k[2]);
      o.castShadow = false;
      mesh.add(o);
      return o;
    }

    // ── the dungeon ──
    buildRoom() {
      const R = this.world.room, S = this.scene;
      const FRONT = 10;                                   // the room runs on towards the camera this far (looks only)
      const wall = stoneWall(1024, 512, 7, [0, 0, 0]);
      const wallMat = (len) => {
        const m = new T.MeshStandardMaterial({ map: wall.map.clone(), bumpMap: wall.bump.clone(), bumpScale: 0.06, roughness: 0.92, metalness: 0 });
        for (const t of [m.map, m.bumpMap]) { t.needsUpdate = true; t.repeat.set(len / 4.5, 1); t.wrapS = t.wrapT = T.RepeatWrapping; }
        return m;
      };
      const fl = flagFloor(1024);
      const floorMat = new T.MeshStandardMaterial({ map: fl.map, bumpMap: fl.bump, bumpScale: 0.05, roughnessMap: fl.rough, roughness: 0.75, metalness: 0.05 });
      const floorLen = R.d + FRONT;
      for (const t of [fl.map, fl.bump, fl.rough]) t.repeat.set(R.w * 2 / 3, floorLen / 3);
      const floor = new T.Mesh(new T.PlaneGeometry(R.w * 2, floorLen), floorMat);
      floor.rotation.x = -Math.PI / 2; floor.position.z = (FRONT - R.d) / 2; floor.receiveShadow = true; S.add(floor);
      this.floor = floor;
      const back = new T.Mesh(new T.PlaneGeometry(R.w * 2, R.h), wallMat(R.w * 2)); back.position.set(0, R.h / 2, -R.d); back.receiveShadow = true; S.add(back);
      const sideLen = R.d + FRONT;
      const left = new T.Mesh(new T.PlaneGeometry(sideLen, R.h), wallMat(sideLen)); left.rotation.y = Math.PI / 2; left.position.set(-R.w, R.h / 2, (FRONT - R.d) / 2); left.receiveShadow = true; S.add(left);
      const right = new T.Mesh(new T.PlaneGeometry(sideLen, R.h), wallMat(sideLen)); right.rotation.y = -Math.PI / 2; right.position.set(R.w, R.h / 2, (FRONT - R.d) / 2); right.receiveShadow = true; S.add(right);
      this.walls = { back, left, right };
      // the ceiling: dark planks on heavy beams
      const plank = woodTex(512, 512, '#3a271b'); plank.repeat.set(2, 4);
      const ceil = new T.Mesh(new T.PlaneGeometry(R.w * 2, sideLen), new T.MeshStandardMaterial({ map: plank, roughness: 0.95 }));
      ceil.rotation.x = Math.PI / 2; ceil.position.set(0, R.h, (FRONT - R.d) / 2); S.add(ceil);
      const beamTex = woodTex(256, 64, '#4a3020');
      const beamMat = new T.MeshStandardMaterial({ map: beamTex, roughness: 0.9 });
      for (let z = -R.d + 0.6; z < FRONT; z += 1.9) {
        const beam = new T.Mesh(new T.BoxGeometry(R.w * 2, 0.26, 0.24), beamMat); beam.position.set(0, R.h - 0.13, z); beam.castShadow = true; S.add(beam);
      }
      // corner pillars, so the room is not a box of flat planes
      const pillarMat = wallMat(1.2);
      for (const x of [-R.w + 0.18, R.w - 0.18]) {
        const p = new T.Mesh(new T.BoxGeometry(0.4, R.h, 0.4), pillarMat); p.position.set(x, R.h / 2, -R.d + 0.18); p.castShadow = p.receiveShadow = true; S.add(p);
      }
      // the sill: where the play area ends, a low stone step across the room
      const sill = new T.Mesh(new T.BoxGeometry(R.w * 2, 0.12, 0.3), new T.MeshStandardMaterial({ color: '#6a5d52', roughness: 0.9, map: wall.map }));
      sill.position.set(0, 0.06, R.d + 0.15); sill.receiveShadow = true; S.add(sill);
      // a studded door in the back wall
      const doorTex = woodTex(256, 512, '#4f3322');
      const door = new T.Mesh(new T.BoxGeometry(1.1, 2.1, 0.1), new T.MeshStandardMaterial({ map: doorTex, roughness: 0.85 }));
      door.position.set(-1.25, 1.05, -R.d + 0.05); door.receiveShadow = true; S.add(door);
      const iron = new T.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.5, metalness: 0.7 });
      for (const y of [0.45, 1.05, 1.65]) { const band = new T.Mesh(new T.BoxGeometry(1.14, 0.08, 0.04), iron); band.position.set(-1.25, y, -R.d + 0.12); S.add(band); for (let i = 0; i < 5; i++) { const stud = new T.Mesh(new T.SphereGeometry(0.025, 8, 6), iron); stud.position.set(-1.7 + i * 0.22, y, -R.d + 0.145); S.add(stud); } }
      const ring = new T.Mesh(new T.TorusGeometry(0.07, 0.014, 6, 16), iron); ring.position.set(-0.85, 1.0, -R.d + 0.15); S.add(ring);
      const arch = new T.Mesh(new T.BoxGeometry(1.4, 0.18, 0.16), wallMat(1.4)); arch.position.set(-1.25, 2.18, -R.d + 0.08); S.add(arch);
      // the barred window high on the left wall: cold moonlight
      const winZ = 0.3, winY = 3.0;
      const sky = new T.Mesh(new T.PlaneGeometry(0.9, 0.6), new T.MeshBasicMaterial({ color: '#7f9cc8' }));
      sky.rotation.y = Math.PI / 2; sky.position.set(-R.w + 0.01, winY, winZ); S.add(sky);
      for (let i = 0; i < 4; i++) { const bar = new T.Mesh(new T.CylinderGeometry(0.016, 0.016, 0.62, 6), iron); bar.position.set(-R.w + 0.04, winY, winZ - 0.33 + i * 0.22); S.add(bar); }
      // a deep stone reveal round it
      const revealMat = new T.MeshStandardMaterial({ color: '#3a322c', roughness: 0.95 });
      for (const [dy, dz, h, d] of [[0.34, 0, 0.08, 1.02], [-0.34, 0, 0.08, 1.02], [0, 0.49, 0.6, 0.06], [0, -0.49, 0.6, 0.06]]) { const r = new T.Mesh(new T.BoxGeometry(0.22, h, d), revealMat); r.position.set(-R.w + 0.1, winY + dy, winZ + dz); S.add(r); }
      // the moonbeam: a pale shaft of light from the window to the floor
      const beamGeo = new T.CylinderGeometry(0.36, 0.8, 4.2, 18, 1, true); beamGeo.translate(0, -2.1, 0);
      const beam = new T.Mesh(beamGeo, new T.MeshBasicMaterial({ color: '#9db8ff', transparent: true, opacity: 0.045, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      beam.position.set(-R.w + 0.05, winY, winZ); beam.rotation.z = 0.95; S.add(beam);
      this.moonBeam = beam;
      // lights: dim cold fill; moonlight through the window; a warm lantern hanging over the middle; two torches
      S.add(new T.HemisphereLight('#6d7690', '#20140c', 0.32));
      const moon = new T.DirectionalLight('#9fb6ff', 0.55);
      moon.position.set(-R.w - 3, winY + 3.2, winZ); moon.target.position.set(0.6, 0, 0.2);
      moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); moon.shadow.bias = -0.0008;
      Object.assign(moon.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 16 });
      S.add(moon); S.add(moon.target);
      const lantern = new T.SpotLight('#ffcf8f', 1.6, 9, 0.85, 0.55, 1.2);
      lantern.position.set(0, R.h - 0.5, 0.2); lantern.target.position.set(0, 0, 0.1);
      lantern.castShadow = true; lantern.shadow.mapSize.set(1024, 1024); lantern.shadow.bias = -0.0006; lantern.shadow.camera.near = 0.3; lantern.shadow.camera.far = 8;
      S.add(lantern); S.add(lantern.target);
      this.lantern = lantern;
      // the lantern itself, on its chain
      const lantBody = new T.Mesh(new T.CylinderGeometry(0.1, 0.13, 0.22, 8), iron); lantBody.position.set(0, R.h - 0.62, 0.2); S.add(lantBody);
      const lantGlow = new T.Sprite(new T.SpriteMaterial({ map: this.glow.fire, color: '#ffd9a0', transparent: true, blending: T.AdditiveBlending, depthWrite: false })); lantGlow.scale.set(0.9, 0.9, 1); lantGlow.position.set(0, R.h - 0.64, 0.2); S.add(lantGlow);
      this.lantGlow = lantGlow;
      for (let i = 0; i < 5; i++) { const link = new T.Mesh(new T.TorusGeometry(0.03, 0.008, 5, 10), iron); link.position.set(0, R.h - 0.08 - i * 0.075, 0.2); link.rotation.y = i % 2 ? Math.PI / 2 : 0; S.add(link); }
      this.torches = [];
      for (const x of [-R.w + 0.42, R.w - 0.42]) {
        const z = -R.d + 0.06;
        const bracket = new T.Mesh(new T.BoxGeometry(0.08, 0.08, 0.22), iron); bracket.position.set(x, 2.05, z + 0.11); S.add(bracket);
        const stick = new T.Mesh(new T.CylinderGeometry(0.035, 0.025, 0.42, 8), new T.MeshStandardMaterial({ map: beamTex, roughness: 0.9 })); stick.position.set(x, 2.2, z + 0.22); stick.rotation.x = 0.25; S.add(stick);
        const flame = new T.Sprite(new T.SpriteMaterial({ map: this.flame, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); flame.scale.set(0.2, 0.36, 1); flame.position.set(x, 2.52, z + 0.27); S.add(flame);
        const halo = new T.Sprite(new T.SpriteMaterial({ map: this.glow.fire, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false })); halo.scale.set(1.3, 1.3, 1); halo.position.copy(flame.position); S.add(halo);
        const light = new T.PointLight('#ff9440', 1.2, 7.5, 1.6); light.position.set(x * 0.95, 2.5, z + 0.45); S.add(light);
        this.torches.push({ flame, halo, light, base: 1.2 });
      }
      // chains with shackles on the back wall
      const chainMat = new T.MeshStandardMaterial({ color: '#4a4a4e', roughness: 0.45, metalness: 0.8 });
      for (const x of [0.55, 1.75]) {
        for (let i = 0; i < 9; i++) { const link = new T.Mesh(new T.TorusGeometry(0.045, 0.012, 6, 10), chainMat); link.position.set(x, 3.2 - i * 0.075, -R.d + 0.05); link.rotation.y = i % 2 ? Math.PI / 2 : 0; S.add(link); }
        const cuff = new T.Mesh(new T.TorusGeometry(0.075, 0.02, 6, 14), chainMat); cuff.position.set(x, 2.48, -R.d + 0.08); cuff.rotation.x = 1.2; S.add(cuff);
      }
      // the sign, as an old painted board
      const sc = canvas(512, 128), sx = sc.getContext('2d');
      sx.fillStyle = '#3a2618'; sx.fillRect(0, 0, 512, 128);
      for (let i = 0; i < 30; i++) { sx.strokeStyle = `rgba(0,0,0,${rnd(0.1, 0.3)})`; sx.beginPath(); const y = rnd(0, 128); sx.moveTo(0, y); sx.lineTo(512, y + rnd(-4, 4)); sx.stroke(); }
      sx.strokeStyle = '#1a0f08'; sx.lineWidth = 10; sx.strokeRect(5, 5, 502, 118);
      sx.fillStyle = '#e8c88a'; sx.font = 'bold 62px Georgia, serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.fillText('THE DUNGEON', 256, 68);
      const sign = new T.Mesh(new T.BoxGeometry(1.5, 0.38, 0.05), [0, 0, 0, 0, new T.MeshStandardMaterial({ map: tex(sc, null, true), roughness: 0.8 }), 0].map((m) => m || new T.MeshStandardMaterial({ color: '#2a1a10' })));
      sign.position.set(0.95, 3.45, -R.d + 0.04); sign.rotation.z = -0.03; S.add(sign);
      // straw in the front corner, a barrel and a bucket (outside the play area)
      const strawMat = this.mat('#b8954a');
      const straw = new T.Group();
      for (let i = 0; i < 70; i++) {
        const s = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, rnd(0.3, 0.6), 4), strawMat);
        s.position.set(rnd(-0.6, 0.6), rnd(0.02, 0.18), rnd(-0.45, 0.45)); s.rotation.set(rnd(0, 3), rnd(0, 3), Math.PI / 2 + rnd(-0.6, 0.6)); straw.add(s);
      }
      const mound = new T.Mesh(new T.SphereGeometry(0.62, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.mat('#8f7135')); mound.scale.set(1, 0.32, 0.8); straw.add(mound);
      straw.position.set(-R.w + 0.65, 0, R.d + 0.75); straw.scale.setScalar(0.85); S.add(straw);
      const barrel = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.85, 16), new T.MeshStandardMaterial({ map: woodTex(256, 256, '#5a3a22'), roughness: 0.85 }));
      barrel.scale.set(1, 1, 1); barrel.position.set(R.w - 0.55, 0.425, R.d + 0.8); barrel.castShadow = true; S.add(barrel);
      for (const y of [0.15, 0.7]) { const hoop = new T.Mesh(new T.TorusGeometry(0.345, 0.018, 6, 24), iron); hoop.rotation.x = Math.PI / 2; hoop.position.set(R.w - 0.55, y, R.d + 0.8); S.add(hoop); }
      const bucket = new T.Mesh(new T.CylinderGeometry(0.17, 0.13, 0.3, 14, 1, true), new T.MeshStandardMaterial({ map: woodTex(128, 128, '#6a4a2c'), roughness: 0.85, side: T.DoubleSide }));
      bucket.position.set(R.w - 1.2, 0.15, R.d + 0.55); bucket.rotation.z = 0.08; S.add(bucket);
      // dust in the air, drifting through the light
      const N = 260, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { pos[i * 3] = rnd(-R.w, R.w); pos[i * 3 + 1] = rnd(0.2, R.h - 0.3); pos[i * 3 + 2] = rnd(-R.d, R.d + 2); }
      const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(pos, 3));
      this.motes = new T.Points(dg, new T.PointsMaterial({ map: this.glow.white, color: '#ffe2b0', size: 0.035, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
      S.add(this.motes);
    }

    // ── the rag doll ──
    buildBuddy() {
      const b = this.buddy, S = this.scene;
      const felt = feltTex(false), front = feltTex(true);
      felt.repeat.set(2, 2);
      // (toon colours kept as painted: the film-like tone mapping that suits the stone would wash the felt out)
      const body = this.mat(b.opts.color, { map: front, emissive: '#ffffff', emissiveIntensity: 0, toneMapped: false });
      const limb = this.mat(b.opts.color, { map: felt, emissive: '#ffffff', emissiveIntensity: 0, toneMapped: false });
      this.flashMats = [body, limb];
      this.bodyMat = body;
      const seg = new T.CylinderGeometry(1, 1, 1, 16, 1, true);
      const ball = new T.SphereGeometry(1, 24, 16);
      const mk = (geo, mat, ol) => { const m = new T.Mesh(geo, mat); m.castShadow = true; S.add(m); if (ol) this.outline(m, ol); return m; };
      // chunkier than the physics points: a stuffed toy, not a stick figure
      const FAT = 1.3, OL = 1.22;
      this.segs = [
        ['shL', 'elL', 0.075], ['elL', 'handL', 0.068], ['shR', 'elR', 0.075], ['elR', 'handR', 0.068],
        ['hipL', 'kneeL', 0.09], ['kneeL', 'footL', 0.082], ['hipR', 'kneeR', 0.09], ['kneeR', 'footR', 0.082],
        ['neck', 'chest', 0.07],
      ].map(([a, c, r]) => ({ a, b: c, r: r * FAT, mesh: mk(seg, limb, [OL, 1, OL]) }));
      this.joints = ['shL', 'shR', 'elL', 'elR', 'hipL', 'hipR', 'kneeL', 'kneeR'].map((k) => ({ k, r: FAT * (k.startsWith('el') ? 0.072 : k.startsWith('knee') ? 0.085 : k.startsWith('sh') ? 0.085 : 0.095), mesh: mk(ball, limb, [OL, OL, OL]) }));
      // seams where the arms and legs are sewn on: a ring of thread
      const threadMat = this.mat('#f2dfb8', { toneMapped: false });
      this.seamRings = ['shL', 'shR', 'hipL', 'hipR'].map((k) => { const m = new T.Mesh(new T.TorusGeometry(1, 0.09, 6, 18), threadMat); S.add(m); return { k, m }; });
      this.hands = ['handL', 'handR'].map((k) => ({ k, mesh: mk(ball, limb, [1.18, 1.18, 1.18]) }));
      this.feet = ['footL', 'footR'].map((k) => ({ k, mesh: mk(ball, this.mat('#3d2219', { toneMapped: false }), [1.16, 1.18, 1.12]) }));
      this.torso = mk(ball, body, [1.09, 1.07, 1.1]);
      // patches and buttons ride on the torso
      this.patchMeshes = b.patches.map((pt) => {
        const pc = canvas(128, 128), c = pc.getContext('2d');
        c.fillStyle = pt.color; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill();
        c.strokeStyle = '#2a1810'; c.lineWidth = 4; c.setLineDash([8, 7]); c.beginPath(); c.arc(64, 64, 50, 0, 7); c.stroke();
        const m = new T.Mesh(new T.CircleGeometry(pt.size * 1.15, 18), this.mat('#ffffff', { map: tex(pc, null, true), transparent: true, side: T.DoubleSide })); S.add(m); return { pt, m };
      });
      const btnGeo = new T.CylinderGeometry(0.04, 0.04, 0.022, 16);
      const bc = canvas(64, 64), bx = bc.getContext('2d');
      bx.fillStyle = '#f4e4b8'; bx.fillRect(0, 0, 64, 64); bx.fillStyle = '#5a4030'; for (const [x, y] of [[24, 24], [40, 24], [24, 40], [40, 40]]) { bx.beginPath(); bx.arc(x, y, 5, 0, 7); bx.fill(); }
      const btnMat = [this.mat('#e9d6a4'), this.mat('#ffffff', { map: tex(bc, null, true) }), this.mat('#ffffff', { map: tex(bc, null, true) })];
      this.btnMeshes = b.buttons.map((bt) => { const m = new T.Mesh(btnGeo, btnMat); m.castShadow = true; S.add(m); this.outline(m, [1.25, 1.3, 1.25]); return { bt, m }; });
      // head and face
      this.head = mk(ball, body, [1.07, 1.07, 1.07]);
      this.headMat = body;
      this.faceCanvas = canvas(256, 256);
      this.faceTex = new T.CanvasTexture(this.faceCanvas); this.faceTex.encoding = T.sRGBEncoding;
      this.face = new T.Mesh(new T.CircleGeometry(0.23, 28), new T.MeshBasicMaterial({ map: this.faceTex, transparent: true }));
      S.add(this.face);
      // yarn hair: a cap and a mop of loops
      const yarn = this.mat('#f0a83a', { toneMapped: false });
      this.hair = new T.Group();
      const cap = new T.Mesh(new T.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.3), yarn); cap.castShadow = true; this.hair.add(cap);
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2, loop = new T.Mesh(new T.TorusGeometry(0.22, 0.09, 6, 12), yarn);
        loop.position.set(Math.cos(a) * 0.62, 0.62 + (i % 2) * 0.12, Math.sin(a) * 0.62 - 0.05); loop.rotation.set(rnd(0, 3), a, rnd(0, 1)); loop.castShadow = true; this.hair.add(loop);
      }
      for (let i = 0; i < 5; i++) { const top = new T.Mesh(new T.TorusGeometry(0.2, 0.085, 6, 12), yarn); top.position.set(rnd(-0.35, 0.35), 0.92, rnd(-0.35, 0.2)); top.rotation.set(rnd(0, 3), rnd(0, 3), 0); this.hair.add(top); }
      this.outline(cap, [1.04, 1.04, 1.04]);
      S.add(this.hair);
      // stuffing tufts where a limb has come away
      this.tufts = {};
      for (const lb of ['armL', 'armR', 'legL', 'legR', 'head']) {
        const g = new T.Group();
        for (let i = 0; i < 5; i++) { const s = new T.Mesh(new T.SphereGeometry(rnd(0.04, 0.07), 10, 8), this.mat('#f7f4ec')); s.position.set(rnd(-0.05, 0.05), rnd(-0.03, 0.06), rnd(-0.05, 0.05)); g.add(s); }
        g.visible = false; S.add(g); this.tufts[lb] = g;
      }
      // a soft contact shadow under the doll (keeps it grounded even out of the lantern's light)
      this.blob = new T.Mesh(new T.CircleGeometry(0.45, 24), new T.MeshBasicMaterial({ map: glowTex('rgba(0,0,0,0.7)', 'rgba(0,0,0,0.35)'), transparent: true, depthWrite: false }));
      this.blob.rotation.x = -Math.PI / 2; S.add(this.blob);
      this.drawFace('smug');
    }
    drawFace(kind) {
      if (this.faceKind === kind) return;
      this.faceKind = kind;
      const c = this.faceCanvas.getContext('2d'), w = 256;
      c.clearRect(0, 0, w, w);
      const ink = '#1a100b';
      c.lineCap = 'round'; c.lineJoin = 'round';
      // big sewn-on button eyes with a shine
      const button = (x, y, r) => {
        c.fillStyle = '#000'; c.beginPath(); c.arc(x + 2, y + 3, r, 0, 7); c.fill();
        c.fillStyle = ink; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = '#3a2a22'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r * 0.78, 0, 7); c.stroke();
        c.fillStyle = '#7a6458'; for (const [dx, dy] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, r * 0.12, 0, 7); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(x - r * 0.45, y - r * 0.5, r * 0.22, r * 0.14, -0.6, 0, 7); c.fill();
      };
      const spiral = (x, y) => { c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); for (let a = 0; a < 14; a += 0.3) { const rr = a * 1.7; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.stroke(); };
      const cross = (x, y, s) => { c.strokeStyle = ink; c.lineWidth = 10; c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y + s); c.moveTo(x + s, y - s); c.lineTo(x - s, y + s); c.stroke(); };
      const brow = (x, y, tilt) => { c.strokeStyle = ink; c.lineWidth = 9; c.beginPath(); c.moveTo(x - 28, y + tilt); c.lineTo(x + 28, y - tilt); c.stroke(); };
      const stitchMouth = (pts) => { c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.lineWidth = 4.5; for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; c.beginPath(); c.moveTo(mx, my - 10); c.lineTo(mx, my + 10); c.stroke(); } };
      // cheeks
      c.fillStyle = 'rgba(255,120,120,0.4)'; c.beginPath(); c.arc(58, 156, 24, 0, 7); c.arc(198, 156, 24, 0, 7); c.fill();
      switch (kind) {
        case 'dazed': spiral(86, 106); spiral(170, 106); stitchMouth([[88, 184], [108, 172], [128, 188], [148, 172], [168, 184]]); break;
        case 'ouch': cross(86, 106, 20); cross(170, 106, 20); c.fillStyle = ink; c.beginPath(); c.ellipse(128, 184, 24, 28, 0, 0, 7); c.fill(); c.fillStyle = '#c8384a'; c.beginPath(); c.ellipse(128, 196, 14, 10, 0, 0, 7); c.fill(); break;
        case 'outraged': button(86, 112, 22); button(170, 112, 22); brow(86, 78, -11); brow(170, 78, 11); stitchMouth([[84, 194], [106, 180], [128, 178], [150, 180], [172, 194]]); break;
        case 'worried': button(86, 110, 24); button(170, 110, 24); brow(86, 76, 10); brow(170, 76, -10); stitchMouth([[92, 188], [110, 180], [128, 186], [146, 180], [164, 188]]); break;
        case 'nervous': button(86, 108, 26); button(170, 108, 26); stitchMouth([[92, 184], [110, 178], [128, 184], [146, 178], [164, 184]]); c.fillStyle = '#7fc4ff'; c.beginPath(); c.ellipse(218, 66, 10, 17, 0, 0, 7); c.fill(); break;
        case 'sulk': button(86, 112, 22); button(170, 112, 22); c.strokeStyle = ink; c.lineWidth = 9; c.beginPath(); c.moveTo(58, 94); c.lineTo(110, 104); c.moveTo(198, 94); c.lineTo(146, 104); c.stroke(); stitchMouth([[94, 190], [128, 180], [162, 190]]); break;
        default: button(86, 106, 24); button(170, 106, 24); brow(170, 72, -5); stitchMouth([[78, 166], [100, 182], [128, 190], [156, 182], [180, 162]]);
      }
      this.faceTex.needsUpdate = true;
    }
    buildStars() {
      const g = new T.Group();
      const shape = new T.Shape();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 0.04 : 0.09; i ? shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      const geo = new T.ShapeGeometry(shape);
      for (let i = 0; i < 4; i++) { const s = new T.Mesh(geo, new T.MeshBasicMaterial({ color: '#ffd84a', side: T.DoubleSide })); g.add(s); }
      g.visible = false; this.scene.add(g);
      return g;
    }

    // ── juice ──
    shake(amount) { this.shakeA = Math.min(0.22, Math.max(this.shakeA, amount)); this.shakeT = 0.35; }
    flash(k) { this.flashK = Math.max(this.flashK || 0, k); }
    // the cannon that fired: pokes out of the wall, kicks back, smokes, and is gone
    cannon(from, dir) {
      const g = new T.Group(), iron = new T.MeshStandardMaterial({ color: '#202024', roughness: 0.4, metalness: 0.8 });
      const barrel = new T.Mesh(new T.CylinderGeometry(0.13, 0.17, 0.9, 16), iron); barrel.rotation.x = Math.PI / 2; barrel.position.z = -0.25; g.add(barrel);
      const lip = new T.Mesh(new T.TorusGeometry(0.135, 0.03, 8, 18), iron); lip.position.z = 0.2; g.add(lip);
      const bore = new T.Mesh(new T.CircleGeometry(0.1, 14), new T.MeshBasicMaterial({ color: '#000' })); bore.position.z = 0.205; g.add(bore);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.position.set(from.x, from.y, from.z);
      g.lookAt(from.x + dir.x, from.y + dir.y, from.z + dir.z);
      this.scene.add(g);
      const flash = new T.Sprite(new T.SpriteMaterial({ map: this.glow.fire, color: '#ffe0a0', transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      flash.position.set(from.x + dir.x * 0.3, from.y + dir.y * 0.3, from.z + dir.z * 0.3); flash.scale.set(1.6, 1.6, 1); this.scene.add(flash);
      const light = new T.PointLight('#ffb060', 3, 6, 1.5); light.position.copy(flash.position); this.scene.add(light);
      this.cannons.push({ g, flash, light, t: 0, from, dir });
      for (let i = 0; i < 9; i++) this.sprite('smoke', flash.position, { x: dir.x * rnd(0.6, 1.8) + rnd(-0.3, 0.3), y: rnd(0.2, 0.8), z: dir.z * rnd(0.6, 1.8) + rnd(-0.3, 0.3) }, rnd(0.35, 0.6), rnd(1.0, 1.7), -0.4);
      this.shake(0.08);
    }
    // a soft billboard puff: smoke, dust
    sprite(kind, pos, vel, size, life, grav) {
      const m = new T.Sprite(new T.SpriteMaterial({ map: this.glow[kind], transparent: true, depthWrite: false, opacity: 0.9 }));
      m.position.set(pos.x, pos.y, pos.z); m.scale.set(size, size, 1); this.scene.add(m);
      this.fx.push({ kind: 'sprite', m, t: 0, life, s: size, grav: grav || 0, vel: Object.assign({}, vel), grow: 1.8 });
    }

    // ── per frame ──
    resize(w, h) { this.r.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    placeCamera(dt) {
      const c = this.cam;
      this.camera.position.set(c.target.x + Math.sin(c.az) * Math.cos(c.el) * c.dist, c.target.y + Math.sin(c.el) * c.dist, c.target.z + Math.cos(c.az) * Math.cos(c.el) * c.dist);
      this.camera.lookAt(c.target);
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        const a = this.shakeA * Math.max(0, this.shakeT / 0.35);
        this.camera.position.x += rnd(-a, a); this.camera.position.y += rnd(-a, a); this.camera.position.z += rnd(-a, a) * 0.5;
        this.camera.rotation.z += rnd(-a, a) * 0.15;
        if (this.shakeT <= 0) this.shakeA = 0;
      }
    }
    orient(mesh, a, b, rx, rz, extraLen) {
      const dir = new T.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
      const len = dir.length() || 1e-4;
      mesh.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
      mesh.scale.set(rx, len + (extraLen || 0), rz);
    }
    basis(f) { const m = new T.Matrix4(); m.makeBasis(new T.Vector3(f.right.x, f.right.y, f.right.z), new T.Vector3(f.up.x, f.up.y, f.up.z), new T.Vector3(f.fwd.x, f.fwd.y, f.fwd.z)); return new T.Quaternion().setFromRotationMatrix(m); }
    draw(dt, time) {
      const b = this.buddy, P = b.p, sq = (k) => b.squash[k] || 0;
      // limbs
      for (const s of this.segs) {
        const k = 1 + Math.max(sq(s.a), sq(s.b)) * 0.6;
        this.orient(s.mesh, P[s.a].pos, P[s.b].pos, s.r * k, s.r * k, 0.02);
      }
      for (const j of this.joints) { const k = 1 + sq(j.k) * 0.5; j.mesh.position.copy(P[j.k].pos); j.mesh.scale.setScalar(j.r * k); }
      for (const h of this.hands) { h.mesh.position.copy(P[h.k].pos); h.mesh.scale.set(0.12, 0.13, 0.1); }
      const tf = b.frame('chest', 'pelvis'), tq = this.basis(tf);
      for (const f of this.feet) { f.mesh.position.copy(P[f.k].pos); f.mesh.quaternion.copy(tq); f.mesh.scale.set(0.11, 0.085, 0.17); }
      // seams at the shoulders and hips, facing along the limb
      const LIMB = { shL: ['armL', 'elL'], shR: ['armR', 'elR'], hipL: ['legL', 'kneeL'], hipR: ['legR', 'kneeR'] };
      for (const s of this.seamRings) {
        const [lb, next] = LIMB[s.k];
        s.m.visible = !b.detached[lb];
        if (!s.m.visible) continue;
        const a = P[s.k].pos, n = P[next].pos;
        s.m.position.set(a.x + (n.x - a.x) * 0.18, a.y + (n.y - a.y) * 0.18, a.z + (n.z - a.z) * 0.18);
        const d = new T.Vector3(n.x - a.x, n.y - a.y, n.z - a.z).normalize();
        s.m.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), d);
        s.m.scale.setScalar((s.k.startsWith('sh') ? 0.075 : 0.09) * 1.3 * 1.12);
      }
      // torso: an egg between chest and pelvis, squashed when hit
      const c = P.chest.pos, p = P.pelvis.pos;
      const tl = Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z);
      const ts = Math.max(sq('chest'), sq('pelvis'));
      this.torso.position.set((c.x + p.x) / 2, (c.y + p.y) / 2, (c.z + p.z) / 2);
      this.torso.quaternion.copy(tq);
      this.torso.scale.set(0.3 * (1 + ts * 0.45), (tl / 2 + 0.15) * (1 - ts * 0.35), 0.24 * (1 + ts * 0.3));
      for (const { pt, m } of this.patchMeshes) { const at = b.torsoAt({ x: pt.off.x * 1.1, y: pt.off.y, z: pt.off.z + 0.035 }); m.position.set(at.x, at.y, at.z); m.quaternion.copy(tq); m.translateZ(0.012 + ts * 0.05); }
      for (const { bt, m } of this.btnMeshes) {
        if (bt.popped) { m.position.set(bt.pos.x, bt.pos.y, bt.pos.z); m.rotation.x += dt * 9; m.rotation.z += dt * 6; continue; }
        const at = b.torsoAt({ x: bt.off.x, y: bt.off.y, z: bt.off.z + 0.04 }); m.position.set(at.x, at.y, at.z); m.quaternion.copy(tq); m.rotateX(Math.PI / 2); m.translateY(0.012 + ts * 0.05);
      }
      // head, face and hair
      const hf = b.detached.head ? tf : b.frame('head', 'neck');
      const hq = this.basis(hf), hs = sq('head');
      this.head.position.copy(P.head.pos); this.head.quaternion.copy(hq);
      this.head.scale.set(0.27 * (1 + hs * 0.35), 0.26 * (1 - hs * 0.4), 0.25 * (1 + hs * 0.2));
      this.face.position.copy(P.head.pos); this.face.quaternion.copy(hq); this.face.translateZ(0.252 * (1 + hs * 0.2)); this.face.scale.set(1 + hs * 0.3, 1 - hs * 0.35, 1);
      this.hair.position.copy(P.head.pos); this.hair.quaternion.copy(hq); this.hair.translateY(0.02 - hs * 0.06); this.hair.scale.set(0.285 * (1 + hs * 0.35), 0.28 * (1 - hs * 0.4), 0.27);
      this.drawFace(b.face);
      // the hit flash: the felt glows white for a moment
      this.flashK = Math.max(0, (this.flashK || 0) - dt * 6);
      for (const m of this.flashMats) m.emissiveIntensity = this.flashK * 0.55;
      // contact shadow
      const lowY = Math.min(P.pelvis.pos.y, P.chest.pos.y);
      this.blob.position.set((c.x + p.x) / 2, 0.012, (c.z + p.z) / 2);
      const bs = Math.max(0.35, 1.25 - lowY * 0.35); this.blob.scale.set(bs, bs, 1); this.blob.material.opacity = Math.max(0.15, 0.85 - lowY * 0.3);
      // stuffing where limbs came off
      const SOCK = { armL: 'shL', armR: 'shR', legL: 'hipL', legR: 'hipR', head: 'neck' };
      for (const lb in this.tufts) { const m = this.tufts[lb]; m.visible = b.detached[lb]; if (m.visible) { m.position.copy(P[SOCK[lb]].pos); m.rotation.y += dt * 2; m.scale.setScalar(1 + Math.sin(time * 6) * 0.1); } }
      // dizzy stars
      this.stars.visible = b.dizzy > 45;
      if (this.stars.visible) {
        this.stars.position.set(P.head.pos.x, P.head.pos.y + 0.4, P.head.pos.z);
        this.stars.children.forEach((s, i) => { const a = time * 3 + (i / 4) * Math.PI * 2; s.position.set(Math.cos(a) * 0.32, Math.sin(time * 5 + i) * 0.03, Math.sin(a) * 0.32); s.lookAt(this.camera.position); });
      }
      // props, and the marker on the floor under anything falling
      const seen = new Set();
      for (const pr of this.world.props) {
        seen.add(pr);
        let m = this.props.get(pr);
        if (!m) { m = this.propMesh(pr.kind, pr.p.r); this.scene.add(m); this.props.set(pr, m); }
        m.position.copy(pr.p.pos);
        if (pr.kind === 'cannonball') { m.rotation.z -= dt * 8; }
        if (pr.life < 0.6) m.scale.setScalar(Math.max(0.01, pr.life / 0.6));
        if (pr.kind === 'anvil' || pr.kind === 'piano') {
          let mk = this.markers.get(pr);
          if (!mk) {
            mk = new T.Mesh(new T.RingGeometry(0.7, 1, 32), new T.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide }));
            const fill = new T.Mesh(new T.CircleGeometry(0.7, 32), new T.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.45, depthWrite: false })); fill.position.z = -0.001; mk.add(fill);
            mk.rotation.x = -Math.PI / 2; this.scene.add(mk); this.markers.set(pr, mk);
          }
          const hgt = pr.p.pos.y - pr.p.r, falling = hgt > 0.15;
          mk.visible = falling;
          if (falling) { const k = pr.p.r * (1.6 - Math.min(1, hgt / 3.5) * 0.7); mk.scale.set(k, k, 1); mk.position.set(pr.p.pos.x, 0.015, pr.p.pos.z); mk.material.opacity = 0.5 + Math.sin(time * 18) * 0.3; }
        }
      }
      for (const [pr, m] of this.props) if (!seen.has(pr)) { this.scene.remove(m); this.props.delete(pr); }
      for (const [pr, m] of this.markers) if (!seen.has(pr)) { this.scene.remove(m); this.markers.delete(pr); }
      // cannons kick back and go
      for (const cn of this.cannons) {
        cn.t += dt;
        const kick = Math.min(1, cn.t / 0.06) * Math.max(0, 1 - (cn.t - 0.06) / 0.5);
        cn.g.position.set(cn.from.x - cn.dir.x * kick * 0.35, cn.from.y - cn.dir.y * kick * 0.35, cn.from.z - cn.dir.z * kick * 0.35);
        cn.flash.material.opacity = Math.max(0, 1 - cn.t / 0.12); cn.flash.scale.setScalar(1.6 + cn.t * 4);
        cn.light.intensity = Math.max(0, 3 * (1 - cn.t / 0.15));
        if (cn.t > 1.2) cn.g.scale.setScalar(Math.max(0.01, 1 - (cn.t - 1.2) / 0.3));
      }
      this.cannons = this.cannons.filter((cn) => { if (cn.t < 1.5) return true; this.scene.remove(cn.g, cn.flash, cn.light); return false; });
      // effects
      for (const f of this.fx) {
        f.t += dt;
        f.vel.y -= (f.grav || 0) * dt;
        f.m.position.x += f.vel.x * dt; f.m.position.y += f.vel.y * dt; f.m.position.z += f.vel.z * dt;
        if (f.kind !== 'sprite' && f.m.position.y < 0.03) { f.m.position.y = 0.03; f.vel.y = Math.abs(f.vel.y) * 0.3; f.vel.x *= 0.6; f.vel.z *= 0.6; }
        const k = f.t / f.life;
        if (f.kind === 'puff') { f.m.scale.setScalar(f.s * (0.7 + k * 0.6)); f.m.rotation.x += dt * 3; }
        if (f.kind === 'ring') f.m.scale.setScalar(f.s * (0.3 + k * 1.8));
        if (f.kind === 'sprite') { f.vel.x *= 0.96; f.vel.z *= 0.96; const s = f.s * (1 + k * f.grow); f.m.scale.set(s, s, 1); }
        f.m.material.opacity = Math.max(0, (f.kind === 'sprite' ? 0.8 : 1) * (1 - k * k));
      }
      this.fx = this.fx.filter((f) => { if (f.t < f.life) return true; this.scene.remove(f.m); return false; });
      // torches and the lantern flicker
      for (const t of this.torches) {
        const fl = 1 + Math.sin(time * 13 + t.light.position.x) * 0.08 + Math.sin(time * 31 + t.light.position.x * 3) * 0.05 + (Math.random() - 0.5) * 0.1;
        t.light.intensity = t.base * fl; t.flame.scale.set(0.2 * (0.9 + Math.random() * 0.15), 0.36 * (0.9 + Math.random() * 0.2), 1);
        t.halo.material.opacity = 0.45 * fl;
      }
      this.lantern.intensity = 1.6 * (1 + Math.sin(time * 7) * 0.02 + (Math.random() - 0.5) * 0.03);
      // dust drifts
      const mp = this.motes.geometry.attributes.position, R = this.world.room;
      for (let i = 0; i < mp.count; i++) {
        let y = mp.getY(i) + dt * 0.03 * Math.sin(time * 0.3 + i), x = mp.getX(i) + dt * 0.05 * Math.sin(time * 0.2 + i * 1.7);
        if (y > R.h - 0.2) y = 0.2;
        mp.setXY(i, x, y);
      }
      mp.needsUpdate = true;
      this.placeCamera(dt);
      this.r.render(this.scene, this.camera);
    }
    propMesh(kind, r) {
      const g = new T.Group();
      const metal = new T.MeshStandardMaterial({ color: '#3a3e44', roughness: 0.35, metalness: 0.85 });
      const wood = new T.MeshStandardMaterial({ color: '#3a2216', roughness: 0.7 });
      const lacquer = new T.MeshStandardMaterial({ color: '#0e0d10', roughness: 0.15, metalness: 0.2 });
      if (kind === 'anvil') {
        const top = new T.Mesh(new T.BoxGeometry(0.62, 0.14, 0.26), metal); top.position.y = 0.12;
        const horn = new T.Mesh(new T.ConeGeometry(0.12, 0.3, 12), metal); horn.rotation.z = Math.PI / 2; horn.position.set(-0.44, 0.12, 0);
        const waist = new T.Mesh(new T.BoxGeometry(0.22, 0.16, 0.18), metal); waist.position.y = -0.02;
        const base = new T.Mesh(new T.BoxGeometry(0.46, 0.12, 0.3), metal); base.position.y = -0.16;
        g.add(top, horn, waist, base);
        const lc = canvas(128, 32), lx = lc.getContext('2d'); lx.fillStyle = '#3a3e44'; lx.fillRect(0, 0, 128, 32); lx.fillStyle = '#f0e8d0'; lx.font = 'bold 24px Arial'; lx.textAlign = 'center'; lx.fillText('100 KG', 64, 25);
        const label = new T.Mesh(new T.PlaneGeometry(0.3, 0.08), new T.MeshBasicMaterial({ map: tex(lc, null, true) }));
        label.position.set(0, 0.12, 0.131); g.add(label);
      } else if (kind === 'piano') {
        const body = new T.Mesh(new T.BoxGeometry(1.2, 0.8, 0.55), lacquer); g.add(body);
        const keys = new T.Mesh(new T.BoxGeometry(1.05, 0.06, 0.2), new T.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.3 })); keys.position.set(0, 0.0, 0.36); g.add(keys);
        for (let i = 0; i < 14; i++) { if ([2, 6, 9, 13].includes(i)) continue; const bk = new T.Mesh(new T.BoxGeometry(0.035, 0.05, 0.12), lacquer); bk.position.set(-0.5 + i * 0.075, 0.04, 0.33); g.add(bk); }
        for (const x of [-0.5, 0.5]) { const leg = new T.Mesh(new T.CylinderGeometry(0.045, 0.035, 0.3, 10), lacquer); leg.position.set(x, -0.5, 0.15); g.add(leg); }
        const lid = new T.Mesh(new T.BoxGeometry(1.2, 0.03, 0.55), lacquer); lid.position.set(0, 0.42, -0.05); lid.rotation.x = -0.5; g.add(lid);
      } else if (kind === 'cannonball') {
        g.add(new T.Mesh(new T.SphereGeometry(r, 20, 14), new T.MeshStandardMaterial({ color: '#16171a', roughness: 0.4, metalness: 0.7 })));
      } else if (kind === 'boot') {
        const leather = new T.MeshStandardMaterial({ color: '#4e2f1c', roughness: 0.55 });
        const shin = new T.Mesh(new T.CylinderGeometry(0.16, 0.18, 0.5, 14), leather); shin.position.y = 0.25;
        const foot = new T.Mesh(new T.BoxGeometry(0.34, 0.2, 0.55), leather); foot.position.set(0, 0, 0.12);
        const toe = new T.Mesh(new T.SphereGeometry(0.17, 14, 10), leather); toe.scale.set(1, 0.6, 1); toe.position.set(0, -0.01, 0.38);
        const sole = new T.Mesh(new T.BoxGeometry(0.36, 0.06, 0.62), new T.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.8 })); sole.position.set(0, -0.12, 0.14);
        g.add(shin, foot, toe, sole);
      }
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      return g;
    }
    // stuffing puffs, button pops, stitches, dust and shake
    effect(e) {
      if (e.type === 'puff') {
        for (let i = 0; i < e.n + 4; i++) {
          const m = new T.Mesh(new T.SphereGeometry(rnd(0.035, 0.07), 10, 8), this.mat('#f7f4ec', { transparent: true }));
          m.position.set(e.pos.x, e.pos.y, e.pos.z); this.scene.add(m);
          const d = e.dir || { x: 0, y: 1, z: 0 };
          this.fx.push({ kind: 'puff', m, t: 0, life: rnd(0.7, 1.3), s: rnd(0.8, 1.5), grav: 2.2, vel: { x: d.x * rnd(0.5, 2) + rnd(-1.6, 1.6), y: rnd(1.2, 3.4), z: d.z * rnd(0.5, 2) + rnd(-1.6, 1.6) } });
        }
      }
      if (e.type === 'thud') {
        const s = e.strength;
        if (s > 0.35) this.shake(0.02 + s * 0.12);
        if (s > 0.25) this.flash(Math.min(1, s * 1.4));
        if (s > 0.45) {
          const m = new T.Mesh(new T.RingGeometry(0.2, 0.27, 28), new T.MeshBasicMaterial({ color: '#fff3c4', transparent: true, side: T.DoubleSide, depthWrite: false }));
          m.position.set(e.pos.x, Math.max(0.03, e.pos.y), e.pos.z); m.lookAt(this.camera.position); this.scene.add(m);
          this.fx.push({ kind: 'ring', m, t: 0, life: 0.28, s: 0.35 + s * 0.5, vel: { x: 0, y: 0, z: 0 } });
        }
        // dust kicked up where something meets the floor
        if (e.pos.y < 0.35 && s > 0.25) for (let i = 0; i < 3 + Math.round(s * 7); i++) this.sprite('dust', { x: e.pos.x + rnd(-0.15, 0.15), y: 0.08, z: e.pos.z + rnd(-0.15, 0.15) }, { x: rnd(-1.2, 1.2), y: rnd(0.2, 0.7), z: rnd(-1.2, 1.2) }, rnd(0.2, 0.35) * (0.7 + s), rnd(0.6, 1.1), 0.3);
      }
      if (e.type === 'land') {
        // a heavy prop hits the floor
        this.shake(0.05 + e.strength * 0.15);
        for (let i = 0; i < 12; i++) this.sprite('dust', { x: e.pos.x + rnd(-0.3, 0.3), y: 0.1, z: e.pos.z + rnd(-0.3, 0.3) }, { x: rnd(-2, 2), y: rnd(0.2, 0.9), z: rnd(-2, 2) }, rnd(0.3, 0.55), rnd(0.8, 1.4), 0.2);
      }
      if (e.type === 'stitch' || e.type === 'rip') {
        for (let i = 0; i < 12; i++) {
          const m = new T.Mesh(new T.IcosahedronGeometry(0.03, 0), new T.MeshBasicMaterial({ color: e.type === 'rip' ? '#f6f2ea' : '#ffe27a', transparent: true }));
          m.position.set(e.pos.x, e.pos.y, e.pos.z); this.scene.add(m);
          this.fx.push({ kind: 'puff', m, t: 0, life: 0.7, s: 1, grav: e.type === 'rip' ? 6 : -1, vel: { x: rnd(-1.5, 1.5), y: rnd(0.5, 2.5), z: rnd(-1.5, 1.5) } });
        }
        if (e.type === 'rip') this.shake(0.08);
      }
    }
    // which particle did the pointer touch?
    pick(ndc) {
      const ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2(ndc.x, ndc.y), this.camera);
      const meshes = [this.torso, this.head, this.face, ...this.segs.map((s) => s.mesh), ...this.joints.map((j) => j.mesh), ...this.hands.map((h) => h.mesh), ...this.feet.map((f) => f.mesh)];
      const hit = ray.intersectObjects(meshes, false)[0];
      const floorHit = ray.intersectObject(this.floor, false)[0];
      return { ray: ray.ray, buddy: hit ? hit.point : null, floor: floorHit ? floorHit.point : null };
    }
    project(pos) {
      const v = new T.Vector3(pos.x, pos.y, pos.z).project(this.camera);
      return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, behind: v.z > 1 };
    }
  }
  RC.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
