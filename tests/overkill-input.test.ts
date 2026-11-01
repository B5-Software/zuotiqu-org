import { describe, expect, it } from 'vitest';
import { generateFromInput, randomValuesFor, validateValues } from '../src/lib/overkill/engine';
import { TEMPLATES } from '../src/lib/overkill/templates';
import { createRng } from '../src/lib/rng';

describe('用户输入参数生成解题', () => {
  it('一元一次方程：按输入的 a、b、c 求解', () => {
    const r = generateFromInput('linear', { a: 2, b: 3, c: 11 }, createRng(1));
    expect(r.statement).toBe('解方程 $2x+3=11$');
    expect(r.answer).toBe('$x=4$');
    expect(r.solutions).toHaveLength(3);
  });

  it('一元一次方程：系数为 0 时报错', () => {
    expect(() => generateFromInput('linear', { a: 0, b: 3, c: 11 })).toThrow(/不能为 0/);
  });

  it('最大公约数：按输入的两个数计算', () => {
    const r = generateFromInput('gcd', { a: 36, b: 24 }, createRng(2));
    expect(r.answer).toBe('$12$');
    expect(r.statement).toBe('求 $36$ 与 $24$ 的最大公约数。');
  });

  it('鸡兔同笼：头数与腿数对得上时给出结果', () => {
    const r = generateFromInput('chicken-rabbit', { heads: 10, legs: 28 }, createRng(3));
    expect(r.answer).toBe('兔 $4$ 只，鸡 $6$ 只');
  });

  it('鸡兔同笼：腿数为奇数或不合理时报错', () => {
    expect(() => generateFromInput('chicken-rabbit', { heads: 10, legs: 27 })).toThrow(/偶数/);
    expect(() => generateFromInput('chicken-rabbit', { heads: 10, legs: 50 })).toThrow(/最多 4 条腿/);
  });

  it('三角形内角和：两角之和不小于 180 时报错', () => {
    expect(() => generateFromInput('triangle-angles', { a: 100, b: 80 })).toThrow(/小于 180/);
    const r = generateFromInput('triangle-angles', { a: 60, b: 70 }, createRng(4));
    expect(r.answer).toBe('$50^\\circ$');
  });

  it('两点间距离：两点重合时报错', () => {
    expect(() => generateFromInput('shortest-path', { x1: 1, y1: 1, x2: 1, y2: 1 })).toThrow(/重合/);
  });

  it('缺少参数或超出范围时给出中文提示', () => {
    const tpl = TEMPLATES.find((t) => t.id === 'linear')!;
    expect(validateValues(tpl, { a: 2, b: 3 })).toMatch(/请填写/);
    expect(validateValues(tpl, { a: 500, b: 3, c: 11 })).toMatch(/应在/);
    expect(validateValues(tpl, { a: 2.5, b: 3, c: 11 })).toMatch(/整数/);
  });

  it('每个模板的默认随机参数都能直接求解', () => {
    for (const t of TEMPLATES) {
      const values = randomValuesFor(t.id, createRng(9));
      expect(validateValues(t, values)).toBeNull();
      expect(() => generateFromInput(t.id, values, createRng(9))).not.toThrow();
    }
  });
});
