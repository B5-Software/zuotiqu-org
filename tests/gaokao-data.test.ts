import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexSchema, provinceYearSchema, validateSemantics } from '../src/lib/gaokao/schema';

const root = join(process.cwd(), 'public', 'data', 'gaokao');
const index = indexSchema.parse(JSON.parse(readFileSync(join(root, 'index.json'), 'utf8')));

describe('录取演示数据', () => {
  it('索引中列出的每个省份、每一年都有合法数据', () => {
    expect(index.length).toBeGreaterThan(0);
    for (const province of index) {
      expect(province.demo).toBe(true);
      for (const year of province.years) {
        const raw = JSON.parse(readFileSync(join(root, province.province, `${year}.json`), 'utf8'));
        const data = provinceYearSchema.parse(raw);
        expect(data.meta.year).toBe(year);
        expect(data.meta.examType).toBe(province.examType);
        expect(data.meta.demo).toBe(true);
        expect(validateSemantics(data)).toEqual([]);
      }
    }
  });

  it('每条专业组记录都带有来源与抓取时间', () => {
    for (const province of index) {
      for (const year of province.years) {
        const data = JSON.parse(readFileSync(join(root, province.province, `${year}.json`), 'utf8'));
        for (const g of data.groups) {
          expect(g.sourceUrl).toBeTruthy();
          expect(g.fetchedAt).toBeTruthy();
        }
      }
    }
  });
});
