export interface CardInput {
  kicker: string;
  title: string;
  lines: string[];
  stamp?: string;
  footer?: string;
}

export type MeasureFn = (text: string) => number;

export function wrapLines(text: string, maxWidth: number, measure: MeasureFn): string[] {
  const out: string[] = [];
  let line = '';
  for (const ch of text) {
    const next = line + ch;
    if (line && measure(next) > maxWidth) {
      out.push(line);
      line = ch;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out;
}

const W = 1080;
const H = 1440;
const PAPER = '#fbf8ef';
const INK = '#1f2430';
const INK_SOFT = '#4a5263';
const BLUE = '#2e5cb8';
const RED = '#c8232c';
const CARD = '#fffdf7';
const FONT = '"PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';
const HAND = '"Kaiti SC", "STKaiti", "KaiTi", "Noto Serif SC", serif';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${src}`));
    img.src = src;
  });
}

export async function renderShareCard(input: CardInput, avatarSrc = '/avatar/zuotiqu-head.svg'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unsupported');

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(46, 92, 184, 0.14)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 56) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 56) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const pad = 72;
  const cardX = pad;
  const cardY = pad;
  const cardW = W - pad * 2;
  const cardH = H - pad * 2;
  ctx.fillStyle = CARD;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.stroke();

  try {
    const img = await loadImage(avatarSrc);
    ctx.drawImage(img, cardX + 56, cardY + 56, 180, 180);
  } catch {
    // 头像加载失败时仍然输出分享图
  }

  const textX = cardX + 280;
  const textW = cardW - 280 - 56;
  ctx.fillStyle = BLUE;
  ctx.font = `600 36px ${FONT}`;
  ctx.fillText(input.kicker, textX, cardY + 110);

  ctx.fillStyle = INK;
  ctx.font = `700 60px ${HAND}`;
  const titleLines = wrapLines(input.title, textW, (t) => ctx.measureText(t).width);
  titleLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, textX, cardY + 190 + i * 76));

  let y = cardY + 360;
  ctx.font = `400 40px ${FONT}`;
  ctx.fillStyle = INK_SOFT;
  const contentW = cardW - 112;
  for (const raw of input.lines) {
    ctx.fillStyle = INK;
    const wrapped = wrapLines(raw, contentW, (t) => ctx.measureText(t).width);
    for (const line of wrapped) {
      ctx.fillText(line, cardX + 56, y);
      y += 62;
    }
    y += 26;
  }

  if (input.stamp) {
    ctx.save();
    ctx.translate(cardX + cardW - 300, cardY + cardH - 300);
    ctx.rotate((-6 * Math.PI) / 180);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, 300, 120);
    ctx.fillStyle = RED;
    ctx.font = `700 50px ${HAND}`;
    ctx.textAlign = 'center';
    ctx.fillText(input.stamp, 150, 76);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 30px ${FONT}`;
  ctx.fillText(input.footer ?? '做题区.org · 唯分数论之外，还有一整片草稿纸', cardX + 56, cardY + cardH - 56);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
