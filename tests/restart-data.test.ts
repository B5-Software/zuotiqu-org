import { describe, expect, it } from 'vitest';
import { achievements } from '../data/restart/achievements';
import { endings } from '../data/restart/endings';
import { events } from '../data/restart/events';
import { talents } from '../data/restart/talents';
import { STAGE_AGES, STAGES, type Condition } from '../src/lib/restart/types';

const BUILTIN_FLAGS = new Set(['dead']);

function collect(c: Condition | undefined, out: { flags: Set<string>; talents: Set<string> }): void {
  if (!c) return;
  if ('flag' in c) out.flags.add(c.flag);
  else if ('talent' in c) out.talents.add(c.talent);
  else if ('all' in c) c.all.forEach((x) => collect(x, out));
  else if ('any' in c) c.any.forEach((x) => collect(x, out));
  else if ('not' in c) collect(c.not, out);
}

const talentIds = new Set(talents.map((t) => t.id));
const setFlags = new Set(events.flatMap((e) => e.options.flatMap((o) => o.setFlags ?? [])));

describe('天赋数据', () => {
  it('数量在 30–40 之间', () => {
    expect(talents.length).toBeGreaterThanOrEqual(30);
    expect(talents.length).toBeLessThanOrEqual(40);
  });

  it('id 唯一', () => {
    expect(talentIds.size).toBe(talents.length);
  });

  it('excludes 与 synergies 引用的天赋存在，且互斥关系双向对称', () => {
    const byId = new Map(talents.map((t) => [t.id, t]));
    for (const t of talents) {
      for (const ex of t.excludes ?? []) {
        expect(talentIds.has(ex), `${t.id} excludes unknown ${ex}`).toBe(true);
        expect(byId.get(ex)?.excludes ?? [], `${ex} should exclude ${t.id}`).toContain(t.id);
      }
      for (const syn of t.synergies ?? []) {
        expect(talentIds.has(syn.with), `${t.id} synergy with unknown ${syn.with}`).toBe(true);
      }
    }
  });

  it('联动双向声明，至少 8 组', () => {
    const byId = new Map(talents.map((t) => [t.id, t]));
    const pairs = new Set<string>();
    for (const t of talents) {
      for (const syn of t.synergies ?? []) {
        const back = byId.get(syn.with)?.synergies?.some((s) => s.with === t.id);
        expect(back, `${t.id} <-> ${syn.with} should be declared both ways`).toBe(true);
        pairs.add([t.id, syn.with].sort().join('|'));
      }
    }
    expect(pairs.size).toBeGreaterThanOrEqual(8);
  });

  it('单项开局属性变化绝对值不超过 15', () => {
    for (const t of talents) {
      for (const v of Object.values(t.effects)) {
        expect(Math.abs(v ?? 0), t.id).toBeLessThanOrEqual(15);
      }
    }
  });
});

describe('事件数据', () => {
  it('数量不少于 55', () => {
    expect(events.length).toBeGreaterThanOrEqual(55);
  });

  it('id 唯一，阶段与年龄区间一致', () => {
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
    for (const e of events) {
      const [lo, hi] = STAGE_AGES[e.stage];
      expect(e.ageMin, e.id).toBeLessThanOrEqual(e.ageMax);
      expect(e.ageMin, e.id).toBeGreaterThanOrEqual(lo);
      expect(e.ageMax, e.id).toBeLessThanOrEqual(hi);
      expect(STAGES).toContain(e.stage);
    }
  });

  it('每个阶段至少 4 个事件', () => {
    for (const stage of STAGES) {
      expect(events.filter((e) => e.stage === stage).length, stage).toBeGreaterThanOrEqual(4);
    }
  });

  it('选项 1–3 个，按钮文字不超过 8 个字', () => {
    for (const e of events) {
      expect(e.options.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.options.length, e.id).toBeLessThanOrEqual(3);
      for (const o of e.options) {
        expect([...o.label].length, `${e.id}: ${o.label}`).toBeLessThanOrEqual(8);
        expect(o.outcome.length, e.id).toBeGreaterThan(0);
      }
    }
  });

  it('单项属性变化绝对值不超过 20，权重为正', () => {
    for (const e of events) {
      expect(e.weight, e.id).toBeGreaterThan(0);
      for (const o of e.options) {
        for (const v of Object.values(o.effects ?? {})) {
          expect(Math.abs(v ?? 0), e.id).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it('when 条件引用的天赋存在，引用的 flag 在某处被设置过', () => {
    for (const e of events) {
      const refs = { flags: new Set<string>(), talents: new Set<string>() };
      collect(e.when, refs);
      for (const t of refs.talents) expect(talentIds.has(t), `${e.id} -> ${t}`).toBe(true);
      for (const f of refs.flags) {
        expect(setFlags.has(f) || BUILTIN_FLAGS.has(f), `${e.id} references unset flag ${f}`).toBe(true);
      }
    }
  });

  it('至少 6 个事件有分支记忆，至少 4 个选项跳出评价体系', () => {
    const branching = events.filter((e) => e.options.some((o) => (o.setFlags ?? []).length > 0));
    expect(branching.length).toBeGreaterThanOrEqual(6);
    const offLadder = events.flatMap((e) => e.options).filter((o) => (o.setFlags ?? []).includes('off_ladder'));
    expect(offLadder.length).toBeGreaterThanOrEqual(4);
  });
});

describe('结局与成就', () => {
  it('8–10 个结局，id 唯一', () => {
    expect(endings.length).toBeGreaterThanOrEqual(8);
    expect(endings.length).toBeLessThanOrEqual(10);
    expect(new Set(endings.map((e) => e.id)).size).toBe(endings.length);
  });

  it('存在无条件的兜底结局，且优先级最低', () => {
    const fallback = endings.filter((e) => 'all' in e.when && e.when.all.length === 0);
    expect(fallback.length).toBeGreaterThanOrEqual(1);
    const minPriority = Math.min(...endings.map((e) => e.priority));
    expect(fallback.some((f) => f.priority === minPriority)).toBe(true);
  });

  it('跳出评价体系的结局至少 4 个，且条件引用 off_ladder', () => {
    const escape = endings.filter((e) => e.escape);
    expect(escape.length).toBeGreaterThanOrEqual(4);
    for (const e of escape) {
      const refs = { flags: new Set<string>(), talents: new Set<string>() };
      collect(e.when, refs);
      expect(refs.flags.has('off_ladder'), e.id).toBe(true);
    }
  });

  it('成就 id 唯一，至少 2 个与 off_ladder 相关', () => {
    expect(new Set(achievements.map((a) => a.id)).size).toBe(achievements.length);
    expect(achievements.length).toBeGreaterThanOrEqual(10);
    const related = achievements.filter((a) => {
      const refs = { flags: new Set<string>(), talents: new Set<string>() };
      collect(a.when, refs);
      return refs.flags.has('off_ladder');
    });
    expect(related.length).toBeGreaterThanOrEqual(2);
  });
});
