import { talents, events, endings, achievements } from '../../../data/restart';
import { site } from '../../config/site';
import { escapeHtml } from '../html';
import { renderShareCard } from '../share/card';
import { shareImage } from '../share/share';
import {
  advanceToEvent,
  applyChoice,
  createLife,
  finishLife,
  type CurvePoint,
  type LifeData,
  type LifeState,
  type LogEntry,
} from './engine';
import {
  PROP_LABELS,
  PROPS,
  STAGE_LABELS,
  type Achievement,
  type Ending,
  type GameEvent,
  type Rarity,
  type Talent,
} from './types';

const RARITY_LABEL: Record<Rarity, string> = { common: '普通', rare: '稀有', legendary: '传说' };
const SERIES: Array<{ key: keyof CurvePoint; color: string }> = [
  { key: 'grade', color: '#c8232c' },
  { key: 'health', color: '#2f7d4a' },
  { key: 'joy', color: '#2e5cb8' },
  { key: 'juan', color: '#8a5a00' },
];

const data: LifeData = { talents, events, endings, achievements };
const talentById = new Map<string, Talent>(talents.map((t) => [t.id, t]));
const rng = () => Math.random();

function statBars(state: LifeState): string {
  return PROPS.map((k) => {
    const v = Math.round(state.props[k]);
    return `<li>
      <span class="stat-name">${PROP_LABELS[k]}</span>
      <span class="bar" aria-hidden="true"><span style="width:${v}%"></span></span>
      <span class="stat-value">${v}</span>
    </li>`;
  }).join('');
}

function deltaText(delta: Partial<Record<string, number>>): string {
  const parts = Object.entries(delta)
    .filter(([, v]) => v)
    .map(([k, v]) => `${PROP_LABELS[k as keyof typeof PROP_LABELS]} ${(v ?? 0) > 0 ? '+' : ''}${v}`);
  return parts.length ? parts.join(' · ') : '没有变化';
}

function stageOf(age: number): string {
  if (age <= 11) return STAGE_LABELS.primary;
  if (age <= 14) return STAGE_LABELS.junior;
  if (age <= 17) return STAGE_LABELS.senior;
  if (age <= 22) return STAGE_LABELS.college;
  if (age <= 34) return STAGE_LABELS.work;
  if (age <= 59) return STAGE_LABELS.midlife;
  return STAGE_LABELS.later;
}

function chartSvg(curve: CurvePoint[]): string {
  const W = 640;
  const H = 260;
  const pad = 36;
  const x = (age: number) => pad + (age / 80) * (W - pad * 2);
  const y = (v: number) => H - pad - (v / 100) * (H - pad * 2);
  const lines = SERIES.map(({ key, color }) => {
    const d = curve
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.age).toFixed(1)} ${y(p[key]).toFixed(1)}`)
      .join(' ');
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" />`;
  }).join('');
  const ticks = [0, 20, 40, 60, 80]
    .map((a) => `<text x="${x(a)}" y="${H - 10}" text-anchor="middle">${a}</text>`)
    .join('');
  const grid = [0, 50, 100]
    .map((v) => `<line x1="${pad}" x2="${W - pad}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(46,92,184,0.18)" /><text x="${pad - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`)
    .join('');
  const legend = SERIES.map(
    (s, i) =>
      `<g transform="translate(${pad + i * 130},14)"><rect width="14" height="14" fill="${s.color}" rx="3" /><text x="20" y="12">${PROP_LABELS[s.key as keyof typeof PROP_LABELS] ?? s.key}</text></g>`,
  ).join('');
  return `<svg class="curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="人生曲线图">
    ${legend}${grid}${lines}${ticks}
  </svg>`;
}

function renderBirth(state: LifeState): string {
  const cards = state.talents
    .map((id) => {
      const t = talentById.get(id);
      if (!t) return '';
      return `<li class="talent rarity-${t.rarity}">
        <span class="tag">${RARITY_LABEL[t.rarity]}</span>
        <h3>${escapeHtml(t.name)}</h3>
        <p class="muted">${escapeHtml(t.description)}</p>
      </li>`;
    })
    .join('');
  const notes = state.notes.length
    ? `<div class="warn"><strong>天赋联动：</strong><ul>${state.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul></div>`
    : '';
  return `
    <h2>出生</h2>
    <p>你在一个普通的家庭出生，这一局有 3 个天赋。</p>
    <ul class="talents">${cards}</ul>
    ${notes}
    <ul class="stats">${statBars(state)}</ul>
    <div class="actions"><button class="btn btn-primary" data-action="next" type="button">开始第一年</button></div>`;
}

