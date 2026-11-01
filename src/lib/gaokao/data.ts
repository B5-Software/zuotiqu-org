import { indexSchema, provinceYearSchema, validateSemantics, type ProvinceIndex, type ProvinceYearData } from './schema';

const cache = new Map<string, Promise<ProvinceYearData>>();

export async function loadIndex(): Promise<ProvinceIndex> {
  const res = await fetch('/data/gaokao/index.json');
  if (!res.ok) throw new Error('无法加载数据索引');
  return indexSchema.parse(await res.json());
}

export function loadYear(province: string, year: number): Promise<ProvinceYearData> {
  const key = `${province}/${year}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = fetch(`/data/gaokao/${province}/${year}.json`).then(async (res) => {
      if (!res.ok) throw new Error(`${province} ${year} 年的数据尚未收录`);
      const data = provinceYearSchema.parse(await res.json());
      const errors = validateSemantics(data);
      if (errors.length) throw new Error(`数据校验失败：${errors[0]}`);
      return data;
    });
    cache.set(key, pending);
  }
  return pending;
}

export async function loadYears(province: string, years: number[]): Promise<ProvinceYearData[]> {
  const settled = await Promise.allSettled(years.map((y) => loadYear(province, y)));
  return settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
}
