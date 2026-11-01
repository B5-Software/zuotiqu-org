import { site } from '../../config/site';
import { escapeHtml } from '../html';
import { createRng } from '../rng';
import { renderShareCard } from '../share/card';
import { shareImage } from '../share/share';
import { drawWorld } from './render';
import { playEvent, setSoundEnabled } from './sound';
import { pickFailText } from './texts';
import { createWorld, step, VIEW, type Input, type World } from './world';

const STEP = 1 / 60;
const BEST_KEY = 'zuotiqu-run-best';
const SOUND_KEY = 'zuotiqu-run-sound';
const COLLECT_LABEL = { perfect: '满分卷', coffee: '咖啡', draft: '草稿纸', lhopital: '洛必达' } as const;

type UiState = 'ready' | 'playing' | 'paused' | 'over';

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 隐私模式下无法写入时，最高分只在本次访问内有效
  }
}

function newRng() {
  return createRng((Math.random() * 0xffffffff) >>> 0);
}

export function mountRun(): void {
  const canvas = document.getElementById('run-canvas') as HTMLCanvasElement | null;
  const overlay = document.getElementById('run-overlay') as HTMLElement | null;
  const hudScore = document.getElementById('hud-score');
  const hudBest = document.getElementById('hud-best');
  const hudShield = document.getElementById('hud-shield');
  const hudBoost = document.getElementById('hud-boost');
  const pauseBtn = document.getElementById('run-pause') as HTMLButtonElement | null;
  const muteBtn = document.getElementById('run-mute') as HTMLButtonElement | null;
  if (!canvas || !overlay) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = VIEW.W * dpr;
  canvas.height = VIEW.H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const head = new Image();
  head.src = '/avatar/zuotiqu-head.svg';

  let world: World = createWorld(newRng());
  let state: UiState = 'ready';
  let best = readNumber(BEST_KEY);
  let jumpQueued = false;
  let duckHeld = false;
  let acc = 0;
  let last = performance.now();
  let soundOn = readNumber(SOUND_KEY) === 1;
  let overCounted = false;
  let failText = '';

  setSoundEnabled(soundOn);
  if (muteBtn) muteBtn.textContent = soundOn ? '关闭音效' : '开启音效';

  const showOverlay = (html: string) => {
    overlay.innerHTML = html;
    overlay.hidden = false;
  };

  const hideOverlay = () => {
    overlay.hidden = true;
    overlay.innerHTML = '';
  };

  const readyHtml = () => `
    <div class="overlay-card">
      <h2>准备开跑</h2>
      <p class="hint">空格或点击跳跃，↓ 或下半屏长按蹲下。躲开作业堆、早八闹钟、家长群通知和月考排名榜。</p>
      <button class="btn btn-primary" type="button" data-action="start">开始</button>
    </div>`;

  const pausedHtml = () => `
    <div class="overlay-card">
      <h2>已暂停</h2>
      <p class="muted">切换到别的页面时会自动暂停。</p>
      <button class="btn btn-primary" type="button" data-action="resume">继续</button>
    </div>`;

  const start = () => {
    world = createWorld(newRng());
    overCounted = false;
    acc = 0;
    last = performance.now();
    state = 'playing';
    hideOverlay();
    setPauseLabel();
  };

  const pause = () => {
    if (state !== 'playing') return;
    state = 'paused';
    showOverlay(pausedHtml());
    setPauseLabel();
  };

  const resume = () => {
    if (state !== 'paused') return;
    state = 'playing';
    last = performance.now();
    hideOverlay();
    setPauseLabel();
  };

  const setPauseLabel = () => {
    if (!pauseBtn) return;
    const label = { ready: '开始', playing: '暂停', paused: '继续', over: '再跑一局' }[state];
    pauseBtn.textContent = label;
    pauseBtn.classList.toggle('btn-primary', state !== 'playing');
  };

  const finish = () => {
    state = 'over';
    const score = world.score;
    if (!overCounted) {
      overCounted = true;
      if (score > best) {
        best = score;
        writeValue(BEST_KEY, String(best));
      }
    }
    const c = world.collected;
    failText = pickFailText(world.deadBy, newRng());
    showOverlay(`
      <div class="overlay-card">
        <p class="stamp">卷度 ${score}</p>
        <p class="event-text">${escapeHtml(failText)}</p>
        <p class="muted">最高 ${best} · 本局收集：${Object.entries(COLLECT_LABEL)
          .map(([k, label]) => `${label} ${c[k as keyof typeof c]}`)
          .join(' · ')}</p>
        <div class="overlay-actions">
          <button class="btn btn-primary" type="button" data-action="restart">再跑一局</button>
          <button class="btn" type="button" data-action="share">生成分享图</button>
          ${site.ztqiUrl ? `<a class="btn" href="${escapeHtml(site.ztqiUrl)}">去做 ZTQI</a>` : ''}
        </div>
        <p class="muted status" role="status" data-status></p>
      </div>`);
    setPauseLabel();
  };

  const handleEvents = (w: World) => {
    for (const e of w.events) playEvent(e);
  };

  const updateHud = () => {
    if (hudScore) hudScore.textContent = String(world.score);
    if (hudBest) hudBest.textContent = String(Math.max(best, world.score));
    if (hudShield) hudShield.hidden = !world.shield;
    if (hudBoost) hudBoost.hidden = !(world.t < world.invincibleUntil);
  };

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (state === 'playing') {
      acc += dt;
      while (acc >= STEP && state === 'playing') {
        const input: Input = { jump: jumpQueued, duck: duckHeld };
        step(world, input, STEP);
        jumpQueued = false;
        acc -= STEP;
        handleEvents(world);
        if (world.status === 'over') {
          finish();
          break;
        }
      }
    }
    drawWorld(ctx, world, { head: head.complete && head.naturalWidth > 0 ? head : null });
    updateHud();
    requestAnimationFrame(frame);
  };

  const onShare = async (btn: HTMLButtonElement) => {
    const status = overlay.querySelector<HTMLElement>('[data-status]');
    const c = world.collected;
    btn.disabled = true;
    try {
      const blob = await renderShareCard({
        kicker: '做题区快跑 · 做题区.org',
        title: `卷度 ${world.score}`,
        lines: [
          failText,
          `本局收集：满分卷 ${c.perfect} · 咖啡 ${c.coffee} · 草稿纸 ${c.draft} · 洛必达 ${c.lhopital}`,
          `本地最高：${best}`,
        ],
        stamp: '又卷了一次',
      });
      const outcome = await shareImage(blob, `zuotiqu-run-${Date.now()}.png`, `做题区快跑：卷度 ${world.score}`);
      if (status) status.textContent = outcome === 'downloaded' ? '分享图已保存到本机。' : '';
    } catch {
      if (status) status.textContent = '分享图生成失败，请换个浏览器再试。';
    } finally {
      btn.disabled = false;
    }
  };

  overlay.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    switch (target.dataset.action) {
      case 'start':
        start();
        break;
      case 'resume':
        resume();
        break;
      case 'restart':
        start();
        break;
      case 'share':
        void onShare(target as HTMLButtonElement);
        break;
    }
  });

  const fsBtn = document.getElementById('run-fullscreen') as HTMLButtonElement | null;
  const exitFsBtn = document.getElementById('run-exit-fs') as HTMLButtonElement | null;
  const stage = canvas.parentElement as HTMLElement;
  type FsStage = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  type FsDoc = Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  const fsSupported = typeof stage.requestFullscreen === 'function' || typeof (stage as FsStage).webkitRequestFullscreen === 'function';
  const isFullscreen = () => ((document as FsDoc).fullscreenElement ?? (document as FsDoc).webkitFullscreenElement) === stage;
  const updateFsLabel = () => {
    if (fsBtn) fsBtn.textContent = isFullscreen() ? '退出全屏' : '全屏';
  };
  const toggleFullscreen = async () => {
    try {
      if (isFullscreen()) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else await (document as FsDoc).webkitExitFullscreen?.();
      } else if (stage.requestFullscreen) {
        await stage.requestFullscreen();
      } else {
        await (stage as FsStage).webkitRequestFullscreen?.();
      }
    } catch {
      // 浏览器拒绝全屏（例如没有用户手势）时保持原样
    }
    updateFsLabel();
  };
  if (fsBtn && !fsSupported) fsBtn.hidden = true;
  fsBtn?.addEventListener('click', () => void toggleFullscreen());
  exitFsBtn?.addEventListener('click', () => void toggleFullscreen());
  document.addEventListener('fullscreenchange', updateFsLabel);
  document.addEventListener('webkitfullscreenchange', updateFsLabel);

  const onKeyDown = (event: KeyboardEvent) => {
    const code = event.code;
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      event.preventDefault();
      if (state === 'ready' || state === 'over') {
        start();
        return;
      }
      if (state === 'paused') {
        resume();
        return;
      }
      jumpQueued = true;
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      event.preventDefault();
      duckHeld = true;
    } else if (code === 'KeyF') {
      event.preventDefault();
      void toggleFullscreen();
    } else if (code === 'KeyP' || code === 'Escape') {
      if (state === 'playing') pause();
      else if (state === 'paused') resume();
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.code === 'ArrowDown' || event.code === 'KeyS') duckHeld = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (state === 'ready' || state === 'over') {
      start();
      return;
    }
    if (state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const lowerPart = (event.clientY - rect.top) / rect.height > 0.65;
    if (lowerPart) duckHeld = true;
    else jumpQueued = true;
  });
  const releaseDuck = () => {
    duckHeld = false;
  };
  canvas.addEventListener('pointerup', releaseDuck);
  canvas.addEventListener('pointercancel', releaseDuck);
  canvas.addEventListener('pointerleave', releaseDuck);

  pauseBtn?.addEventListener('click', () => {
    if (state === 'playing') pause();
    else if (state === 'paused') resume();
    else start();
  });

  muteBtn?.addEventListener('click', () => {
    soundOn = !soundOn;
    setSoundEnabled(soundOn);
    writeValue(SOUND_KEY, soundOn ? '1' : '0');
    muteBtn.textContent = soundOn ? '关闭音效' : '开启音效';
  });

  showOverlay(readyHtml());
  setPauseLabel();
  if (hudBest) hudBest.textContent = String(best);
  requestAnimationFrame(frame);
}
