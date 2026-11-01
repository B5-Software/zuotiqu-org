import { disclaimers } from '../../config/site';
import { escapeHtml } from '../html';
import { renderShareCard } from '../share/card';
import { shareImage } from '../share/share';
import { loadIndex, loadYears } from './data';
import { explain, matchVolunteers, type Judgement, type MatchResult, type StudentInput, type Tier } from './match';
import type { StudentChoice } from './requirements';
import { validateChoice } from './requirements';
import {
  NEW_3_1_2_OPTIONAL,
  NEW_3_3_SUBJECTS,
  type ExamType,
  type FirstSubject,
  type ProvinceIndex,
  type ProvinceYearData,
  type SubjectRequirement,
  type Track,
} from './schema';

const TIER_ORDER: Tier[] = ['冲', '稳', '保'];
const TIER_HINT: Record<Tier, string> = {
  冲: '位次略低于往年最低位次，有一定风险',
  稳: '位次与往年最低位次接近',
  保: '位次明显高于往年最低位次',
};

function $<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function reqText(req: SubjectRequirement): string {
  const parts: string[] = [];
  if (req.firstSubject) parts.push(`首选${req.firstSubject}`);
  if (req.all?.length) parts.push(`必选${req.all.join('、')}`);
  for (const group of req.anyOf ?? []) parts.push(`再选中需含${group.join('或')}之一`);
  return parts.length ? parts.join('；') : '不限选科';
}

