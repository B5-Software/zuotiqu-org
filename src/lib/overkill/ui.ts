import { escapeHtml } from '../html';
import { mixedToHtml, toPlain } from '../katex-text';
import { renderShareCard } from '../share/card';
import { shareImage } from '../share/share';
import { fieldsFor, generateFromInput, listTemplates, randomValuesFor, type OverkillResult } from './engine';
import type { Values } from './templates';

function renderProblem(r: OverkillResult): string {
  const solutions = r.solutions
    .map(
      (s, i) => `
        <li class="solution">
          <h3>解法 ${i + 1}：${escapeHtml(s.title)} <span class="tag">降维指数 ${s.tier}/5</span></h3>
          <ol class="steps">${s.steps.map((step) => `<li>${mixedToHtml(step)}</li>`).join('')}</ol>
        </li>`,
    )
    .join('');
  return `
    <header class="problem-head">
      <span class="tag">${escapeHtml(r.grade)}</span>
      <h2>${escapeHtml(r.title)}</h2>
    </header>
    <p class="statement">${mixedToHtml(r.statement)}</p>
    <ol class="solutions">${solutions}</ol>
    <div class="answer">
      <span class="label">正确答案</span>
      <span class="value">${mixedToHtml(r.answer)}</span>
    </div>
    <div class="verdict">
      <span class="stamp" data-rating>${escapeHtml(r.rating)}</span>
    </div>
    <div class="actions">
      <button class="btn btn-primary" type="button" data-share>生成分享图</button>
    </div>
    <p class="muted status" role="status" data-status></p>
  `;
}

export function mountOverkill(): void {
  const select = document.getElementById('template') as HTMLSelectElement | null;
  const form = document.getElementById('overkill-form') as HTMLFormElement | null;
  const fieldsBox = document.getElementById('fields') as HTMLElement | null;
  const fillBtn = document.getElementById('fill-random') as HTMLButtonElement | null;
  const randomBtn = document.getElementById('random-one') as HTMLButtonElement | null;
  const errorEl = document.getElementById('form-error') as HTMLElement | null;
  const out = document.getElementById('problem') as HTMLElement | null;
  if (!select || !form || !fieldsBox || !fillBtn || !randomBtn || !out) return;

  const templateIds = listTemplates().map((t) => t.id);

  const setError = (msg: string) => {
    if (errorEl) errorEl.textContent = msg;
  };

  const renderFields = (id: string) => {
    const fields = fieldsFor(id);
    fieldsBox.innerHTML = fields
      .map(
        (f) => `
        <label class="field">
          <span class="field-label">${escapeHtml(f.label)}</span>
          <input type="number" name="${escapeHtml(f.key)}" value="${f.default}"
            min="${f.min}" max="${f.max}" step="${f.integer ? 1 : 'any'}" inputmode="decimal" required />
          <span class="field-hint muted small">${f.min} 到 ${f.max}${f.integer ? '，整数' : ''}</span>
        </label>`,
      )
      .join('');
    form.querySelector<HTMLButtonElement>('[type="submit"]')?.toggleAttribute('disabled', false);
  };

  const readValues = (id: string): Values | null => {
    const values: Values = {};
    for (const f of fieldsFor(id)) {
      const input = form.elements.namedItem(f.key) as HTMLInputElement | null;
      if (!input || input.value.trim() === '') return null;
      values[f.key] = Number(input.value);
    }
    return values;
  };

  const fillFields = (id: string, values: Values) => {
    for (const f of fieldsFor(id)) {
      const input = form.elements.namedItem(f.key) as HTMLInputElement | null;
      if (input) input.value = String(values[f.key]);
    }
  };

  const show = (id: string, values: Values) => {
    try {
      const result = generateFromInput(id, values);
      out.innerHTML = renderProblem(result);
      out.querySelector<HTMLButtonElement>('[data-share]')?.addEventListener('click', (event) => onShare(event, result));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    }
  };

  const onShare = async (event: Event, r: OverkillResult) => {
    const btn = event.currentTarget as HTMLButtonElement;
    const status = out.querySelector<HTMLElement>('[data-status]');
    btn.disabled = true;
    try {
      const blob = await renderShareCard({
        kicker: '超纲解法生成器 · 做题区.org',
        title: r.title,
        lines: [
          toPlain(r.statement),
          `解法：${r.solutions.map((s) => s.title).join(' / ')}`,
          `正确答案：${toPlain(r.answer)}`,
        ],
        stamp: r.rating,
      });
      const outcome = await shareImage(blob, `zuotiqu-overkill-${Date.now()}.png`, `我用超纲解法生成器解了一道${r.title}：${r.rating}`);
      if (status) status.textContent = outcome === 'downloaded' ? '分享图已保存到本机。' : '';
    } catch {
      if (status) status.textContent = '分享图生成失败，请换个浏览器再试。';
    } finally {
      btn.disabled = false;
    }
  };

  select.addEventListener('change', () => {
    if (!select.value) {
      fieldsBox.innerHTML = '<p class="muted">选择一个具体题型后，可以输入自己的题目参数。想要随机题目，点"随机一题"。</p>';
      setError('');
      return;
    }
    renderFields(select.value);
    setError('');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!select.value) {
      setError('请先选择一个题型');
      return;
    }
    const values = readValues(select.value);
    if (!values) {
      setError('请填写所有参数');
      return;
    }
    show(select.value, values);
  });

  fillBtn.addEventListener('click', () => {
    if (!select.value) {
      setError('请先选择一个题型');
      return;
    }
    fillFields(select.value, randomValuesFor(select.value));
    setError('');
  });

  randomBtn.addEventListener('click', () => {
    const id = templateIds[Math.floor(Math.random() * templateIds.length)];
    select.value = id;
    renderFields(id);
    const values = randomValuesFor(id);
    fillFields(id, values);
    show(id, values);
  });

  select.value = templateIds[0];
  renderFields(templateIds[0]);
  show(templateIds[0], readValues(templateIds[0]) ?? {});
}
