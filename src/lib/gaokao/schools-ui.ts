import { escapeHtml } from '../html';
import { loadIndex, loadYears } from './data';
import type { AdmissionGroup, ProvinceYearData, School } from './schema';

interface SchoolView {
  school: School;
  years: Map<number, AdmissionGroup[]>;
}

function $<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function groupKey(g: AdmissionGroup): string {
  return `${g.group}|${g.track ?? ''}|${g.batch}`;
}

function buildViews(years: ProvinceYearData[]): SchoolView[] {
  const views = new Map<string, SchoolView>();
  for (const y of years) {
    for (const s of y.schools) {
      if (!views.has(s.code)) views.set(s.code, { school: s, years: new Map() });
      const view = views.get(s.code)!;
      view.school = s;
    }
    for (const g of y.groups) {
      const view = views.get(g.schoolCode);
      if (!view) continue;
      const list = view.years.get(y.meta.year) ?? [];
      list.push(g);
      view.years.set(y.meta.year, list);
    }
  }
  return [...views.values()].sort((a, b) => a.school.name.localeCompare(b.school.name, 'zh-Hans-CN'));
}

function trendTable(view: SchoolView, yearList: number[]): string {
  const keys = new Map<string, Map<number, AdmissionGroup>>();
  for (const year of yearList) {
    for (const g of view.years.get(year) ?? []) {
      const k = groupKey(g);
      const m = keys.get(k) ?? new Map<number, AdmissionGroup>();
      m.set(year, g);
      keys.set(k, m);
    }
  }
  if (keys.size === 0) return '<p class="muted">暂无这所学校的专业组数据。</p>';
  const head = yearList.map((y) => `<th scope="col">${y} 年 最低分 / 位次</th>`).join('');
  const rows = [...keys.entries()]
    .map(([, byYear]) => {
      const sample = [...byYear.values()][0];
      const label = `${sample.group}${sample.track ? ` · ${sample.track}` : ''} · ${sample.batch}`;
      const cells = yearList
        .map((y) => {
          const g = byYear.get(y);
          return `<td>${g ? `${g.minScore} / ${g.minRank}` : '—'}</td>`;
        })
        .join('');
      return `<tr><th scope="row">${escapeHtml(label)}</th>${cells}</tr>`;
    })
    .join('');
  return `<div class="table-wrap"><table class="trend"><thead><tr><th scope="col">专业组</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="muted small">位次越小越靠前。分数与位次来自各年的一分一段表换算，仅供参考。</p>`;
}

export function mountSchools(): void {
  const province = $<HTMLSelectElement>('s-province');
  const level = $<HTMLSelectElement>('s-level');
  const region = $<HTMLSelectElement>('s-region');
  const keyword = $<HTMLInputElement>('s-keyword');
  const list = $<HTMLElement>('s-list');
  const count = $<HTMLElement>('s-count');
  const banner = $<HTMLElement>('s-banner');
  const status = $<HTMLElement>('s-status');
  if (!province || !level || !region || !keyword || !list || !count) return;

  let views: SchoolView[] = [];
  let years: number[] = [];
  let demo = false;
  let token = 0;

  const render = () => {
    const kw = keyword.value.trim();
    const lv = level.value;
    const rg = region.value;
    const filtered = views.filter(
      (v) =>
        (!lv || v.school.level === lv) &&
        (!rg || v.school.region === rg) &&
        (!kw || v.school.name.includes(kw)),
    );
    count.textContent = `共 ${filtered.length} 所`;
    list.innerHTML = filtered.length
      ? filtered
          .map(
            (v) => `
        <li class="school">
          <div class="school-head">
            <strong>${escapeHtml(v.school.name)}</strong>
            <span class="tag">${escapeHtml(v.school.level)}</span>
            <span class="muted small">${escapeHtml(v.school.type)} · ${escapeHtml(v.school.region)}</span>
          </div>
          <details>
            <summary>查看近几年分数线</summary>
            ${trendTable(v, years)}
          </details>
        </li>`,
          )
          .join('')
      : '<li class="muted">没有符合条件的院校。</li>';
  };

  const fillFilters = () => {
    const levels = [...new Set(views.map((v) => v.school.level))];
    level.innerHTML = '<option value="">全部层次</option>' + levels.map((l) => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
    const regions = [...new Set(views.map((v) => v.school.region))].sort();
    region.innerHTML = '<option value="">全部地区</option>' + regions.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
  };

  const loadProvince = async (id: string) => {
    const current = ++token;
    const meta = (await loadIndex()).find((p) => p.province === id);
    if (!meta) return;
    if (status) status.textContent = '正在读取数据…';
    const data = await loadYears(meta.province, meta.years);
    if (current !== token) return;
    years = [...meta.years].sort((a, b) => a - b);
    demo = meta.demo;
    views = buildViews(data);
    fillFilters();
    if (banner) banner.hidden = !demo;
    if (status) status.textContent = data.length ? '' : '该省份暂无可用数据。';
    render();
  };

  loadIndex()
    .then((index) => {
      province.innerHTML = index
        .map((p) => `<option value="${escapeHtml(p.province)}">${escapeHtml(p.provinceName)}${p.demo ? '（演示）' : ''}</option>`)
        .join('');
      return loadProvince(index[0]?.province ?? '');
    })
    .catch(() => {
      if (status) status.textContent = '数据索引加载失败，请刷新页面重试。';
    });

  province.addEventListener('change', () => void loadProvince(province.value));
  level.addEventListener('change', render);
  region.addEventListener('change', render);
  keyword.addEventListener('input', render);
}
