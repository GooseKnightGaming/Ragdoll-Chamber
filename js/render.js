/*
  RAGDOLL CHAMBER — drawing
  Three.js (r128) scene: a dungeon room, the rag doll built from toon-shaded shapes that
  follow the physics particles, its face, buttons, patches, props and puffs of stuffing.
*/
(function (root) {
  'use strict';
  const RC = root.RC;
  const T = root.THREE;

  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  class Renderer {
    constructor(canvas, world, buddy) {
      this.world = world; this.buddy = buddy;
      this.r = new T.WebGLRenderer({ canvas, antialias: true });
      this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.r.shadowMap.enabled = true;
      this.r.shadowMap.type = T.PCFSoftShadowMap;
      this.r.outputEncoding = T.sRGBEncoding;
      this.scene = new T.Scene();
      this.scene.background = new T.Color('#1a1412');
      this.scene.fog = new T.Fog('#1a1412', 9, 18);
      this.camera = new T.PerspectiveCamera(48, 1, 0.1, 50);
      this.cam = { az: 0.35, el: 0.32, dist: 5.6, target: new T.Vector3(0, 0.9, 0) };
      const g = new Uint8Array([70, 150, 255]);
      this.toon = new T.DataTexture(g, 3, 1, T.LuminanceFormat);
      this.toon.minFilter = this.toon.magFilter = T.NearestFilter; this.toon.needsUpdate = true;
      this.mat = (color, opts) => new T.MeshToonMaterial(Object.assign({ color, gradientMap: this.toon }, opts || {}));
      this.buildRoom();
      this.buildBuddy();
      this.props = new Map();
      this.fx = [];
      this.stars = this.buildStars();
    }

    // ── the dungeon ──
    buildRoom() {
      const R = this.world.room, S = this.scene;
      const stone = canvasTex(512, 512, (c, w, h) => {
        c.fillStyle = '#5a5049'; c.fillRect(0, 0, w, h);
        const rows = 8, cols = 4;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols + 1; x++) {
          const ox = (y % 2) * (w / cols / 2);
          const bx = x * (w / cols) - ox, by = y * (h / rows);
          const shade = 70 + Math.floor(Math.random() * 30);
          c.fillStyle = `rgb(${shade + 12},${shade + 4},${shade - 2})`;
          c.fillRect(bx + 3, by + 3, w / cols - 6, h / rows - 6);
          c.fillStyle = 'rgba(0,0,0,0.12)';
          for (let i = 0; i < 6; i++) c.fillRect(bx + rnd(6, w / cols - 12), by + rnd(6, h / rows - 12), rnd(2, 8), rnd(2, 5));
        }
      }, [3, 2]);
      const flags = canvasTex(512, 512, (c, w, h) => {
        c.fillStyle = '#3d3632'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
          const shade = 82 + Math.floor(Math.random() * 26);
          c.fillStyle = `rgb(${shade},${shade - 6},${shade - 12})`;
          c.fillRect(x * 128 + 4, y * 128 + 4, 120, 120);
          c.fillStyle = 'rgba(0,0,0,0.1)';
          for (let i = 0; i < 5; i++) c.fillRect(x * 128 + rnd(10, 100), y * 128 + rnd(10, 100), rnd(4, 18), rnd(2, 4));
        }
      }, [3, 2]);
      const floor = new T.Mesh(new T.PlaneGeometry(R.w * 2, R.d * 2), this.mat('#ffffff', { map: flags }));
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; S.add(floor);
      this.floor = floor;
      const wallMat = this.mat('#ffffff', { map: stone });
      const back = new T.Mesh(new T.PlaneGeometry(R.w * 2, R.h), wallMat); back.position.set(0, R.h / 2, -R.d); back.receiveShadow = true; S.add(back);
      const left = new T.Mesh(new T.PlaneGeometry(R.d * 2, R.h), wallMat); left.rotation.y = Math.PI / 2; left.position.set(-R.w, R.h / 2, 0); left.receiveShadow = true; S.add(left);
      const right = new T.Mesh(new T.PlaneGeometry(R.d * 2, R.h), wallMat); right.rotation.y = -Math.PI / 2; right.position.set(R.w, R.h / 2, 0); right.receiveShadow = true; S.add(right);
      this.walls = { back, left, right };
      // light: a cool moon window and two warm torches
      S.add(new T.HemisphereLight('#c8b8a8', '#2a1f1a', 0.55));
      const key = new T.DirectionalLight('#fff1dc', 0.75);
      key.position.set(2.5, 6, 4); key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 15 });
      S.add(key);
      this.torches = [];
      for (const x of [-R.w + 0.05, R.w - 0.05]) {
        const holder = new T.Mesh(new T.BoxGeometry(0.12, 0.35, 0.12), this.mat('#3b2a1e'));
        holder.position.set(x, 2.1, -R.d + 0.3); S.add(holder);
        const flame = new T.Mesh(new T.ConeGeometry(0.09, 0.26, 8), new T.MeshBasicMaterial({ color: '#ffb347' }));
        flame.position.set(x, 2.38, -R.d + 0.3); S.add(flame);
        const light = new T.PointLight('#ff9a3c', 0.55, 9, 1); light.position.set(x * 0.92, 2.4, -R.d + 0.5); S.add(light);
        this.torches.push({ flame, light });
      }
      // chains on the back wall, for the look
      const chainMat = this.mat('#6f6a66');
      for (const x of [-1.1, 1.1]) for (let i = 0; i < 7; i++) {
        const link = new T.Mesh(new T.TorusGeometry(0.05, 0.015, 6, 10), chainMat);
        link.position.set(x, 3.3 - i * 0.085, -R.d + 0.04); link.rotation.y = i % 2 ? Math.PI / 2 : 0; S.add(link);
      }
      // a grim little sign
      const sign = new T.Mesh(new T.PlaneGeometry(1.4, 0.35), new T.MeshBasicMaterial({ map: canvasTex(512, 128, (c, w, h) => {
        c.fillStyle = '#2b1d14'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a5a3a'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
        c.fillStyle = '#e8d3a8'; c.font = 'bold 54px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('THE DUNGEON', w / 2, h / 2 + 4);
      }) }));
      sign.position.set(0, 3.0, -R.d + 0.02); S.add(sign);
    }

    // ── the rag doll ──
    buildBuddy() {
      const b = this.buddy, S = this.scene;
      const cloth = canvasTex(256, 256, (c, w, h) => {
        c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
        c.globalAlpha = 0.08; c.fillStyle = '#000';
        for (let i = 0; i < w; i += 4) c.fillRect(i, 0, 1, h);
        for (let i = 0; i < h; i += 4) c.fillRect(0, i, w, 1);
      }, [2, 2]);
      const body = this.mat(b.opts.color, { map: cloth });
      const limb = this.mat(b.opts.color, { map: cloth });
      const dark = this.mat('#2b1b16');
      this.bodyMat = body;
      const seg = new T.CylinderGeometry(1, 1, 1, 14, 1, true);
      const ball = new T.SphereGeometry(1, 20, 14);
      const mk = (geo, mat) => { const m = new T.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = false; S.add(m); return m; };
      this.segs = [
        ['shL', 'elL', 0.075], ['elL', 'handL', 0.068], ['shR', 'elR', 0.075], ['elR', 'handR', 0.068],
        ['hipL', 'kneeL', 0.09], ['kneeL', 'footL', 0.082], ['hipR', 'kneeR', 0.09], ['kneeR', 'footR', 0.082],
        ['neck', 'chest', 0.07],
      ].map(([a, c, r]) => ({ a, b: c, r, mesh: mk(seg, limb) }));
      this.joints = ['shL', 'shR', 'elL', 'elR', 'hipL', 'hipR', 'kneeL', 'kneeR'].map((k) => ({ k, r: k.startsWith('el') ? 0.072 : k.startsWith('knee') ? 0.085 : k.startsWith('sh') ? 0.085 : 0.095, mesh: mk(ball, limb) }));
      this.hands = ['handL', 'handR'].map((k) => ({ k, mesh: mk(ball, limb) }));
      this.feet = ['footL', 'footR'].map((k) => ({ k, mesh: mk(ball, this.mat('#4a2d22')) }));
      this.torso = mk(ball, body);
      // patches and buttons ride on the torso
      this.patchMeshes = b.patches.map((pt) => { const m = new T.Mesh(new T.CircleGeometry(pt.size, 12), this.mat(pt.color, { side: T.DoubleSide })); S.add(m); return { pt, m }; });
      const btnGeo = new T.CylinderGeometry(0.035, 0.035, 0.018, 14);
      this.btnMeshes = b.buttons.map((bt) => { const m = new T.Mesh(btnGeo, this.mat('#f3e2b4')); m.castShadow = true; S.add(m); return { bt, m }; });
      // head and face
      this.head = mk(ball, body);
      this.faceCanvas = document.createElement('canvas'); this.faceCanvas.width = this.faceCanvas.height = 256;
      this.faceTex = new T.CanvasTexture(this.faceCanvas);
      this.face = new T.Mesh(new T.CircleGeometry(0.215, 24), new T.MeshBasicMaterial({ map: this.faceTex, transparent: true }));
      S.add(this.face);
      this.hair = mk(new T.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), this.mat('#e8c15a'));
      // stuffing tufts where a limb has come away
      this.tufts = {};
      for (const limb of ['armL', 'armR', 'legL', 'legR', 'head']) { const m = mk(new T.IcosahedronGeometry(0.07, 0), this.mat('#f4f1ea')); m.visible = false; this.tufts[limb] = m; }
      this.dark = dark;
      this.drawFace('smug');
    }
    drawFace(kind) {
      if (this.faceKind === kind) return;
      this.faceKind = kind;
      const c = this.faceCanvas.getContext('2d'), w = 256;
      c.clearRect(0, 0, w, w);
      const ink = '#1f140f';
      c.lineCap = 'round'; c.lineJoin = 'round';
      const button = (x, y, r) => { c.fillStyle = ink; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = '#6b5446'; for (const [dx, dy] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, r * 0.13, 0, 7); c.fill(); } };
      const spiral = (x, y) => { c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); for (let a = 0; a < 14; a += 0.3) { const rr = a * 1.6; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.stroke(); };
      const cross = (x, y, s) => { c.strokeStyle = ink; c.lineWidth = 9; c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y + s); c.moveTo(x + s, y - s); c.lineTo(x - s, y + s); c.stroke(); };
      const brow = (x, y, tilt) => { c.strokeStyle = ink; c.lineWidth = 8; c.beginPath(); c.moveTo(x - 26, y + tilt); c.lineTo(x + 26, y - tilt); c.stroke(); };
      const stitchMouth = (pts) => { c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.lineWidth = 4; for (let i = 0; i < pts.length - 1; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; c.beginPath(); c.moveTo(mx, my - 9); c.lineTo(mx, my + 9); c.stroke(); } };
      // cheeks
      c.fillStyle = 'rgba(255,140,140,0.35)'; c.beginPath(); c.arc(62, 150, 22, 0, 7); c.arc(194, 150, 22, 0, 7); c.fill();
      switch (kind) {
        case 'dazed': spiral(88, 108); spiral(168, 108); stitchMouth([[90, 182], [110, 172], [128, 186], [146, 172], [166, 182]]); break;
        case 'ouch': cross(88, 108, 18); cross(168, 108, 18); c.fillStyle = ink; c.beginPath(); c.ellipse(128, 182, 22, 26, 0, 0, 7); c.fill(); break;
        case 'outraged': button(88, 112, 20); button(168, 112, 20); brow(88, 80, -10); brow(168, 80, 10); stitchMouth([[86, 192], [108, 180], [128, 178], [148, 180], [170, 192]]); break;
        case 'worried': button(88, 110, 22); button(168, 110, 22); brow(88, 78, 9); brow(168, 78, -9); stitchMouth([[94, 186], [112, 180], [128, 184], [144, 180], [162, 186]]); break;
        case 'nervous': button(88, 108, 24); button(168, 108, 24); stitchMouth([[94, 182], [112, 178], [128, 182], [144, 178], [162, 182]]); c.fillStyle = '#7fc4ff'; c.beginPath(); c.ellipse(214, 70, 9, 15, 0, 0, 7); c.fill(); break;
        case 'sulk': button(88, 112, 20); button(168, 112, 20); c.strokeStyle = ink; c.lineWidth = 8; c.beginPath(); c.moveTo(62, 96); c.lineTo(112, 104); c.moveTo(194, 96); c.lineTo(144, 104); c.stroke(); stitchMouth([[96, 188], [128, 180], [160, 188]]); break;
        default: button(88, 108, 22); button(168, 108, 22); brow(168, 76, -4); stitchMouth([[82, 168], [102, 182], [128, 188], [154, 182], [176, 164]]);
      }
      this.faceTex.needsUpdate = true;
    }
    buildStars() {
      const g = new T.Group();
      const shape = new T.Shape();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 0.035 : 0.08; i ? shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      const geo = new T.ShapeGeometry(shape);
      for (let i = 0; i < 4; i++) { const s = new T.Mesh(geo, new T.MeshBasicMaterial({ color: '#ffd84a', side: T.DoubleSide })); g.add(s); }
      g.visible = false; this.scene.add(g);
      return g;
    }

    // ── per frame ──
    resize(w, h) { this.r.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    placeCamera() {
      const c = this.cam;
      this.camera.position.set(c.target.x + Math.sin(c.az) * Math.cos(c.el) * c.dist, c.target.y + Math.sin(c.el) * c.dist, c.target.z + Math.cos(c.az) * Math.cos(c.el) * c.dist);
      this.camera.lookAt(c.target);
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
        this.orient(s.mesh, P[s.a].pos, P[s.b].pos, s.r * k, s.r * k, 0);
      }
      for (const j of this.joints) { const k = 1 + sq(j.k) * 0.5; j.mesh.position.copy(P[j.k].pos); j.mesh.scale.setScalar(j.r * k); }
      for (const h of this.hands) { h.mesh.position.copy(P[h.k].pos); h.mesh.scale.set(0.1, 0.11, 0.08); }
      const tf = b.frame('chest', 'pelvis'), tq = this.basis(tf);
      for (const f of this.feet) { f.mesh.position.copy(P[f.k].pos); f.mesh.quaternion.copy(tq); f.mesh.scale.set(0.095, 0.075, 0.15); f.mesh.position.z += 0; }
      // torso: an egg between chest and pelvis, squashed when hit
      const c = P.chest.pos, p = P.pelvis.pos;
      const tl = Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z);
      const ts = Math.max(sq('chest'), sq('pelvis'));
      this.torso.position.set((c.x + p.x) / 2, (c.y + p.y) / 2, (c.z + p.z) / 2);
      this.torso.quaternion.copy(tq);
      this.torso.scale.set(0.27 * (1 + ts * 0.45), (tl / 2 + 0.13) * (1 - ts * 0.35), 0.21 * (1 + ts * 0.3));
      for (const { pt, m } of this.patchMeshes) { const at = b.torsoAt(pt.off); m.position.set(at.x, at.y, at.z); m.quaternion.copy(tq); m.translateZ(0.012 + ts * 0.05); }
      for (const { bt, m } of this.btnMeshes) {
        if (bt.popped) { m.position.set(bt.pos.x, bt.pos.y, bt.pos.z); m.rotation.x += dt * 9; m.rotation.z += dt * 6; continue; }
        const at = b.torsoAt(bt.off); m.position.set(at.x, at.y, at.z); m.quaternion.copy(tq); m.rotateX(Math.PI / 2); m.translateY(0.012 + ts * 0.05);
      }
      // head, face and hair
      const hf = b.detached.head ? tf : b.frame('head', 'neck');
      const hq = this.basis(hf), hs = sq('head');
      this.head.position.copy(P.head.pos); this.head.quaternion.copy(hq);
      this.head.scale.set(0.25 * (1 + hs * 0.35), 0.24 * (1 - hs * 0.4), 0.23 * (1 + hs * 0.2));
      this.face.position.copy(P.head.pos); this.face.quaternion.copy(hq); this.face.translateZ(0.232 * (1 + hs * 0.2)); this.face.scale.set(1 + hs * 0.3, 1 - hs * 0.35, 1);
      this.hair.position.copy(P.head.pos); this.hair.quaternion.copy(hq); this.hair.translateY(0.02 - hs * 0.06); this.hair.scale.set(0.265 * (1 + hs * 0.35), 0.26 * (1 - hs * 0.4), 0.245);
      this.drawFace(b.face);
      // stuffing where limbs came off
      const SOCK = { armL: 'shL', armR: 'shR', legL: 'hipL', legR: 'hipR', head: 'neck' };
      for (const limb in this.tufts) { const m = this.tufts[limb]; m.visible = b.detached[limb]; if (m.visible) { m.position.copy(P[SOCK[limb]].pos); m.rotation.y += dt * 2; m.scale.setScalar(1 + Math.sin(time * 6) * 0.1); } }
      // dizzy stars
      this.stars.visible = b.dizzy > 45;
      if (this.stars.visible) {
        this.stars.position.set(P.head.pos.x, P.head.pos.y + 0.36, P.head.pos.z);
        this.stars.children.forEach((s, i) => { const a = time * 3 + (i / 4) * Math.PI * 2; s.position.set(Math.cos(a) * 0.3, Math.sin(time * 5 + i) * 0.03, Math.sin(a) * 0.3); s.lookAt(this.camera.position); });
      }
      // props
      const seen = new Set();
      for (const pr of this.world.props) {
        seen.add(pr);
        let m = this.props.get(pr);
        if (!m) { m = this.propMesh(pr.kind, pr.p.r); this.scene.add(m); this.props.set(pr, m); }
        m.position.copy(pr.p.pos);
        if (pr.kind === 'cannonball') { m.rotation.z -= dt * 8; }
        if (pr.life < 0.6) m.scale.setScalar(Math.max(0.01, pr.life / 0.6));
      }
      for (const [pr, m] of this.props) if (!seen.has(pr)) { this.scene.remove(m); this.props.delete(pr); }
      // effects
      for (const f of this.fx) {
        f.t += dt;
        f.vel.y -= (f.grav || 0) * dt;
        f.m.position.x += f.vel.x * dt; f.m.position.y += f.vel.y * dt; f.m.position.z += f.vel.z * dt;
        if (f.m.position.y < 0.03) { f.m.position.y = 0.03; f.vel.y = Math.abs(f.vel.y) * 0.3; f.vel.x *= 0.6; f.vel.z *= 0.6; }
        const k = f.t / f.life;
        if (f.kind === 'puff') f.m.scale.setScalar(f.s * (0.6 + k * 0.8));
        if (f.kind === 'ring') f.m.scale.setScalar(f.s * (0.3 + k * 2.2));
        f.m.material.opacity = Math.max(0, 1 - k);
      }
      this.fx = this.fx.filter((f) => { if (f.t < f.life) return true; this.scene.remove(f.m); return false; });
      // torches flicker
      for (const t of this.torches) { const fl = 0.5 + Math.sin(time * 13 + t.light.position.x) * 0.08 + Math.random() * 0.07; t.light.intensity = fl * 0.6; t.flame.scale.set(1, 0.9 + Math.random() * 0.25, 1); }
      this.placeCamera();
      this.r.render(this.scene, this.camera);
    }
    propMesh(kind, r) {
      const g = new T.Group();
      const metal = this.mat('#3b3f45'), wood = this.mat('#4a2a1a'), shine = this.mat('#22252a');
      if (kind === 'anvil') {
        const top = new T.Mesh(new T.BoxGeometry(0.62, 0.14, 0.26), metal); top.position.y = 0.12;
        const horn = new T.Mesh(new T.ConeGeometry(0.12, 0.3, 10), metal); horn.rotation.z = Math.PI / 2; horn.position.set(-0.44, 0.12, 0);
        const waist = new T.Mesh(new T.BoxGeometry(0.22, 0.16, 0.18), metal); waist.position.y = -0.02;
        const base = new T.Mesh(new T.BoxGeometry(0.46, 0.12, 0.3), metal); base.position.y = -0.16;
        g.add(top, horn, waist, base);
        const label = new T.Mesh(new T.PlaneGeometry(0.3, 0.08), new T.MeshBasicMaterial({ map: canvasTex(128, 32, (c, w, h) => { c.fillStyle = '#3b3f45'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8e2d0'; c.font = 'bold 22px Arial'; c.textAlign = 'center'; c.fillText('100 KG', w / 2, 24); }) }));
        label.position.set(0, 0.12, 0.131); g.add(label);
      } else if (kind === 'piano') {
        const body = new T.Mesh(new T.BoxGeometry(1.2, 0.8, 0.55), shine); g.add(body);
        const keys = new T.Mesh(new T.BoxGeometry(1.05, 0.06, 0.2), this.mat('#f4f1ea')); keys.position.set(0, 0.0, 0.36); g.add(keys);
        for (let i = 0; i < 14; i++) { if ([2, 6, 9, 13].includes(i)) continue; const bk = new T.Mesh(new T.BoxGeometry(0.035, 0.05, 0.12), shine); bk.position.set(-0.5 + i * 0.075, 0.04, 0.33); g.add(bk); }
        for (const x of [-0.5, 0.5]) { const leg = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.3, 8), wood); leg.position.set(x, -0.5, 0.15); g.add(leg); }
      } else if (kind === 'cannonball') {
        g.add(new T.Mesh(new T.SphereGeometry(r, 16, 12), this.mat('#1d1f22')));
      } else if (kind === 'boot') {
        const shin = new T.Mesh(new T.CylinderGeometry(0.16, 0.18, 0.5, 12), this.mat('#5a3622')); shin.position.y = 0.25;
        const foot = new T.Mesh(new T.BoxGeometry(0.34, 0.2, 0.55), this.mat('#5a3622')); foot.position.set(0, 0, 0.12);
        const sole = new T.Mesh(new T.BoxGeometry(0.36, 0.06, 0.58), this.mat('#222')); sole.position.set(0, -0.12, 0.12);
        g.add(shin, foot, sole);
      }
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      return g;
    }
    // stuffing puffs, button pops, stitches
    effect(e) {
      if (e.type === 'puff') {
        for (let i = 0; i < e.n; i++) {
          const m = new T.Mesh(new T.IcosahedronGeometry(0.05, 0), new T.MeshBasicMaterial({ color: '#f6f2ea', transparent: true }));
          m.position.set(e.pos.x, e.pos.y, e.pos.z); this.scene.add(m);
          const d = e.dir || { x: 0, y: 1, z: 0 };
          this.fx.push({ kind: 'puff', m, t: 0, life: rnd(0.6, 1.1), s: rnd(0.6, 1.4), grav: 3, vel: { x: d.x * rnd(0.5, 2) + rnd(-1.5, 1.5), y: rnd(1, 3), z: d.z * rnd(0.5, 2) + rnd(-1.5, 1.5) } });
        }
      }
      if (e.type === 'thud' && e.strength > 0.45) {
        const m = new T.Mesh(new T.RingGeometry(0.2, 0.26, 24), new T.MeshBasicMaterial({ color: '#fff3c4', transparent: true, side: T.DoubleSide }));
        m.position.set(e.pos.x, Math.max(0.03, e.pos.y), e.pos.z); m.lookAt(this.camera.position); this.scene.add(m);
        this.fx.push({ kind: 'ring', m, t: 0, life: 0.35, s: 0.6 + e.strength, vel: { x: 0, y: 0, z: 0 } });
      }
      if (e.type === 'stitch' || e.type === 'rip') {
        for (let i = 0; i < 10; i++) {
          const m = new T.Mesh(new T.IcosahedronGeometry(0.03, 0), new T.MeshBasicMaterial({ color: e.type === 'rip' ? '#f6f2ea' : '#ffe27a', transparent: true }));
          m.position.set(e.pos.x, e.pos.y, e.pos.z); this.scene.add(m);
          this.fx.push({ kind: 'puff', m, t: 0, life: 0.7, s: 1, grav: e.type === 'rip' ? 6 : -1, vel: { x: rnd(-1.5, 1.5), y: rnd(0.5, 2.5), z: rnd(-1.5, 1.5) } });
        }
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
