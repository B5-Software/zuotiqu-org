import { describe, expect, it } from 'vitest';
import { achievements } from '../data/restart/achievements';
import { endings } from '../data/restart/endings';
import { events } from '../data/restart/events';
import { talents } from '../data/restart/talents';
import {
  ALLOC_MAX,
  ALLOC_MIN,
  ALLOC_TOTAL,
  DEFAULT_ALLOC,
  TALENT_PICK,
  TALENT_POOL_SIZE,
  allocationError,
  createLifeWith,
  drawPool,
  previewProps,
  randomAllocation,
  talentPickError,
  type LifeData,
} from '../src/lib/restart/engine';
import { PROPS } from '../src/lib/restart/types';
import { createRng } from '../src/lib/rng';

const data: LifeData = { talents, events, endings, achievements };

function findExcludingPair(): [string, string] {
  for (const t of talents) {
    for (const other of t.excludes ?? []) return [t.id, other];
  }
  throw new Error('数据中没有互斥天赋');
}

function findCompatibleTriple(): string[] {
  const rng = createRng(11);
  const pool = drawPool(talents, rng, talents.length);
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      for (let k = j + 1; k < pool.length; k++) {
        const ids = [pool[i].id, pool[j].id, pool[k].id];
        if (talentPickError(ids, data) === null) return ids;
      }
    }
  }
  throw new Error('找不到两两相容的三个天赋');
}

describe('开局天赋选择', () => {
  it('天赋池不重复，大小为配置值', () => {
    const pool = drawPool(talents, createRng(3));
    expect(pool.length).toBe(TALENT_POOL_SIZE);
    expect(new Set(pool.map((t) => t.id)).size).toBe(pool.length);
  });

  it('必须恰好选 3 个天赋', () => {
    const ids = findCompatibleTriple();
    expect(talentPickError(ids.slice(0, 2), data)).toBeTruthy();
    expect(talentPickError([...ids, ids[0]], data)).toBeTruthy();
    expect(talentPickError(ids, data)).toBeNull();
  });

  it('互斥的天赋不能同时选择', () => {
    const [a, b] = findExcludingPair();
    const third = talents.find((t) => t.id !== a && t.id !== b && !(t.excludes ?? []).includes(a) && !(t.excludes ?? []).includes(b));
    expect(third).toBeTruthy();
    expect(talentPickError([a, b, third!.id], data)).toMatch(/互斥/);
  });

  it('未知天赋与重复选择都会报错', () => {
    const ids = findCompatibleTriple();
    expect(talentPickError(['no_such_talent', ids[1], ids[2]], data)).toMatch(/未知天赋/);
    expect(talentPickError([ids[0], ids[0], ids[1]], data)).toMatch(/重复/);
  });
});

describe('属性分配', () => {
  it('默认分配的总和等于固定总点数，且每项在范围内', () => {
    expect(allocationError(DEFAULT_ALLOC)).toBeNull();
    expect(PROPS.reduce((s, k) => s + DEFAULT_ALLOC[k], 0)).toBe(ALLOC_TOTAL);
  });

  it('总和不等于固定值或某项越界都会报错', () => {
    const bump = { ...DEFAULT_ALLOC, grade: DEFAULT_ALLOC.grade + 5 };
    expect(allocationError(bump)).toMatch(/之和应为/);
    const over = { ...DEFAULT_ALLOC, grade: ALLOC_MAX + 5, health: DEFAULT_ALLOC.health - 5 };
    expect(allocationError(over)).toMatch(/之间/);
    const under = { ...DEFAULT_ALLOC, joy: ALLOC_MIN - 5, juan: DEFAULT_ALLOC.juan + 5 };
    expect(allocationError(under)).toMatch(/之间/);
  });

  it('随机分配的结果总和正确且在范围内', () => {
    const rng = createRng(21);
    for (let i = 0; i < 500; i++) {
      expect(allocationError(randomAllocation(rng))).toBeNull();
    }
  });

  it('按选择开局：属性 = 分配 + 天赋效果，并应用天赋联动', () => {
    const ids = findCompatibleTriple();
    const alloc = { ...DEFAULT_ALLOC };
    const state = createLifeWith(data, { talents: ids, allocation: alloc });
    expect(state.talents).toEqual(ids);
    const preview = previewProps(data, ids, alloc);
    for (const k of PROPS) {
      expect(state.props[k]).toBeCloseTo(preview[k], 6);
    }
  });

  it('非法选择不能开局', () => {
    const ids = findCompatibleTriple();
    expect(() => createLifeWith(data, { talents: ids.slice(0, 2), allocation: DEFAULT_ALLOC })).toThrow();
    expect(() =>
      createLifeWith(data, { talents: ids, allocation: { ...DEFAULT_ALLOC, grade: DEFAULT_ALLOC.grade + 10 } }),
    ).toThrow();
  });

  it('选择数量常量与界面一致', () => {
    expect(TALENT_PICK).toBe(3);
    expect(ALLOC_TOTAL).toBe(300);
  });
});
