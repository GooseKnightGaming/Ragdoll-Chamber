/*
  RAGDOLL CHAMBER — the game
  Ties it together: the fixed-step loop, the tools, pointer and touch input, the camera,
  points and combos, speech bubbles, and the HUD.
*/
(function () {
  'use strict';
  const RC = window.RC;
  const { V } = RC;
  const $ = (id) => document.getElementById(id);
  const ROOM = { w: 3, d: 2.2, h: 4 };
  const DT = 1 / 60, SUB = 2;

  const world = new RC.World(ROOM);
  const buddy = new RC.Buddy(world, { name: 'Stitches', personality: 'smug', color: '#c9573a' });
  const view = new RC.Renderer($('c'), world, buddy);

  const TOOLS = {
    grab: { label: 'Grab', key: '1', tip: 'Drag the buddy around and let go to fling it.' },
    flick: { label: 'Flick', key: '2', tip: 'Tap the buddy for a sharp flick.' },
    boot: { label: 'Boot', key: '3', tip: 'Tap the buddy to give it a good kick.' },
    anvil: { label: 'Anvil', key: '4', tip: 'Tap anywhere: an anvil drops from the ceiling.' },
    cannon: { label: 'Cannon', key: '5', tip: 'Tap the buddy: a cannonball flies in from the side.' },
    piano: { label: 'Piano', key: '6', tip: 'Tap anywhere: a grand piano drops from the ceiling.' },
  };
  let tool = 'grab';
  let score = 0, best = 0, combo = 1, lastScore = -9, time = 0;
  try { best = Number(localStorage.getItem('ragdoll-chamber.best')) || 0; } catch (e) { /* ignore */ }
  const boots = [];

  // ── HUD ──
  function buildTools() {
    const ICON = {
      grab: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v4m0-5a1.5 1.5 0 0 1 3 0v5m0-4a1.5 1.5 0 0 1 3 0v5m0-2a1.5 1.5 0 0 1 3 0v4c0 4-3 7-7 7h-1c-3 0-5-2-6-4l-2-4a1.5 1.5 0 0 1 2.6-1.5L7 13"/>',
      flick: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6m0 0V9.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v2c0 4-3 7-7 7h-.5C7 20 5 18 4 16l-1.5-3a1.5 1.5 0 0 1 2.6-1.5L8 15"/><path d="M15 4l3-2M17 7h3"/>',
      boot: '<path d="M7 3h6v9l6 3c1.5.8 2 2 2 3v1H5V3z"/><path d="M5 19v2h16v-2"/>',
      anvil: '<path d="M3 7h15c0 3-2 4-5 4v3h3l2 4H5l2-4h3v-3c-4 0-7-2-7-4z"/>',
      cannon: '<circle cx="7" cy="17" r="3"/><path d="M9 15l10-8 2 3-10 7"/><circle cx="19" cy="5" r="1.4"/>',
      piano: '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M7 6v7M11 6v7M15 6v7M19 6v7M3 13h18"/>',
    };
    $('tools').innerHTML = Object.entries(TOOLS).map(([k, t]) => `<button type="button" data-tool="${k}" aria-pressed="${k === tool}" title="${t.tip} (key ${t.key})"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg><span>${t.label}</span></button>`).join('');
    $('tools').querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  }
  function setTool(k) {
    tool = k;
    $('tools').querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === k)));
    $('hint').textContent = TOOLS[k].tip + ' Drag empty space to turn the camera.';
  }
  function hud() {
    const set = (id, v) => { const el = $(id); el.style.width = Math.round(v) + '%'; };
    set('m-fluster', buddy.fluster); set('m-dizzy', buddy.dizzy); set('m-wear', buddy.wear);
    $('score').textContent = score.toLocaleString('en-GB');
    $('best').textContent = best.toLocaleString('en-GB');
    $('combo').textContent = combo > 1 ? `×${combo}` : '';
    $('state').textContent = { standing: 'Standing', ragdoll: 'Floppy', mending: 'Pulling itself together…', rising: 'Getting up…' }[buddy.state];
  }
  function floatText(pos, text, cls) {
    const s = view.project(pos);
    if (s.behind) return;
    const el = document.createElement('div');
    el.className = 'float ' + (cls || '');
    el.textContent = text;
    el.style.left = (s.x * 100) + '%'; el.style.top = (s.y * 100) + '%';
    $('labels').appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }
  let bubbleT = 0;
  function bubble(text) { const el = $('bubble'); el.textContent = text; el.hidden = false; bubbleT = 2.4; }
  function placeBubble() {
    const el = $('bubble');
    if (el.hidden) return;
    const s = view.project({ x: buddy.p.head.pos.x, y: buddy.p.head.pos.y + 0.42, z: buddy.p.head.pos.z });
    const W = canvas.clientWidth, half = Math.min(110, el.offsetWidth / 2 + 8) / Math.max(1, W);
    el.style.left = (Math.max(half, Math.min(1 - half, s.x)) * 100) + '%'; el.style.top = (Math.max(0.12, s.y) * 100) + '%';
  }
  // hits that land together count as one: their points are pooled into a single label
  let pool = null;
  function addPoints(n, pos, label) {
    if (label) {
      const pts = Math.round(n * combo);
      score += pts; floatText(pos, `+${pts} ${label}`, 'gold'); saveBest();
      return;
    }
    if (!pool) {
      // a fresh hit: the combo grows if it comes soon after the last one
      if (time - lastScore < 1.4) combo = Math.min(5, combo + 1); else combo = 1;
      pool = { n: 0, pos, until: time + 0.25 };
    }
    pool.n += n;
    lastScore = time;
  }
  function flushPool() {
    if (!pool || time < pool.until) return;
    const pts = Math.round(Math.min(600, pool.n) * combo);
    if (pts >= 5) { score += pts; floatText(pool.pos, `+${pts}`); saveBest(); }
    pool = null;
  }
  function saveBest() { if (score > best) { best = score; try { localStorage.setItem('ragdoll-chamber.best', String(best)); } catch (e) { /* ignore */ } } }

  // ── events from the buddy ──
  let wasDizzy = false, lastFace = 'smug';
  function handleEvents() {
    for (const e of buddy.events.splice(0)) {
      view.effect(e);
      if (e.type === 'thud') { RC.Sound.thud(e.strength, e.prop); addPoints(e.impact * (e.prop === 'floor' ? 1.5 : 4), e.pos); }
      if (e.type === 'pop') { RC.Sound.pop(); addPoints(60, e.pos, 'Button!'); }
      if (e.type === 'rip') { RC.Sound.rip(); addPoints(200, e.pos, 'Seam split!'); }
      if (e.type === 'stitch') RC.Sound.stitch();
      if (e.type === 'pip') RC.Sound.pip();
      if (e.type === 'line') bubble(e.text);
    }
    if (buddy.dizzy > 55 && !wasDizzy) { addPoints(120, buddy.p.head.pos, 'Dizzy!'); RC.Sound.whistle(); }
    wasDizzy = buddy.dizzy > 55;
    if (buddy.face === 'ouch' && lastFace !== 'ouch' && Math.random() < 0.6) RC.Sound.squeak(1 + Math.random() * 0.4);
    lastFace = buddy.face;
  }

  // ── tools in action ──
  function useTool(k, hit) {
    const target = hit.buddy || hit.floor;
    if (!target) return;
    const camF = view.camera.getWorldDirection(new window.THREE.Vector3());
    const flat = V.norm({ x: camF.x, y: 0, z: camF.z });
    if (k === 'flick' && hit.buddy) {
      const p = buddy.nearest(hit.buddy);
      p.push(V.add(V.mul({ x: camF.x, y: camF.y, z: camF.z }, 9), { x: 0, y: 2.5, z: 0 }), DT / SUB);
      buddy.hit(p, 8, { kind: 'flick' }, flat);
    }
    if (k === 'boot' && hit.buddy) {
      const p = buddy.nearest(hit.buddy);
      const dir = V.norm(V.add(flat, { x: 0, y: 0.55, z: 0 }));
      for (const q of Object.values(buddy.p)) q.push(V.mul(dir, q === p ? 13 : 8), DT / SUB);
      buddy.hit(p, 15, { kind: 'boot' }, dir);
      RC.Sound.whoosh(0.8);
      const m = view.propMesh('boot'); view.scene.add(m);
      const from = V.sub(hit.buddy, V.mul(flat, 0.9));
      boots.push({ m, from, to: hit.buddy, t: 0, dir: flat });
    }
    if (k === 'anvil' || k === 'piano') {
      const r = k === 'anvil' ? 0.28 : 0.5;
      const x = Math.max(-ROOM.w + r, Math.min(ROOM.w - r, target.x)), z = Math.max(-ROOM.d + r, Math.min(ROOM.d - r, target.z));
      world.addProp(k, { x, y: ROOM.h - r - 0.05, z }, r, k === 'anvil' ? 40 : 90, { x: 0, y: -2, z: 0 }, k === 'anvil' ? 5 : 6, DT / SUB);
      RC.Sound.whistle();
    }
    if (k === 'cannon') {
      const aim = hit.buddy || { x: target.x, y: 0.9, z: target.z };
      const side = aim.x > 0 ? -1 : 1;
      const from = { x: side * (ROOM.w - 0.25), y: Math.max(0.5, aim.y + 0.15), z: aim.z * 0.6 };
      const dir = V.norm(V.sub(aim, from));
      world.addProp('cannonball', from, 0.17, 20, V.add(V.mul(dir, 20), { x: 0, y: 1.2, z: 0 }), 4, DT / SUB);
      RC.Sound.boom();
    }
  }

  // ── pointer: grab, tap, orbit, pinch ──
  const canvas = $('c');
  const pointers = new Map();
  let drag = null; // { mode: 'grab'|'orbit', p, plane, last, start, moved }
  const ndcOf = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }; };
  canvas.addEventListener('pointerdown', (e) => {
    RC.Sound.init();
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { drag = { mode: 'pinch', d: pinchDist(), dist: view.cam.dist }; return; }
    const hit = view.pick(ndcOf(e));
    if (tool === 'grab' && hit.buddy) {
      const p = buddy.nearest(hit.buddy);
      const T = window.THREE;
      const normal = view.camera.getWorldDirection(new T.Vector3()).negate();
      const plane = new T.Plane().setFromNormalAndCoplanarPoint(normal, new T.Vector3(p.pos.x, p.pos.y, p.pos.z));
      p.grab = V.copy(p.pos);
      buddy.grabbed = p;
      drag = { mode: 'grab', p, plane };
      canvas.classList.add('grabbing');
      return;
    }
    drag = { mode: 'orbit', last: { x: e.clientX, y: e.clientY }, start: { x: e.clientX, y: e.clientY }, hit, moved: false };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!drag) { hover(e); return; }
    if (drag.mode === 'pinch' && pointers.size === 2) { view.cam.dist = Math.max(3, Math.min(9.5, drag.dist * (drag.d / pinchDist()))); return; }
    if (drag.mode === 'grab') {
      const T = window.THREE, ray = new T.Raycaster(); ray.setFromCamera(new T.Vector2(ndcOf(e).x, ndcOf(e).y), view.camera);
      const pt = new T.Vector3();
      if (ray.ray.intersectPlane(drag.plane, pt)) drag.p.grab = { x: Math.max(-ROOM.w, Math.min(ROOM.w, pt.x)), y: Math.max(0.1, Math.min(ROOM.h - 0.2, pt.y)), z: Math.max(-ROOM.d, Math.min(ROOM.d, pt.z)) };
      return;
    }
    if (drag.mode === 'orbit') {
      const dx = e.clientX - drag.last.x, dy = e.clientY - drag.last.y;
      if (Math.hypot(e.clientX - drag.start.x, e.clientY - drag.start.y) > 6) drag.moved = true;
      if (drag.moved) { view.cam.az -= dx * 0.006; view.cam.el = Math.max(0.05, Math.min(1.25, view.cam.el + dy * 0.004)); }
      drag.last = { x: e.clientX, y: e.clientY };
    }
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (!drag) return;
    if (drag.mode === 'grab') {
      const p = drag.p, v = p.vel(DT / SUB), sp = V.len(v);
      p.grab = null; buddy.grabbed = null;
      p.push(V.mul(v, 0.35), DT / SUB);
      if (sp > 6) { RC.Sound.whoosh(Math.min(1, sp / 20)); RC.Sound.squeak(1.3); }
      canvas.classList.remove('grabbing');
    } else if (drag.mode === 'orbit' && !drag.moved && tool !== 'grab') {
      useTool(tool, drag.hit);
    } else if (drag.mode === 'orbit' && !drag.moved && tool === 'grab' && drag.hit.buddy) {
      // a quick tap with the hand is a little poke
      const p = buddy.nearest(drag.hit.buddy); p.push({ x: 0, y: 3, z: 0 }, DT / SUB);
    }
    if (pointers.size < 2 && drag.mode === 'pinch') { drag = null; return; }
    drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); view.cam.dist = Math.max(3, Math.min(9.5, view.cam.dist * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
  function pinchDist() { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; }
  function hover(e) {
    const hit = view.pick(ndcOf(e));
    canvas.classList.toggle('over-buddy', !!hit.buddy);
  }

  // ── buttons and keys ──
  $('repair').addEventListener('click', () => { buddy.repair(); combo = 1; });
  $('mute').addEventListener('click', () => { RC.Sound.init(); RC.Sound.setMuted(!RC.Sound.muted); muteLabel(); });
  $('recentre').addEventListener('click', () => Object.assign(view.cam, { az: 0.35, el: 0.32, dist: canvas.clientWidth / canvas.clientHeight < 0.8 ? 8 : 5.6 }));
  $('resetscore').addEventListener('click', () => { score = 0; combo = 1; });
  function muteLabel() { $('mute').textContent = RC.Sound.muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', String(!RC.Sound.muted)); }
  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const t = Object.entries(TOOLS).find(([, v]) => v.key === e.key);
    if (t) setTool(t[0]);
    if (e.key === 'r' || e.key === 'R') buddy.repair();
  });

  // ── loop ──
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; view.resize(w, h);
    view.cam.dist = Math.max(view.cam.dist, w / h < 0.8 ? 8 : 5.6);   // tall phone screens see more of the room
  }
  window.addEventListener('resize', resize);
  let last = performance.now(), acc = 0;
  function frame(nowT) {
    const real = Math.min(0.1, (nowT - last) / 1000); last = nowT; acc += real;
    let steps = 0;
    while (acc >= DT && steps < 4) {
      buddy.update(DT);
      for (let i = 0; i < SUB; i++) world.step(DT / SUB);
      acc -= DT; time += DT; steps++;
    }
    if (steps === 4) acc = 0;
    handleEvents();
    flushPool();
    // boots swing in, then fade
    for (const b of boots) {
      b.t += real;
      const k = Math.min(1, b.t / 0.12);
      const at = V.add(b.from, V.mul(V.sub(b.to, b.from), k));
      b.m.position.set(at.x, at.y, at.z);
      b.m.lookAt(at.x + b.dir.x, at.y, at.z + b.dir.z);
      b.m.rotation.x += 0;
      if (b.t > 0.5) b.m.scale.setScalar(Math.max(0.01, 1 - (b.t - 0.5) / 0.3));
    }
    for (const b of boots.splice(0)) { if (b.t < 0.8) boots.push(b); else view.scene.remove(b.m); }
    // the camera drifts to keep the buddy in view
    const c = buddy.p.chest.pos, tg = view.cam.target;
    tg.x += (c.x * 0.6 - tg.x) * 0.04; tg.y += (Math.max(0.6, Math.min(1.6, c.y)) - tg.y) * 0.04; tg.z += (c.z * 0.6 - tg.z) * 0.04;
    if (bubbleT > 0) { bubbleT -= real; if (bubbleT <= 0) $('bubble').hidden = true; }
    view.draw(real, time);
    placeBubble();
    hud();
    requestAnimationFrame(frame);
  }
  buildTools(); setTool('grab'); muteLabel(); resize();
  $('buddyname').textContent = buddy.opts.name;
  requestAnimationFrame(frame);
  window.RagdollChamber = { world, buddy, view, setTool, useTool: (k, pt) => useTool(k, { buddy: pt, floor: pt }) };
})();
