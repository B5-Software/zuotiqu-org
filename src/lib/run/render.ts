import { PLAYER, VIEW, type Obstacle, type Pickup, type World } from './world';

const INK = '#1f2430';
const PAPER = '#fbf8ef';
const CARD = '#fffdf7';
const BLUE = '#2e5cb8';
const RED = '#c8232c';
const YELLOW = '#ffd23f';
const GREEN = '#2f7d4a';
const BROWN = '#8a5a00';
const WARN = '#fff3c4';

export interface Assets {
  head: HTMLImageElement | null;
}

type Pose = 'run' | 'jump' | 'duck' | 'cheer' | 'fall' | 'buried';

function poseOf(w: World): Pose {
  if (w.status === 'over') return w.deadBy === 'homework' ? 'buried' : 'fall';
  if (w.t < w.cheerUntil) return 'cheer';
  if (!w.player.onGround) return 'jump';
  if (w.player.ducking) return 'duck';
  return 'run';
}

export function drawWorld(ctx: CanvasRenderingContext2D, w: World, assets: Assets): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  drawGrid(ctx, w.distance);
  drawGround(ctx);
  for (const o of w.obstacles) drawObstacle(ctx, o);
  for (const p of w.pickups) drawPickup(ctx, p, w.t);
  drawPlayer(ctx, w, assets);
  if (w.t < w.invincibleUntil && w.status === 'running') {
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(PLAYER.x - 10, VIEW.GROUND - PLAYER.standH - 16, PLAYER.w + 20, PLAYER.standH + 24);
    ctx.setLineDash([]);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, distance: number): void {
  ctx.strokeStyle = 'rgba(46, 92, 184, 0.14)';
  ctx.lineWidth = 1;
  const offset = distance % 56;
  ctx.beginPath();
  for (let x = -offset; x <= VIEW.W; x += 56) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW.GROUND);
  }
  for (let y = 0; y <= VIEW.GROUND; y += 56) {
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW.W, y);
  }
  ctx.stroke();
}

function drawGround(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = CARD;
  ctx.fillRect(0, VIEW.GROUND, VIEW.W, VIEW.H - VIEW.GROUND);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, VIEW.GROUND);
  ctx.lineTo(VIEW.W, VIEW.GROUND);
  ctx.stroke();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle): void {
  const top = VIEW.GROUND - o.bottom - o.h;
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  if (o.kind === 'homework') {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? CARD : '#f3eee0';
      ctx.fillRect(o.x + i * 2, top + i * 14, o.w - i * 4, 14);
      ctx.strokeRect(o.x + i * 2, top + i * 14, o.w - i * 4, 14);
    }
    ctx.fillStyle = BLUE;
    ctx.font = '700 13px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('作业', o.x + o.w / 2, top + 11);
  } else if (o.kind === 'alarm') {
    const cx = o.x + o.w / 2;
    const cy = top + o.h / 2 + 2;
    ctx.fillStyle = CARD;
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - 10);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 7, cy + 3);
    ctx.stroke();
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(cx - 15, top + 4, 4, 0, Math.PI * 2);
    ctx.arc(cx + 15, top + 4, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.kind === 'notice') {
    ctx.fillStyle = WARN;
    ctx.fillRect(o.x, top, o.w, o.h);
    ctx.strokeStyle = RED;
    ctx.strokeRect(o.x, top, o.w, o.h);
    ctx.fillStyle = RED;
    ctx.font = '700 14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('@你', o.x + o.w / 2, top + 20);
  } else {
    ctx.fillStyle = CARD;
    ctx.fillRect(o.x, top, o.w, o.h);
    ctx.strokeRect(o.x, top, o.w, o.h);
    ctx.fillStyle = RED;
    ctx.fillRect(o.x, top, o.w, 22);
    ctx.fillStyle = '#fff';
    ctx.font = '700 14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('榜', o.x + o.w / 2, top + 16);
    ctx.fillStyle = BLUE;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(o.x + 7, top + 32 + i * 13, o.w - 14 - (i % 2) * 8, 6);
    }
  }
  ctx.restore();
}

const PICKUP_STYLE: Record<Pickup['kind'], { fill: string; label: string; text: string }> = {
  perfect: { fill: YELLOW, label: '满分', text: INK },
  coffee: { fill: BROWN, label: '咖', text: '#fff' },
  draft: { fill: BLUE, label: '稿', text: '#fff' },
  lhopital: { fill: GREEN, label: '洛', text: '#fff' },
};

