import { escapeHtml } from '../html';
import { mixedToHtml, toPlain } from '../katex-text';
import { renderShareCard } from '../share/card';
import { shareImage } from '../share/share';
import { generateOverkill, type OverkillResult } from './engine';

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
  const button = document.getElementById('generate') as HTMLButtonElement | null;
  const out = document.getElementById('problem') as HTMLElement | null;
  if (!select || !button || !out) return;

  let current: OverkillResult | null = null;

  const show = () => {
    current = generateOverkill(select.value || null);
    out.innerHTML = renderProblem(current);
    out.querySelector<HTMLButtonElement>('[data-share]')?.addEventListener('click', onShare);
  };

  const onShare = async (event: Event) => {
    if (!current) return;
    const btn = event.currentTarget as HTMLButtonElement;
    const status = out.querySelector<HTMLElement>('[data-status]');
    btn.disabled = true;
    try {
      const r = current;
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

  button.addEventListener('click', show);
  show();
}
