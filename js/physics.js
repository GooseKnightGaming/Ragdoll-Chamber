/*
  RAGDOLL CHAMBER — physics
  A small Verlet engine: points (particles) joined by sticks. Points remember where they
  were last step, so velocity is just "now minus then". Sticks pull pairs back to their
  length. Heavy props are single big balls that knock the ragdoll about.
  No DOM, no Three.js in here.
*/
(function (root) {
  'use strict';
  const RC = (root.RC = root.RC || {});

  // ── tiny vector helpers on plain {x,y,z} ──
  const V = {
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    mul: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
    len: (a) => Math.hypot(a.x, a.y, a.z),
    dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
    copy: (a) => ({ x: a.x, y: a.y, z: a.z }),
    norm: (a) => { const l = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x / l, y: a.y / l, z: a.z / l }; },
    cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  };
  RC.V = V;

  class Particle {
    constructor(name, x, y, z, r, mass) {
      this.name = name;
      this.pos = { x, y, z };
      this.prev = { x, y, z };
      this.r = r;
      this.mass = mass;
      this.inv = mass > 0 ? 1 / mass : 0;
      this.grab = null;            // a point the hand is pulling this towards
      this.onFloor = false;
    }
    vel(dt) { return V.mul(V.sub(this.pos, this.prev), 1 / dt); }
    setVel(v, dt) { this.prev = V.sub(this.pos, V.mul(v, dt)); }
    push(v, dt) { const cur = this.vel(dt); this.setVel(V.add(cur, v), dt); }
  }

  class Stick {
    constructor(a, b, opts) {
      this.a = a; this.b = b;
      this.len = V.dist(a.pos, b.pos);
      this.stiff = opts && opts.stiff != null ? opts.stiff : 1;
      this.min = !!(opts && opts.min);          // only pushes apart, never pulls together
      this.minLen = opts && opts.minLen;
      this.seam = (opts && opts.seam) || null;  // which part of the body this holds on
      this.on = true;
    }
  }

  class World {
    constructor(room) {
      this.room = room;            // { w, d, h }: half-width, half-depth, height
      this.particles = [];
      this.sticks = [];
      this.props = [];             // heavy balls: { p: Particle, kind, life }
      this.gravity = -14;
      this.iterations = 10;
      this.onImpact = null;        // (particle, speed, prop|null, normal)
    }
    addParticle(p) { this.particles.push(p); return p; }
    addStick(a, b, opts) { const s = new Stick(a, b, opts); if (s.min) s.len = s.minLen != null ? s.minLen : s.len; this.sticks.push(s); return s; }

    step(dt) {
      const g = this.gravity * dt * dt;
      const all = this.particles.concat(this.props.map((x) => x.p));
      for (const p of all) {
        if (!p.inv) continue;
        const vx = (p.pos.x - p.prev.x) * 0.995, vy = (p.pos.y - p.prev.y) * 0.995, vz = (p.pos.z - p.prev.z) * 0.995;
        p.prev.x = p.pos.x; p.prev.y = p.pos.y; p.prev.z = p.pos.z;
        p.pos.x += vx; p.pos.y += vy + g; p.pos.z += vz;
        if (p.extra) { p.pos.x += p.extra.x * dt * dt; p.pos.y += p.extra.y * dt * dt; p.pos.z += p.extra.z * dt * dt; p.extra = null; }
      }
      // the hand pulls grabbed points
      for (const p of this.particles) if (p.grab) {
        p.pos.x += (p.grab.x - p.pos.x) * 0.35; p.pos.y += (p.grab.y - p.pos.y) * 0.35; p.pos.z += (p.grab.z - p.pos.z) * 0.35;
      }
      for (let it = 0; it < this.iterations; it++) {
        for (const s of this.sticks) {
          if (!s.on) continue;
          const a = s.a, b = s.b;
          const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, dz = b.pos.z - a.pos.z;
          const d = Math.hypot(dx, dy, dz) || 1e-6;
          if (s.min && d >= s.len) continue;
          const w = a.inv + b.inv; if (!w) continue;
          const diff = ((d - s.len) / d) * s.stiff;
          const ka = (a.inv / w) * diff, kb = (b.inv / w) * diff;
          a.pos.x += dx * ka; a.pos.y += dy * ka; a.pos.z += dz * ka;
          b.pos.x -= dx * kb; b.pos.y -= dy * kb; b.pos.z -= dz * kb;
        }
        this.collideProps(it === 0, dt);
        for (const p of all) this.walls(p, it === this.iterations - 1, dt);
      }
      for (const pr of this.props) pr.life -= dt;
      this.props = this.props.filter((pr) => pr.life > 0);
    }

    // keep everything inside the room; bounce and slide on the floor
    walls(p, last, dt) {
      const R = this.room;
      const bounce = p.bounce != null ? p.bounce : 0.35, fric = p.friction != null ? p.friction : 0.82;
      p.onFloor = false;
      const hit = (axis, limit, sign) => {
        const over = sign > 0 ? p.pos[axis] + p.r - limit : limit - (p.pos[axis] - p.r);
        if (over <= 0) return;
        const v = p.pos[axis] - p.prev[axis];
        p.pos[axis] -= sign * over;
        if (last) {
          const speed = Math.abs(v) / dt;
          p.prev[axis] = p.pos[axis] + v * bounce;
          // friction on the other two axes
          for (const o of ['x', 'y', 'z']) if (o !== axis) p.prev[o] = p.pos[o] - (p.pos[o] - p.prev[o]) * fric;
          if (speed > 3 && this.onImpact) this.onImpact(p, speed, null, { x: axis === 'x' ? -sign : 0, y: axis === 'y' ? -sign : 0, z: axis === 'z' ? -sign : 0 });
        }
        if (axis === 'y' && sign < 0) p.onFloor = true;
      };
      hit('y', 0, -1);
      hit('y', R.h, 1);
      hit('x', -R.w, -1); hit('x', R.w, 1);
      hit('z', -R.d, -1); hit('z', R.d, 1);
    }

    // heavy props against the ragdoll
    collideProps(report, dt) {
      for (const pr of this.props) {
        const q = pr.p;
        for (const p of this.particles) {
          const dx = p.pos.x - q.pos.x, dy = p.pos.y - q.pos.y, dz = p.pos.z - q.pos.z;
          const d = Math.hypot(dx, dy, dz), min = p.r + q.r;
          if (d >= min || d < 1e-6) continue;
          const n = { x: dx / d, y: dy / d, z: dz / d };
          const over = min - d, w = p.inv + q.inv;
          const relV = V.dot(V.sub(q.vel(dt), p.vel(dt)), n);
          p.pos.x += n.x * over * (p.inv / w); p.pos.y += n.y * over * (p.inv / w); p.pos.z += n.z * over * (p.inv / w);
          q.pos.x -= n.x * over * (q.inv / w); q.pos.y -= n.y * over * (q.inv / w); q.pos.z -= n.z * over * (q.inv / w);
          if (report && relV > 1.5 && this.onImpact) {
            if (!pr.hitAt || pr.hitAt[p.name] == null || pr.age - pr.hitAt[p.name] > 0.25) {
              pr.hitAt = pr.hitAt || {}; pr.hitAt[p.name] = pr.age || 0;
              this.onImpact(p, relV * Math.min(4, q.mass / 6), pr, n);
            }
          }
        }
      }
      for (const pr of this.props) pr.age = (pr.age || 0) + dt / this.iterations;
    }

    addProp(kind, pos, r, mass, vel, life, dt) {
      const p = new Particle(kind, pos.x, pos.y, pos.z, r, mass);
      p.bounce = 0.15; p.friction = 0.6;
      if (vel) p.setVel(vel, dt);
      const pr = { p, kind, life: life || 6, age: 0 };
      this.props.push(pr);
      return pr;
    }
  }

  RC.Particle = Particle;
  RC.World = World;
})(typeof window !== 'undefined' ? window : globalThis);
