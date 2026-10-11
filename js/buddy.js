/*
  RAGDOLL CHAMBER — the buddy
  Builds a rag doll out of particles and sticks, tracks how it feels (fluster, dizziness,
  wear and tear), pops buttons and limbs off on big hits, and pulls itself back together
  when you leave it alone. Rendering lives in render.js; this file is pure simulation.
*/
(function (root) {
  'use strict';
  const RC = root.RC;
  const { V, Particle } = RC;

  // rest pose, standing at the origin facing +z (towards the camera). [x, y, z, radius, mass]
  const REST = {
    head: [0, 1.42, 0, 0.24, 3], neck: [0, 1.16, 0, 0.08, 1], chest: [0, 1.0, 0, 0.2, 4], pelvis: [0, 0.68, 0, 0.19, 4],
    shL: [-0.24, 1.08, 0, 0.09, 1], shR: [0.24, 1.08, 0, 0.09, 1], elL: [-0.42, 0.88, 0.02, 0.08, 0.8], elR: [0.42, 0.88, 0.02, 0.08, 0.8],
    handL: [-0.55, 0.68, 0.05, 0.1, 0.8], handR: [0.55, 0.68, 0.05, 0.1, 0.8],
    hipL: [-0.12, 0.58, 0, 0.1, 1.5], hipR: [0.12, 0.58, 0, 0.1, 1.5], kneeL: [-0.13, 0.33, 0.01, 0.09, 1], kneeR: [0.13, 0.33, 0.01, 0.09, 1],
    footL: [-0.13, 0.09, 0.04, 0.09, 1], footR: [0.13, 0.09, 0.04, 0.09, 1],
  };
  // which particles belong to which detachable part
  const LIMB_OF = { shL: 'armL', elL: 'armL', handL: 'armL', shR: 'armR', elR: 'armR', handR: 'armR', hipL: 'legL', kneeL: 'legL', footL: 'legL', hipR: 'legR', kneeR: 'legR', footR: 'legR', head: 'head' };
  // where each detachable part joins the body: [particle on the limb, particle on the body]
  const SOCKET = { armL: ['shL', 'neck'], armR: ['shR', 'neck'], legL: ['hipL', 'pelvis'], legR: ['hipR', 'pelvis'], head: ['head', 'neck'] };
  const LINES = {
    smug: { hit: ['Is that all?', 'Ha! Missed my good side.', 'Barely felt it.', 'Tickles.'], big: ['Oof. Lucky shot.', 'Okay, that one stung.'], limb: ['I meant to do that.', 'Hey! That was my good arm!'], fling: ['Wheee! I mean, how dare you.'], back: ['Ta-da. Good as new.', 'Still handsome.', 'Is that the best you’ve got?'] },
  };

  class Buddy {
    constructor(world, opts) {
      this.world = world;
      this.opts = Object.assign({ personality: 'smug', name: 'Stitches', color: '#c9573a' }, opts || {});
      this.p = {};
      for (const [k, [x, y, z, r, m]] of Object.entries(REST)) this.p[k] = world.addParticle(new Particle(k, x, y, z, r, m));
      const P = this.p, S = (a, b, o) => world.addStick(P[a], P[b], o);
      this.sticks = [
        // torso and head
        S('head', 'neck', { seam: 'head' }), S('head', 'chest', { seam: 'head', stiff: 0.6 }), S('head', 'shL', { seam: 'head', stiff: 0.25 }), S('head', 'shR', { seam: 'head', stiff: 0.25 }),
        S('neck', 'chest'), S('chest', 'pelvis'),
        // arms
        S('neck', 'shL', { seam: 'armL' }), S('chest', 'shL', { seam: 'armL' }), S('pelvis', 'shL', { seam: 'armL', stiff: 0.5 }),
        S('neck', 'shR', { seam: 'armR' }), S('chest', 'shR', { seam: 'armR' }), S('pelvis', 'shR', { seam: 'armR', stiff: 0.5 }),
        S('shL', 'shR', { seam: 'armL' }),
        S('shL', 'elL'), S('elL', 'handL'), S('shR', 'elR'), S('elR', 'handR'),
        // legs
        S('pelvis', 'hipL', { seam: 'legL' }), S('chest', 'hipL', { seam: 'legL', stiff: 0.6 }), S('pelvis', 'hipR', { seam: 'legR' }), S('chest', 'hipR', { seam: 'legR', stiff: 0.6 }),
        S('hipL', 'hipR', { seam: 'legL' }),
        S('hipL', 'kneeL'), S('kneeL', 'footL'), S('hipR', 'kneeR'), S('kneeR', 'footR'),
        // stops limbs folding through themselves
        S('handL', 'shL', { min: true, minLen: 0.26 }), S('handR', 'shR', { min: true, minLen: 0.26 }),
        S('footL', 'hipL', { min: true, minLen: 0.32 }), S('footR', 'hipR', { min: true, minLen: 0.32 }),
        S('head', 'pelvis', { min: true, minLen: 0.6 }), S('kneeL', 'chest', { min: true, minLen: 0.48 }), S('kneeR', 'chest', { min: true, minLen: 0.48 }),
        S('footL', 'footR', { min: true, minLen: 0.14 }), S('kneeL', 'kneeR', { min: true, minLen: 0.12 }), S('handL', 'handR', { min: true, minLen: 0.12 }),
        S('handL', 'chest', { min: true, minLen: 0.22 }), S('handR', 'chest', { min: true, minLen: 0.22 }),
      ];
      this.detached = { armL: false, armR: false, legL: false, legR: false, head: false };
      // buttons sewn on the chest: offsets in the torso frame (right, up, forward)
      this.buttons = [0.12, 0, -0.12].map((u, i) => ({ id: i, off: { x: 0, y: u, z: 0.2 }, popped: false, pos: null, vel: null, back: 0 }));
      this.patches = [{ off: { x: -0.11, y: 0.06, z: 0.19 }, size: 0.07, color: '#e2b04a' }, { off: { x: 0.13, y: -0.1, z: 0.18 }, size: 0.06, color: '#5b8bd0' }];
      this.fluster = 0; this.dizzy = 0; this.wear = 0;
      this.state = 'standing';  // standing | ragdoll | mending | rising
      this.calm = 0; this.poseK = 1; this.sinceHit = 99; this.face = 'smug'; this.faceT = 0;
      this.events = [];         // for the renderer and sound: puffs, pops, lines
      this.squash = {};         // particle name -> 0..1
      this.lastLine = -9; this.t = 0;
      this.grabbed = null;
      world.onImpact = (p, speed, prop, n) => this.hit(p, speed, prop, n);
    }

    // ── frames: an orthonormal basis for the torso and the head ──
    frame(upA, upB) {
      const P = this.p;
      const up = V.norm(V.sub(P[upA].pos, P[upB].pos));
      let right = V.sub(P.shR.pos, P.shL.pos);
      if (this.detached.armL || this.detached.armR || V.len(right) < 0.05) right = V.sub(P.hipR.pos, P.hipL.pos);
      right = V.norm(V.sub(right, V.mul(up, V.dot(right, up))));
      const fwd = V.cross(right, up);
      return { up, right, fwd };
    }
    torsoAt(off) {
      const P = this.p, f = this.frame('chest', 'pelvis');
      const c = V.mul(V.add(P.chest.pos, P.pelvis.pos), 0.5);
      return V.add(c, V.add(V.mul(f.right, off.x), V.add(V.mul(f.up, off.y), V.mul(f.fwd, off.z))));
    }

    // ── getting hurt ──
    hit(p, speed, prop, n) {
      if (!this.p[p.name] || this.p[p.name] !== p) return;
      const wall = !prop;
      let impact = wall ? speed * 0.55 : speed;
      if (wall && impact < 4.5) return;
      if (impact < 2.5) return;
      this.sinceHit = 0; this.calm = 0;
      if (impact > 4) { this.state = 'ragdoll'; this.poseK = 0; }
      this.squash[p.name] = Math.min(1, Math.max(this.squash[p.name] || 0, impact / 16));
      this.fluster = Math.min(100, this.fluster + impact * 1.6);
      if (impact > 9) this.wear = Math.min(100, this.wear + (impact - 9) * 1.4);
      const big = impact > 11;
      this.events.push({ type: 'thud', strength: Math.min(1, impact / 18), impact, pos: V.copy(p.pos), prop: prop ? prop.kind : 'floor', part: p.name });
      if (impact > 7) this.events.push({ type: 'puff', pos: V.copy(p.pos), n: Math.min(12, Math.round(impact / 2)), dir: n });
      // buttons pop off the chest
      if ((p.name === 'chest' || p.name === 'pelvis') && impact > 8) {
        const b = this.buttons.find((x) => !x.popped);
        if (b && Math.random() < 0.6) {
          b.popped = true; b.pos = this.torsoAt(b.off);
          const out = this.frame('chest', 'pelvis').fwd;
          b.vel = V.add(V.mul(out, 3 + Math.random() * 3), { x: (Math.random() - 0.5) * 4, y: 3 + Math.random() * 3, z: (Math.random() - 0.5) * 4 });
          this.events.push({ type: 'pop', pos: V.copy(b.pos) });
        }
      }
      // limbs come off at the seams
      const limb = LIMB_OF[p.name];
      if (limb && !this.detached[limb] && impact > (limb === 'head' ? 17 : 13) && Math.random() < (limb === 'head' ? 0.25 : 0.4)) this.detach(limb);
      this.say(big ? 'big' : 'hit');
      return impact;
    }
    detach(limb) {
      this.detached[limb] = true;
      for (const s of this.world.sticks) if (s.seam === limb) s.on = false;
      const [a] = SOCKET[limb];
      this.events.push({ type: 'rip', pos: V.copy(this.p[a].pos), limb });
      this.wear = Math.min(100, this.wear + 15);
      this.say('limb', true);
    }
    say(kind, force) {
      if (!force && this.t - this.lastLine < 2.6) return;
      if (!force && Math.random() < 0.45) return;
      const set = (LINES[this.opts.personality] || LINES.smug)[kind];
      if (!set) return;
      this.lastLine = this.t;
      this.events.push({ type: 'line', text: set[Math.floor(Math.random() * set.length)] });
    }

    // ── each frame ──
    update(dt) {
      const P = this.p;
      this.t += dt; this.sinceHit += dt;
      for (const k in this.squash) { this.squash[k] = Math.max(0, this.squash[k] - dt * 2.2); if (!this.squash[k]) delete this.squash[k]; }
      // dizziness from being swung about
      const hv = V.len(P.head.vel(dt));
      if (hv > 5) this.dizzy = Math.min(100, this.dizzy + (hv - 5) * dt * 9);
      this.dizzy = Math.max(0, this.dizzy - dt * (this.state === 'standing' ? 9 : 4));
      this.fluster = Math.max(0, this.fluster - dt * (this.state === 'standing' ? 5 : 2));
      // how still is it?
      let maxV = 0;
      for (const k in P) maxV = Math.max(maxV, V.len(P[k].vel(dt)));
      if (this.grabbed) { this.calm = 0; if (this.state !== 'ragdoll') { this.state = 'ragdoll'; this.poseK = 0; } if (hv > 7) this.say('fling'); }
      else if (maxV < 1.4 && this.sinceHit > 0.8) this.calm += dt; else this.calm = Math.max(0, this.calm - dt);
      // buttons that came off
      for (const b of this.buttons) {
        if (!b.popped) continue;
        if (this.state === 'mending' || this.state === 'rising') {
          b.back = Math.min(1, b.back + dt * 1.6);
          const target = this.torsoAt(b.off);
          b.pos = V.add(b.pos, V.mul(V.sub(target, b.pos), Math.min(1, b.back * 0.25 + dt * 4)));
          if (V.dist(b.pos, target) < 0.03) { b.popped = false; b.back = 0; this.events.push({ type: 'pip', pos: V.copy(target) }); }
          continue;
        }
        b.vel.y -= 14 * dt;
        b.pos = V.add(b.pos, V.mul(b.vel, dt));
        if (b.pos.y < 0.02) { b.pos.y = 0.02; b.vel.y *= -0.45; b.vel.x *= 0.7; b.vel.z *= 0.7; }
        const R = this.world.room;
        b.pos.x = Math.max(-R.w, Math.min(R.w, b.pos.x)); b.pos.z = Math.max(-R.d, Math.min(R.d, b.pos.z));
      }
      // pulling itself back together
      if (this.state === 'ragdoll' && this.calm > 1.4) { this.state = 'mending'; this.calm = 0; }
      if (this.state === 'mending') {
        let all = true;
        for (const limb of Object.keys(this.detached)) {
          if (!this.detached[limb]) continue;
          all = false;
          const [a, body] = SOCKET[limb];
          const target = V.add(P[body].pos, V.sub(this.restOffset(a), this.restOffset(body)));
          const pa = P[a];
          const pull = V.mul(V.sub(target, pa.pos), 70);
          // the whole limb is dragged along
          for (const k in LIMB_OF) if (LIMB_OF[k] === limb) { P[k].extra = V.add(pull, { x: 0, y: 14, z: 0 }); }
          if (V.dist(pa.pos, target) < 0.07) { this.detached[limb] = false; for (const s of this.world.sticks) if (s.seam === limb) s.on = true; this.events.push({ type: 'stitch', pos: V.copy(target), limb }); }
        }
        if (all && !this.buttons.some((b) => b.popped)) { this.state = 'rising'; this.poseK = 0; this.wear = Math.max(0, this.wear - 40); }
      }
      if (this.state === 'rising' || this.state === 'standing') {
        this.poseK = Math.min(1, this.poseK + dt * (this.state === 'rising' ? 0.8 : 2));
        this.applyPose(dt);
        if (this.state === 'rising' && this.poseK >= 1) { this.state = 'standing'; this.say('back', true); this.wear = Math.max(0, this.wear - 30); }
      }
      // the face
      this.faceT = Math.max(0, this.faceT - dt);
      let face = 'smug';
      if (this.grabbed) face = 'nervous';
      if (this.fluster > 35) face = 'worried';
      if (this.fluster > 72) face = 'outraged';
      if (this.dizzy > 50) face = 'dazed';
      if (this.sinceHit < 0.45) face = 'ouch';
      if (this.state === 'mending') face = 'sulk';
      this.face = face;
    }
    restOffset(k) { const r = REST[k]; return { x: r[0], y: r[1], z: r[2] }; }
    // springs that pull every point towards a standing pose around the pelvis
    applyPose(dt) {
      const P = this.p;
      const base = { x: P.pelvis.pos.x, y: REST.pelvis[1], z: P.pelvis.pos.z };
      const sway = Math.sin(this.t * 1.7) * 0.02;
      const k = 260 * this.poseK * this.poseK, c = 16 * this.poseK;
      for (const name in P) {
        if (LIMB_OF[name] && this.detached[LIMB_OF[name]]) continue;
        const r = REST[name];
        const target = { x: base.x + r[0] + (r[1] > 0.7 ? sway * (r[1] - 0.7) * 2 : 0), y: base.y + (r[1] - REST.pelvis[1]), z: base.z + r[2] };
        const p = P[name], v = p.vel(dt);
        const f = V.sub(V.mul(V.sub(target, p.pos), k), V.mul(v, c));
        f.y += 14 * this.poseK;   // hold itself up against gravity
        p.extra = p.extra ? V.add(p.extra, f) : f;
      }
    }
    // put it back exactly as new
    repair() {
      const P = this.p;
      const base = { x: 0, z: 0 };
      for (const [k, r] of Object.entries(REST)) { P[k].pos = { x: base.x + r[0], y: r[1], z: base.z + r[2] }; P[k].prev = V.copy(P[k].pos); P[k].grab = null; }
      for (const limb in this.detached) this.detached[limb] = false;
      for (const s of this.world.sticks) s.on = true;
      for (const b of this.buttons) { b.popped = false; b.back = 0; }
      this.fluster = 0; this.dizzy = 0; this.wear = 0; this.state = 'standing'; this.poseK = 1; this.squash = {}; this.grabbed = null;
      this.events.push({ type: 'stitch', pos: V.copy(P.chest.pos) });
    }
    nearest(pt) {
      let best = null, bd = Infinity;
      for (const k in this.p) { const d = V.dist(this.p[k].pos, pt); if (d < bd) { bd = d; best = this.p[k]; } }
      return best;
    }
  }
  Buddy.REST = REST; Buddy.LIMB_OF = LIMB_OF;
  RC.Buddy = Buddy;
})(typeof window !== 'undefined' ? window : globalThis);