function renderItem(j: Judgement, added: boolean): string {
  const latest = j.group;
  return `
    <li class="item">
      <div class="item-head">
        <strong>${escapeHtml(j.school.name)}</strong>
        <span class="tag">${escapeHtml(j.school.level)}</span>
      </div>
      <p class="muted small">
        ${escapeHtml(latest.group)} · ${escapeHtml(latest.batch)}${latest.track ? ` · ${escapeHtml(latest.track)}` : ''}
        · 计划 ${latest.planCount} 人 · 选科：${escapeHtml(reqText(latest.requirement))}
      </p>
      <details>
        <summary>依据与提示</summary>
        <p class="small">${escapeHtml(explain(j))}</p>
        ${j.notes.length ? `<ul class="small notes">${j.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : ''}
      </details>
      <button class="btn small-btn" type="button" data-add="${escapeHtml(j.key)}" ${added ? 'disabled' : ''}>
        ${added ? '已加入' : '加入志愿表'}
      </button>
    </li>`;
}

export function mountGaokao(): void {
  const form = $<HTMLFormElement>('g-form');
  const province = $<HTMLSelectElement>('g-province');
  const yearNote = $<HTMLElement>('g-year-note');
  const valueInput = $<HTMLInputElement>('g-value');
  const valueLabel = $<HTMLElement>('g-value-label');
  const trackWrap = $<HTMLElement>('g-track-wrap');
  const trackSel = $<HTMLSelectElement>('g-track');
  const firstWrap = $<HTMLElement>('g-first-wrap');
  const firstSel = $<HTMLSelectElement>('g-first');
  const subjectsWrap = $<HTMLFieldSetElement>('g-subjects');
  const batchSel = $<HTMLSelectElement>('g-batch');
  const submit = $<HTMLButtonElement>('g-submit');
  const errorEl = $<HTMLElement>('g-error');
  const results = $<HTMLElement>('g-results');
  const volunteerBox = $<HTMLElement>('g-volunteers');
  if (!form || !province || !valueInput || !submit || !results || !volunteerBox || !subjectsWrap || !batchSel) return;

  let index: ProvinceIndex = [];
  let data: ProvinceYearData[] = [];
  let examType: ExamType = 'new-3+1+2';
  let byKey = new Map<string, Judgement>();
  let volunteerKeys: string[] = [];
  let lastResult: MatchResult | null = null;

  const setError = (msg: string) => {
    if (errorEl) errorEl.textContent = msg;
  };

  const renderSubjects = (type: ExamType) => {
    const options: readonly string[] = type === 'new-3+3' ? NEW_3_3_SUBJECTS : NEW_3_1_2_OPTIONAL;
    const limit = type === 'new-3+3' ? 3 : 2;
    const legend = type === 'new-3+3' ? `选考科目（从六门中选 ${limit} 门）` : `再选科目（选 ${limit} 门）`;
    subjectsWrap.innerHTML =
      `<legend>${legend}</legend>` +
      options
        .map((s) => `<label class="check"><input type="checkbox" name="subject" value="${s}"> ${s}</label>`)
        .join('');
    subjectsWrap.dataset.limit = String(limit);
  };

  const applyExamType = (type: ExamType) => {
    examType = type;
    trackWrap?.toggleAttribute('hidden', type !== 'old');
    firstWrap?.toggleAttribute('hidden', type !== 'new-3+1+2');
    subjectsWrap.toggleAttribute('hidden', type === 'old');
    if (type !== 'old') renderSubjects(type);
  };

  const selectedSubjects = (): string[] =>
    [...subjectsWrap.querySelectorAll<HTMLInputElement>('input[name="subject"]:checked')].map((i) => i.value);

  subjectsWrap.addEventListener('change', (event) => {
    const limit = Number(subjectsWrap.dataset.limit ?? '2');
    const picked = selectedSubjects();
    if (picked.length > limit && event.target instanceof HTMLInputElement) {
      event.target.checked = false;
      setError(`最多选 ${limit} 门`);
    } else {
      setError('');
    }
  });

  const renderVolunteers = () => {
    const items = volunteerKeys
      .map((key, i) => {
        const j = byKey.get(key);
        if (!j) return '';
        return `<li class="vol-item" draggable="true" data-key="${escapeHtml(key)}" data-index="${i}">
          <span class="rank-no">${i + 1}</span>
          <span class="vol-name">${escapeHtml(j.school.name)} · ${escapeHtml(j.group.group)}</span>
          <span class="tag">${j.tier}</span>
          <button type="button" class="small-btn" data-move="up" data-index="${i}" aria-label="上移">↑</button>
          <button type="button" class="small-btn" data-move="down" data-index="${i}" aria-label="下移">↓</button>
          <button type="button" class="small-btn" data-remove="${i}" aria-label="移除">移除</button>
        </li>`;
      })
      .join('');
    volunteerBox.innerHTML = volunteerKeys.length
      ? `<h3>模拟志愿表（${volunteerKeys.length} 条）</h3>
         <p class="muted small">按住条目可以拖拽排序，也可以用按钮调整。</p>
         <ol class="vol-list">${items}</ol>
         <div class="actions">
           <button type="button" class="btn" data-export="text">复制文本</button>
           <button type="button" class="btn" data-export="image">生成分享图</button>
         </div>
         <p class="muted small" role="status" data-status></p>`
      : `<p class="muted">还没有加入志愿。从上面的结果里挑几个加入即可。</p>`;
    if (lastResult) renderResultButtons();
  };

  const renderResultButtons = () => {
    results.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((btn) => {
      const added = volunteerKeys.includes(btn.dataset.add ?? '');
      btn.disabled = added;
      btn.textContent = added ? '已加入' : '加入志愿表';
    });
  };

  const renderResults = (result: MatchResult, years: ProvinceYearData[]) => {
    byKey = new Map(result.judgements.map((j) => [j.key, j]));
    const counts = Object.fromEntries(TIER_ORDER.map((t) => [t, result.judgements.filter((j) => j.tier === t).length])) as Record<Tier, number>;
    const demo = years.some((y) => y.meta.demo);
    const columns = TIER_ORDER.map((tier) => {
      const items = result.judgements.filter((j) => j.tier === tier);
      return `<section class="tier tier-${tier === '冲' ? 'reach' : tier === '稳' ? 'stable' : 'safe'}" aria-labelledby="tier-${tier}">
        <h3 id="tier-${tier}">${tier}（${items.length}）</h3>
        <p class="muted small">${TIER_HINT[tier]}</p>
        <ul class="items">${items.length ? items.map((j) => renderItem(j, volunteerKeys.includes(j.key))).join('') : '<li class="muted">暂无</li>'}</ul>
      </section>`;
    }).join('');
    results.innerHTML = `
      ${demo ? '<div class="warn demo-banner"><strong>演示数据：</strong>学校、专业组和分数线均为虚构，结果只用来看看功能。</div>' : ''}
      <p>以 ${result.yearsUsed.map((y) => `${y} 年`).join('、')} 的数据计算（最多使用最近 3 年）。可参考的专业组共 ${result.judgements.length} 个：冲 ${counts.冲}、稳 ${counts.稳}、保 ${counts.保}。</p>
      <p class="muted small">排除：选科不符 ${result.excluded.byRequirement} 个，科类不符 ${result.excluded.byTrack} 个，批次不符 ${result.excluded.byBatch} 个，位次差距过大 ${result.excluded.tooFar} 个。</p>
      <div class="tiers">${columns}</div>
      <div class="warn uncertainty">
        <strong>结果的不确定性：</strong>
        <ul>
          <li>数据年份有限，且每年的招生计划和投档情况都会变化。</li>
          <li>新高考和各省的录取政策可能调整，这里的算法不会自动跟进。</li>
          <li>${escapeHtml(disclaimers.gaokao)}</li>
        </ul>
      </div>`;
    renderResultButtons();
  };

  const loadAndMatch = async (e: Event) => {
    e.preventDefault();
    setError('');
    const meta = index.find((p) => p.province === province.value);
    if (!meta) return setError('请选择省份');
    const raw = Number(valueInput.value);
    const mode = (form.elements.namedItem('mode') as RadioNodeList | null)?.value ?? 'score';
    if (!Number.isFinite(raw) || valueInput.value === '') return setError(mode === 'score' ? '请输入分数' : '请输入位次');
    if (mode === 'score' && (raw < 0 || raw > 750)) return setError('分数应在 0–750 之间');
    if (mode === 'rank' && (raw < 1 || !Number.isInteger(raw))) return setError('位次应为正整数');

    examType = meta.examType;
    const choice: StudentChoice = {
      examType,
      track: examType === 'old' ? (trackSel?.value as Track) : undefined,
      first: examType === 'new-3+1+2' ? (firstSel?.value as FirstSubject) : undefined,
      selected: examType === 'old' ? [] : selectedSubjects(),
    };
    const choiceError = validateChoice(choice);
    if (choiceError) return setError(choiceError);

    const input: StudentInput = {
      choice,
      batch: batchSel.value || undefined,
      maxYears: 3,
      ...(mode === 'score' ? { score: raw } : { rank: raw }),
    };

    submit.disabled = true;
    results.innerHTML = '<p class="muted">正在读取数据…</p>';
    try {
      data = await loadYears(meta.province, meta.years);
      if (data.length === 0) throw new Error('该省份暂无可用数据');
      const result = matchVolunteers(input, data);
      lastResult = result;
      renderResults(result, data);
    } catch (err) {
      results.innerHTML = '';
      setError(err instanceof Error ? err.message : '计算失败');
    } finally {
      submit.disabled = false;
    }
  };

  const onFormEdit = () => {
    if (!lastResult) return;
    lastResult = null;
    results.innerHTML = '<p class="muted">条件已修改，请重新计算。</p>';
  };

  const fillBatches = (years: ProvinceYearData[]) => {
    const batches = [...new Set(years.flatMap((y) => y.groups.map((g) => g.batch)))].sort();
    batchSel.innerHTML =
      '<option value="">全部批次</option>' + batches.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
  };

  province.addEventListener('change', async () => {
    const meta = index.find((p) => p.province === province.value);
    if (!meta) return;
    applyExamType(meta.examType);
    if (yearNote) yearNote.textContent = `将使用 ${meta.years.join('、')} 年的数据（如有）。`;
    const years = await loadYears(meta.province, meta.years);
    fillBatches(years);
    onFormEdit();
  });

  form.addEventListener('submit', loadAndMatch);
  form.addEventListener('change', onFormEdit);

  form.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (valueLabel) valueLabel.textContent = radio.value === 'score' ? '高考分数（0–750）' : '全省位次';
      onFormEdit();
    });
  });

  results.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-add]');
    if (!btn || !btn.dataset.add) return;
    if (!volunteerKeys.includes(btn.dataset.add)) volunteerKeys.push(btn.dataset.add);
    renderVolunteers();
  });

  let dragIndex: number | null = null;
  volunteerBox.addEventListener('click', async (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-move],[data-remove],[data-export]');
    if (!target) return;
    if (target.dataset.remove !== undefined) {
      volunteerKeys.splice(Number(target.dataset.remove), 1);
      renderVolunteers();
      return;
    }
    if (target.dataset.move) {
      const i = Number(target.dataset.index);
      const j = target.dataset.move === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= volunteerKeys.length) return;
      [volunteerKeys[i], volunteerKeys[j]] = [volunteerKeys[j], volunteerKeys[i]];
      renderVolunteers();
      return;
    }
    if (target.dataset.export === 'text') {
      const text = volunteerText();
      const status = volunteerBox.querySelector<HTMLElement>('[data-status]');
      try {
        await navigator.clipboard.writeText(text);
        if (status) status.textContent = '已复制到剪贴板。';
      } catch {
        if (status) status.textContent = text;
      }
    }
    if (target.dataset.export === 'image') {
      const status = volunteerBox.querySelector<HTMLElement>('[data-status]');
      target.setAttribute('disabled', '');
      try {
        const lines = volunteerKeys.slice(0, 6).map((key, i) => {
          const j = byKey.get(key);
          return j ? `${i + 1}. ${j.school.name}（${j.group.group}，${j.tier}）` : '';
        });
        const blob = await renderShareCard({
          kicker: '模拟志愿 · 做题区.org',
          title: `模拟志愿表（${volunteerKeys.length} 条）`,
          lines: [...lines, '仅供娱乐和参考，以官方发布为准。'],
          stamp: '仅供参考',
        });
        const outcome = await shareImage(blob, `zuotiqu-volunteer-${Date.now()}.png`, '我的模拟志愿表');
        if (status) status.textContent = outcome === 'downloaded' ? '分享图已保存到本机。' : '';
      } catch {
        if (status) status.textContent = '分享图生成失败。';
      } finally {
        target.removeAttribute('disabled');
      }
    }
  });

  volunteerBox.addEventListener('dragstart', (event) => {
    const li = (event.target as HTMLElement).closest<HTMLElement>('.vol-item');
    if (!li) return;
    dragIndex = Number(li.dataset.index);
    event.dataTransfer?.setData('text/plain', String(dragIndex));
  });
  volunteerBox.addEventListener('dragover', (event) => {
    if ((event.target as HTMLElement).closest('.vol-item')) event.preventDefault();
  });
  volunteerBox.addEventListener('drop', (event) => {
    const li = (event.target as HTMLElement).closest<HTMLElement>('.vol-item');
    if (!li || dragIndex === null) return;
    event.preventDefault();
    const to = Number(li.dataset.index);
    if (to === dragIndex) return;
    const [moved] = volunteerKeys.splice(dragIndex, 1);
    volunteerKeys.splice(to, 0, moved);
    dragIndex = null;
    renderVolunteers();
  });

  function volunteerText(): string {
    return volunteerKeys
      .map((key, i) => {
        const j = byKey.get(key);
        return j ? `${i + 1}. ${j.school.name} ${j.group.group}（${j.group.batch}，${j.tier}）` : '';
      })
      .filter(Boolean)
      .join('\n');
  }

  applyExamType(examType);
  loadIndex()
    .then((list) => {
      index = list;
      province.innerHTML = list
        .map((p) => `<option value="${escapeHtml(p.province)}">${escapeHtml(p.provinceName)}${p.demo ? '（演示）' : ''}</option>`)
        .join('');
      province.dispatchEvent(new Event('change'));
    })
    .catch(() => setError('数据索引加载失败，请刷新页面重试。'));

  renderVolunteers();
}