function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, t: number): void {
  const style = PICKUP_STYLE[p.kind];
  const y = p.y + Math.sin(t * 4 + p.id) * 3;
  ctx.save();
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(p.x, y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = style.text;
  ctx.font = '700 13px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.label, p.x, y + 1);
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color = INK): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawPlayer(ctx: CanvasRenderingContext2D, w: World, assets: Assets): void {
  const pose = poseOf(w);
  const feetX = PLAYER.x + PLAYER.w / 2;
  const feetY = VIEW.GROUND - w.player.bottom;
  const ph = w.distance / 14;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (pose === 'fall') {
    ctx.translate(feetX, feetY);
    ctx.rotate(1.35);
    ctx.translate(-feetX, -feetY);
  }

  const hipY = feetY - (pose === 'duck' ? 16 : 26);
  const shoulderY = feetY - (pose === 'duck' ? 22 : 46);
  const shoulderX = pose === 'duck' ? feetX + 14 : feetX;
  const hipX = pose === 'duck' ? feetX - 6 : feetX;

  let legA: [number, number];
  let legB: [number, number];
  let armA: [number, number];
  let armB: [number, number];
  if (pose === 'run') {
    const a = Math.sin(ph) * 0.7;
    legA = [hipX + Math.sin(a) * 26, hipY + Math.cos(a) * 26];
    legB = [hipX - Math.sin(a) * 26, hipY + Math.cos(a) * 26];
    armA = [shoulderX - Math.sin(a) * 18, shoulderY + Math.cos(a) * 18];
    armB = [shoulderX + Math.sin(a) * 18, shoulderY + Math.cos(a) * 18];
  } else if (pose === 'jump') {
    legA = [hipX - 8, hipY + 20];
    legB = [hipX + 8, hipY + 18];
    armA = [shoulderX - 8, shoulderY - 18];
    armB = [shoulderX + 10, shoulderY - 16];
  } else if (pose === 'duck') {
    legA = [hipX + 22, hipY + 12];
    legB = [hipX + 20, hipY + 4];
    armA = [shoulderX + 16, shoulderY + 4];
    armB = [shoulderX + 14, shoulderY + 12];
  } else if (pose === 'cheer') {
    legA = [hipX - 8, hipY + 26];
    legB = [hipX + 8, hipY + 26];
    armA = [shoulderX - 18, shoulderY - 22];
    armB = [shoulderX + 18, shoulderY - 22];
  } else {
    legA = [hipX - 10, hipY + 22];
    legB = [hipX + 10, hipY + 22];
    armA = [shoulderX - 14, shoulderY + 14];
    armB = [shoulderX + 14, shoulderY + 14];
  }

  line(ctx, hipX, hipY, legA[0], legA[1], 7);
  line(ctx, hipX, hipY, legB[0], legB[1], 7);
  line(ctx, shoulderX, shoulderY, shoulderX, hipY, 22, BLUE);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(shoulderX - 9, shoulderY - 2);
  ctx.lineTo(shoulderX, shoulderY + 8);
  ctx.lineTo(shoulderX + 9, shoulderY - 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  line(ctx, shoulderX, shoulderY, armA[0], armA[1], 6, BLUE);
  line(ctx, shoulderX, shoulderY, armB[0], armB[1], 6, BLUE);

  const bob = pose === 'run' ? Math.sin(ph * 2) * 1.5 : 0;
  const headSize = pose === 'duck' ? 40 : 52;
  const headCx = pose === 'duck' ? feetX + 16 : feetX;
  const headCy = (pose === 'duck' ? feetY - 24 : feetY - 60) + bob;
  if (assets.head) {
    ctx.drawImage(assets.head, headCx - headSize / 2, headCy - headSize / 2, headSize, headSize);
  } else {
    ctx.fillStyle = CARD;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(headCx, headCy, headSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  if (pose === 'buried') drawHomeworkPile(ctx, feetX, feetY);
}

function drawHomeworkPile(ctx: CanvasRenderingContext2D, feetX: number, feetY: number): void {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const x = feetX - 44 + i * 3;
    const y = feetY - 58 + i * 12;
    ctx.fillStyle = i % 2 ? CARD : '#f3eee0';
    ctx.fillRect(x, y, 96 - i * 6, 14);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, 96 - i * 6, 14);
  }
  ctx.fillStyle = RED;
  ctx.font = '700 14px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('作业', feetX, feetY - 46);
  ctx.restore();
}
