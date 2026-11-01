import { describe, expect, it } from 'vitest';
import { createRng } from '../src/lib/rng';
import {
  createWorld,
  difficulty,
  obstacleRect,
  overlaps,
  PLAYER,
  playerRect,
  speedFor,
  spawnGapSeconds,
  step,
  VIEW,
  type Input,
  type World,
} from '../src/lib/run/world';

const DT = 1 / 60;
const NONE: Input = { jump: false, duck: false };

function run(w: World, frames: number, input: (w: World) => Input = () => NONE): void {
  for (let i = 0; i < frames && w.status === 'running'; i++) step(w, input(w), DT);
}

function placeObstacle(w: World, kind: 'homework' | 'alarm' | 'notice' | 'ranking', x: number): void {
  const shape = kind === 'notice' ? { w: 84, h: 30, bottom: 44 } : kind === 'ranking' ? { w: 42, h: 100, bottom: 0 } : { w: 50, h: 40, bottom: 0 };
  w.obstacles.push({ id: 9999, kind, x, ...shape });
}

function autoBot(world: World): Input {
  let duck = false;
  let jump = false;
  for (const o of world.obstacles) {
    if (o.kind === 'notice') {
      if (o.x > PLAYER.x - 90 && o.x < PLAYER.x + 120) duck = true;
    } else if (o.x > PLAYER.x + 80 && o.x <= PLAYER.x + 120 && world.player.onGround) {
      jump = true;
    }
  }
  return { jump: jump && !duck, duck: duck && world.player.onGround };
}

describe('碰撞判定', () => {
  it('边缘接触不算碰撞，重叠才算', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(overlaps(a, { x: 10, y: 0, w: 5, h: 5 })).toBe(false);
    expect(overlaps(a, { x: 9, y: 0, w: 5, h: 5 })).toBe(true);
  });

  it('蹲下时的碰撞框比站立时矮', () => {
    const w = createWorld(createRng(1));
    const standing = playerRect(w.player);
    w.player.ducking = true;
    const ducking = playerRect(w.player);
    expect(ducking.h).toBeLessThan(standing.h);
    expect(ducking.y + ducking.h).toBeCloseTo(standing.y + standing.h, 5);
  });

  it('站立角色会撞上"家长群通知"，蹲下可以穿过', () => {
    const w = createWorld(createRng(2));
    placeObstacle(w, 'notice', PLAYER.x - 20);
    const notice = obstacleRect(w.obstacles[0]);
    expect(overlaps(playerRect(w.player), notice)).toBe(true);
    w.player.ducking = true;
    expect(overlaps(playerRect(w.player), notice)).toBe(false);
  });
});

describe('跳跃物理', () => {
  it('起跳后会回到地面，且最高点在合理范围内', () => {
    const w = createWorld(createRng(3));
    step(w, { jump: true, duck: false }, DT);
    let apex = 0;
    for (let i = 0; i < 300 && !w.player.onGround; i++) {
      step(w, NONE, DT);
      apex = Math.max(apex, w.player.bottom);
    }
    expect(w.player.onGround).toBe(true);
    expect(w.player.bottom).toBe(0);
    expect(apex).toBeGreaterThan(120);
    expect(apex).toBeLessThan(170);
  });

  it('空中下压会快速落地', () => {
    const normal = createWorld(createRng(4));
    const fast = createWorld(createRng(4));
    step(normal, { jump: true, duck: false }, DT);
    step(fast, { jump: true, duck: false }, DT);
    let normalFrames = 0;
    let fastFrames = 0;
    while (!normal.player.onGround && normalFrames < 500) {
      step(normal, NONE, DT);
      normalFrames++;
    }
    while (!fast.player.onGround && fastFrames < 500) {
      step(fast, { jump: false, duck: true }, DT);
      fastFrames++;
    }
    expect(fastFrames).toBeLessThan(normalFrames);
  });
});

describe('死亡、护盾与无敌', () => {
  it('撞上障碍物游戏结束并记录原因', () => {
    const w = createWorld(createRng(5));
    placeObstacle(w, 'homework', PLAYER.x);
    step(w, NONE, DT);
    expect(w.status).toBe('over');
    expect(w.deadBy).toBe('homework');
  });

  it('草稿纸护盾可以抵消一次碰撞', () => {
    const w = createWorld(createRng(6));
    w.shield = true;
    placeObstacle(w, 'homework', PLAYER.x);
    step(w, NONE, DT);
    expect(w.status).toBe('running');
    expect(w.shield).toBe(false);
    expect(w.obstacles.length).toBe(0);
    expect(w.events.some((e) => e.type === 'shield')).toBe(true);
  });

  it('洛必达期间无敌，可以穿过障碍物', () => {
    const w = createWorld(createRng(7));
    w.invincibleUntil = 10;
    placeObstacle(w, 'alarm', PLAYER.x);
    run(w, 30);
    expect(w.status).toBe('running');
  });

  it('收集满分卷增加卷度奖励并触发得意姿态', () => {
    const w = createWorld(createRng(8));
    w.pickups.push({ id: 1, kind: 'perfect', x: PLAYER.x + 10, y: VIEW.GROUND - 40, r: 16 });
    step(w, NONE, DT);
    expect(w.collected.perfect).toBe(1);
    expect(w.bonus).toBe(30);
    expect(w.cheerUntil).toBeGreaterThan(w.t);
  });
});

describe('难度曲线', () => {
  it('卷度越高，速度越快、刷新间隔越短，且都有上限', () => {
    let prevSpeed = 0;
    let prevGap = Infinity;
    for (let s = 0; s <= 3000; s += 100) {
      const speed = speedFor(s, false);
      const gap = spawnGapSeconds(s);
      expect(speed).toBeGreaterThanOrEqual(prevSpeed);
      expect(gap).toBeLessThanOrEqual(prevGap);
      prevSpeed = speed;
      prevGap = gap;
    }
    expect(difficulty(10_000)).toBeLessThan(1);
    expect(speedFor(10_000, false)).toBeLessThanOrEqual(340 + 540);
  });

  it('洛必达加速时速度更快', () => {
    expect(speedFor(100, true)).toBeGreaterThan(speedFor(100, false));
  });
});

describe('模拟', () => {
  it('同一个种子在相同输入下结果完全一致', () => {
    const a = createWorld(createRng(42));
    const b = createWorld(createRng(42));
    run(a, 3000, autoBot);
    run(b, 3000, autoBot);
    expect(a.score).toBe(b.score);
    expect(a.deadBy).toBe(b.deadBy);
    expect(a.obstacles.map((o) => o.x)).toEqual(b.obstacles.map((o) => o.x));
  });

  it('简单的自动驾驶能跑出一段距离（说明开局可以通过）', () => {
    const w = createWorld(createRng(77));
    run(w, 60 * 12, autoBot);
    expect(w.t).toBeGreaterThan(8);
  });

  it('长时间运行时实体数量有界，不会内存增长', () => {
    const w = createWorld(createRng(9));
    let peak = 0;
    for (let i = 0; i < 60 * 600; i++) {
      w.invincibleUntil = Infinity;
      step(w, autoBot(w), DT);
      peak = Math.max(peak, w.obstacles.length + w.pickups.length);
    }
    expect(peak).toBeLessThan(30);
    expect(w.status).toBe('running');
  });
});