function renderEvent(state: LifeState, ev: GameEvent): string {
  const options = ev.options
    .map(
      (o, i) =>
        `<button class="btn option" type="button" data-action="choose" data-index="${i}">${escapeHtml(o.label)}</button>`,
    )
    .join('');
  return `
    <p class="age-line"><span class="tag">${state.age} 岁 · ${stageOf(state.age)}</span></p>
    <h2>${escapeHtml(ev.title)}</h2>
    <p class="event-text">${escapeHtml(ev.text)}</p>
    <div class="options">${options}</div>
    <ul class="stats compact">${statBars(state)}</ul>`;
}

function renderOutcome(state: LifeState, entry: LogEntry): string {
  return `
    <p class="age-line"><span class="tag">${entry.age} 岁</span></p>
    <p class="choice">你选择了：<strong>${escapeHtml(entry.label)}</strong></p>
    <p class="event-text">${escapeHtml(entry.outcome)}</p>
    <p class="muted delta">${escapeHtml(deltaText(entry.delta))}</p>
    <ul class="stats compact">${statBars(state)}</ul>
    <div class="actions"><button class="btn btn-primary" data-action="next" type="button">继续</button></div>`;
}

function renderEnding(state: LifeState, ending: Ending, got: Achievement[]): string {
  const achievementList = got.length
    ? `<h3>解锁的成就</h3><ul class="achievements">${got
        .map((a) => `<li><strong>${escapeHtml(a.name)}</strong><span class="muted">${escapeHtml(a.description)}</span></li>`)
        .join('')}</ul>`
    : '';
  const ztqi = site.ztqiUrl
    ? `<a class="btn" href="${escapeHtml(site.ztqiUrl)}">去做一份 ZTQI</a>`
    : `<span class="tag">ZTQI 入口预留</span>`;
  return `
    <p class="age-line"><span class="tag">${state.age} 岁${state.dead ? ' · 结束得比较突然' : ''}</span></p>
    <h2>${escapeHtml(ending.title)}${ending.escape ? ' <span class="stamp">跳出了题外</span>' : ''}</h2>
    <p class="event-text">${escapeHtml(ending.text)}</p>
    <h3>人生曲线</h3>
    ${chartSvg(state.curve)}
    ${achievementList}
    <div class="actions">
      <button class="btn btn-primary" data-action="share" type="button">生成分享图</button>
      <button class="btn" data-action="restart" type="button">再来一局</button>
      ${ztqi}
    </div>
    <p class="muted status" role="status" data-status></p>`;
}

export function mountRestart(root: HTMLElement): void {
  let state: LifeState | null = null;
  let current: GameEvent | null = null;
  let ending: Ending | null = null;
  let got: Achievement[] = [];

  const show = (html: string) => {
    root.innerHTML = html;
  };

  const start = () => {
    state = createLife(data, rng);
    ending = null;
    show(renderBirth(state));
  };

  const next = () => {
    if (!state) return;
    const ev = advanceToEvent(state, data, rng);
    if (!ev) return finish();
    current = ev;
    show(renderEvent(state, ev));
  };

  const choose = (index: number) => {
    if (!state || !current) return;
    const entry = applyChoice(state, current, index);
    show(renderOutcome(state, entry));
  };

  const finish = () => {
    if (!state) return;
    const result = finishLife(state, data);
    ending = result.ending;
    got = result.achievements;
    show(renderEnding(state, ending, got));
  };

  const share = async (btn: HTMLButtonElement) => {
    if (!state || !ending) return;
    const status = root.querySelector<HTMLElement>('[data-status]');
    const names = state.talents.map((id) => talentById.get(id)?.name ?? id).join('、');
    btn.disabled = true;
    try {
      const blob = await renderShareCard({
        kicker: '做题区版人生重开 · 做题区.org',
        title: ending.title,
        lines: [
          `${state.age} 岁，${ending.text}`,
          `天赋：${names}`,
          `分数 ${Math.round(state.props.grade)} · 快乐 ${Math.round(state.props.joy)} · 体力 ${Math.round(state.props.health)} · 卷度 ${Math.round(state.props.juan)}`,
        ],
        stamp: ending.escape ? '跳出了题外' : '再来一局',
      });
      const outcome = await shareImage(blob, `zuotiqu-restart-${Date.now()}.png`, `做题区版人生重开：${ending.title}`);
      if (status) status.textContent = outcome === 'downloaded' ? '分享图已保存到本机。' : '';
    } catch {
      if (status) status.textContent = '分享图生成失败，请换个浏览器再试。';
    } finally {
      btn.disabled = false;
    }
  };

  root.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    switch (target.dataset.action) {
      case 'start':
      case 'restart':
        start();
        break;
      case 'next':
        next();
        break;
      case 'choose':
        choose(Number(target.dataset.index));
        break;
      case 'share':
        void share(target as HTMLButtonElement);
        break;
    }
  });

  show(`<h2>准备好了吗？</h2>
    <p>这一局会随机抽 3 个天赋。每一年有一定概率遇到一件事，你的选择会改变分数、体力、快乐、人脉和卷度。</p>
    <div class="actions"><button class="btn btn-primary" data-action="start" type="button">开始新的一生</button></div>`);
}
