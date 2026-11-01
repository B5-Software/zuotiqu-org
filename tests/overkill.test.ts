import { describe, expect, it } from 'vitest';
import { generateOverkill, listTemplates, RATINGS } from '../src/lib/overkill/engine';
import { TEMPLATES } from '../src/lib/overkill/templates';
import { createRng } from '../src/lib/rng';

const RUNS = 1000;

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

describe('超纲解法模板', () => {
  it('每个题型至少有 3 种解法，且步骤非空', () => {
    for (const t of TEMPLATES) {
      const rng = createRng(1);
      const result = generateOverkill(t.id, rng);
      expect(result.solutions.length).toBeGreaterThanOrEqual(3);
      for (const s of result.solutions) {
        expect(s.steps.length).toBeGreaterThan(0);
        expect(s.title.length).toBeGreaterThan(0);
      }
    }
  });

  it('每个题型随机跑 1000 次，标准答案函数零异常', () => {
    for (const t of TEMPLATES) {
      const rng = createRng(20260101);
      for (let i = 0; i < RUNS; i++) {
        const result = generateOverkill(t.id, rng);
        const text = [result.statement, result.answer, ...result.solutions.flatMap((s) => s.steps)].join('\n');
        expect(text).not.toMatch(/undefined|NaN|Infinity/);
        expect(result.statement).toMatch(/\$/);
        expect(result.answer).toMatch(/\$/);
      }
    }
  });

  it('评级与解法档位一致', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const result = generateOverkill(null, rng);
      expect(result.rating).toBe(RATINGS[result.tier]);
      expect(result.tier).toBe(Math.max(...result.solutions.map((s) => s.tier)));
    }
  });

  it('列出的题型与模板一一对应', () => {
    const list = listTemplates();
    expect(list.length).toBe(TEMPLATES.length);
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(new Set(list.map((t) => t.id)).size).toBe(list.length);
  });

  it('未知题型抛出错误', () => {
    expect(() => generateOverkill('nope', createRng(1))).toThrow();
  });
});

describe('标准答案校验', () => {
  it('一元一次方程：代入解应满足原方程', () => {
    const rng = createRng(11);
    for (let i = 0; i < RUNS; i++) {
      const r = generateOverkill('linear', rng);
      const m = r.statement.match(/\$(-?\d+)x([+-]\d+)=(-?\d+)\$/);
      const ans = r.answer.match(/\$x=(-?\d+)\$/);
      expect(m && ans).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      const c = Number(m![3]);
      const x = Number(ans![1]);
      expect(a * x + b).toBe(c);
    }
  });

  it('最大公约数：答案整除两数且与独立计算一致', () => {
    const rng = createRng(12);
    for (let i = 0; i < RUNS; i++) {
      const r = generateOverkill('gcd', rng);
      const m = r.statement.match(/\$(\d+)\$ 与 \$(\d+)\$/);
      const ans = r.answer.match(/\$(\d+)\$/);
      expect(m && ans).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      const g = Number(ans![1]);
      expect(a % g).toBe(0);
      expect(b % g).toBe(0);
      expect(g).toBe(gcd(a, b));
    }
  });

  it('1+1：答案为两数之和', () => {
    const rng = createRng(13);
    for (let i = 0; i < RUNS; i++) {
      const r = generateOverkill('addition', rng);
      const m = r.statement.match(/\$(\d+)\+(\d+)\$/);
      const ans = r.answer.match(/\$(\d+)\$/);
      expect(Number(ans![1])).toBe(Number(m![1]) + Number(m![2]));
    }
  });

  it('鸡兔同笼：代入结果满足头数与腿数', () => {
    const rng = createRng(14);
    for (let i = 0; i < RUNS; i++) {
      const r = generateOverkill('chicken-rabbit', rng);
      const m = r.statement.match(/\$(\d+)\$ 个头、\$(\d+)\$ 条腿/);
      const ans = r.answer.match(/兔 \$(\d+)\$ 只，鸡 \$(\d+)\$ 只/);
      const heads = Number(m![1]);
      const legs = Number(m![2]);
      const rabbit = Number(ans![1]);
      const chicken = Number(ans![2]);
      expect(chicken + rabbit).toBe(heads);
      expect(2 * chicken + 4 * rabbit).toBe(legs);
    }
  });

  it('三角形内角和：第三角与两已知角之和为 180', () => {
    const rng = createRng(15);
    for (let i = 0; i < RUNS; i++) {
      const r = generateOverkill('triangle-angles', rng);
      const m = r.statement.match(/\$(\d+)\^\\circ\$ 和 \$(\d+)\^\\circ\$/);
      const ans = r.answer.match(/\$(\d+)\^\\circ\$/);
      expect(Number(m![1]) + Number(m![2]) + Number(ans![1])).toBe(180);
    }
  });
});
