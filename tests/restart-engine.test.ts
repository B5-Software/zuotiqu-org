import { describe, expect, it } from 'vitest';
import { achievements } from '../data/restart/achievements';
import { endings } from '../data/restart/endings';
import { events } from '../data/restart/events';
import { talents } from '../data/restart/talents';
import { applyChoice, createLife, MAX_AGE, runLife, type LifeData } from '../src/lib/restart/engine';
import { PROPS } from '../src/lib/restart/types';
import { createRng } from '../src/lib/rng';

const data: LifeData = { talents, events, endings, achievements };

describe('人生重开引擎', () => {
  it('蒙特卡洛 10000 局：无崩溃、无死循环、属性不越界、每局都有结局', () => {
    const rng = createRng(20260101);
    const reached = new Map<string, number>();
    let longLives = 0;
    for (let i = 0; i < 10000; i++) {
      const result = runLife(data, rng);
      expect(result.state.age).toBeLessThanOrEqual(MAX_AGE);
      for (const k of PROPS) {
        expect(result.state.props[k]).toBeGreaterThanOrEqual(0);
        expect(result.state.props[k]).toBeLessThanOrEqual(100);
      }
      reached.set(result.ending.id, (reached.get(result.ending.id) ?? 0) + 1);
      if (result.state.age >= 60) longLives++;
    }
    expect(reached.size).toBeGreaterThanOrEqual(5);
    expect(longLives).toBeGreaterThan(0);
  }, 120000);

  it('同一个种子得到完全相同的人生', () => {
    const a = runLife(data, createRng(99));
    const b = runLife(data, createRng(99));
    expect(a.ending.id).toBe(b.ending.id);
    expect(a.state.log.map((l) => l.title)).toEqual(b.state.log.map((l) => l.title));
    expect(a.state.curve).toEqual(b.state.curve);
  });

  it('开局抽到的天赋互不排斥', () => {
    const rng = createRng(5);
    for (let i = 0; i < 500; i++) {
      const state = createLife(data, rng);
      expect(state.talents.length).toBe(3);
      const byId = new Map(talents.map((t) => [t.id, t]));
      for (const id of state.talents) {
        for (const other of state.talents) {
          if (id === other) continue;
          expect(byId.get(id)?.excludes ?? []).not.toContain(other);
        }
      }
    }
  });

  it('无效选项抛出错误', () => {
    const state = createLife(data, createRng(1));
    expect(() => applyChoice(state, events[0], 99)).toThrow();
  });

  it('每个事件的每个选项都能被应用且属性保持在范围内', () => {
    for (const event of events) {
      const state = createLife(data, createRng(3));
      state.age = event.ageMin;
      for (let i = 0; i < event.options.length; i++) {
        applyChoice(state, event, i);
        for (const k of PROPS) {
          expect(state.props[k]).toBeGreaterThanOrEqual(0);
          expect(state.props[k]).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});
