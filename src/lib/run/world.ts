import type { Rng } from '../rng';

export const VIEW = { W: 960, H: 400, GROUND: 340 } as const;
export const PLAYER = { x: 160, w: 30, standH: 72, duckH: 36 } as const;

const GRAVITY = 2600;
const FAST_FALL = 3600;
const JUMP_V = 880;
const GRACE_PX = 900;

export type ObstacleKind = 'homework' | 'alarm' | 'notice' | 'ranking';
export type PickupKind = 'perfect' | 'coffee' | 'draft' | 'lhopital';

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  w: number;
  h: number;
  bottom: number;
}

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  r: number;
}

export interface Input {
  jump: boolean;
  duck: boolean;
}

export type WorldEvent =
  | { type: 'jump' }
  | { type: 'pickup'; kind: PickupKind }
  | { type: 'shield' }
  | { type: 'hit'; kind: ObstacleKind };

export interface Player {
  bottom: number;
  vy: number;
  onGround: boolean;
  ducking: boolean;
}

export interface World {
  t: number;
  status: 'running' | 'over';
  player: Player;
  obstacles: Obstacle[];
  pickups: Pickup[];
  distance: number;
  bonus: number;
  score: number;
  speed: number;
  shield: boolean;
  invincibleUntil: number;
  caffeineUntil: number;
  cheerUntil: number;
  nextSpawnAt: number;
  nextId: number;
  rng: Rng;
  deadBy: ObstacleKind | null;
  events: WorldEvent[];
  collected: Record<PickupKind, number>;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const OBSTACLE_SHAPE: Record<ObstacleKind, { w: number; h: number; bottom: number; weight: number }> = {
  homework: { w: 62, h: 44, bottom: 0, weight: 35 },
  alarm: { w: 40, h: 40, bottom: 0, weight: 25 },
  notice: { w: 84, h: 30, bottom: 44, weight: 20 },
  ranking: { w: 42, h: 100, bottom: 0, weight: 20 },
};

const PICKUP_SHAPE: Record<PickupKind, { weight: number; yMin: number; yMax: number }> = {
  perfect: { weight: 50, yMin: 70, yMax: 130 },
  coffee: { weight: 20, yMin: 50, yMax: 90 },
  draft: { weight: 20, yMin: 60, yMax: 120 },
  lhopital: { weight: 10, yMin: 50, yMax: 110 },
};

export function difficulty(score: number): number {
  return 1 - Math.exp(-score / 600);
}

export function speedFor(score: number, boosted: boolean): number {
  const base = 340 + 540 * difficulty(score);
  return boosted ? base * 1.25 : base;
}

export function spawnGapSeconds(score: number): number {
  return 1.25 - 0.6 * difficulty(score);
}

export function createWorld(rng: Rng): World {
  return {
    t: 0,
    status: 'running',
    player: { bottom: 0, vy: 0, onGround: true, ducking: false },
    obstacles: [],
    pickups: [],
    distance: 0,
    bonus: 0,
    score: 0,
    speed: speedFor(0, false),
    shield: false,
    invincibleUntil: 0,
    caffeineUntil: 0,
    cheerUntil: 0,
    nextSpawnAt: GRACE_PX,
    nextId: 1,
    rng,
    deadBy: null,
    events: [],
    collected: { perfect: 0, coffee: 0, draft: 0, lhopital: 0 },
  };
}

export function playerRect(p: Player): Rect {
  const h = p.ducking ? PLAYER.duckH : PLAYER.standH;
  return { x: PLAYER.x + 4, y: VIEW.GROUND - p.bottom - h + 3, w: PLAYER.w - 8, h: h - 6 };
}

export function obstacleRect(o: Obstacle): Rect {
  return { x: o.x, y: VIEW.GROUND - o.bottom - o.h, w: o.w, h: o.h };
}

export function pickupRect(p: Pickup): Rect {
  return { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pickWeighted<K extends string>(
  table: Record<K, { weight: number }>,
  rng: Rng,
): K {
  const entries = Object.entries(table) as Array<[K, { weight: number }]>;
  const total = entries.reduce((s, [, v]) => s + v.weight, 0);
  let r = rng() * total;
  for (const [key, v] of entries) {
    r -= v.weight;
    if (r < 0) return key;
  }
  return entries[entries.length - 1][0];
}

function spawn(w: World): void {
  const gapPx = Math.max(w.speed * spawnGapSeconds(w.score), 260);
  const x = VIEW.W + 20;
  if (w.rng() < 0.3) {
    const kind = pickWeighted(PICKUP_SHAPE, w.rng);
    const shape = PICKUP_SHAPE[kind];
    const bottom = shape.yMin + w.rng() * (shape.yMax - shape.yMin);
    w.pickups.push({ id: w.nextId++, kind, x, y: VIEW.GROUND - bottom, r: 16 });
  } else {
    const kind = pickWeighted(OBSTACLE_SHAPE, w.rng);
    const s = OBSTACLE_SHAPE[kind];
    w.obstacles.push({ id: w.nextId++, kind, x, w: s.w, h: s.h, bottom: s.bottom });
  }
  w.nextSpawnAt = w.distance + gapPx * (0.85 + 0.3 * w.rng());
}

function collect(w: World, kind: PickupKind): void {
  w.collected[kind]++;
  w.events.push({ type: 'pickup', kind });
  if (kind === 'perfect') {
    w.bonus += 30;
    w.cheerUntil = w.t + 0.6;
  } else if (kind === 'coffee') {
    w.caffeineUntil = w.t + 5;
  } else if (kind === 'draft') {
    if (w.shield) {
      w.bonus += 10;
    } else {
      w.shield = true;
    }
  } else {
    w.invincibleUntil = w.t + 6;
  }
}

export function step(w: World, input: Input, dt: number): void {
  w.events = [];
  if (w.status !== 'running') return;

  w.t += dt;
  const boosted = w.t < w.invincibleUntil;
  w.speed = speedFor(w.score, boosted);
  const move = w.speed * dt;
  w.distance += move;

  const p = w.player;
  if (input.jump && p.onGround) {
    p.vy = JUMP_V * (w.t < w.caffeineUntil ? 1.15 : 1);
    p.onGround = false;
    w.events.push({ type: 'jump' });
  }
  p.ducking = input.duck && p.onGround;
  if (!p.onGround) {
    const g = input.duck ? FAST_FALL : GRAVITY;
    p.vy -= g * dt;
    p.bottom += p.vy * dt;
    if (p.bottom <= 0) {
      p.bottom = 0;
      p.vy = 0;
      p.onGround = true;
    }
  }

  for (const o of w.obstacles) o.x -= move;
  for (const pk of w.pickups) pk.x -= move;
  w.obstacles = w.obstacles.filter((o) => o.x + o.w > -20);
  w.pickups = w.pickups.filter((pk) => pk.x > -40);

  if (w.distance >= w.nextSpawnAt) spawn(w);

  const pr = playerRect(p);
  const taken = new Set<number>();
  for (const pk of w.pickups) {
    if (overlaps(pr, pickupRect(pk))) {
      taken.add(pk.id);
      collect(w, pk.kind);
    }
  }
  if (taken.size) w.pickups = w.pickups.filter((pk) => !taken.has(pk.id));

  const consumed = new Set<number>();
  for (const o of w.obstacles) {
    if (!overlaps(pr, obstacleRect(o))) continue;
    if (w.t < w.invincibleUntil) continue;
    if (w.shield) {
      w.shield = false;
      consumed.add(o.id);
      w.events.push({ type: 'shield' });
      continue;
    }
    w.status = 'over';
    w.deadBy = o.kind;
    w.events.push({ type: 'hit', kind: o.kind });
    break;
  }
  if (consumed.size) w.obstacles = w.obstacles.filter((o) => !consumed.has(o.id));

  w.score = Math.floor(w.distance / 20) + w.bonus;
}
