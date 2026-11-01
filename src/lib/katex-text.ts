import katex from 'katex';
import { escapeHtml } from './html';

export function mixedToHtml(text: string): string {
  return text
    .split('$')
    .map((seg, i) =>
      i % 2 === 1 ? katex.renderToString(seg, { throwOnError: false }) : escapeHtml(seg),
    )
    .join('');
}

export function toPlain(text: string): string {
  return text
    .replace(/\$/g, '')
    .replace(/\^\{?\\circ\}?/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\\approx\s*/g, '≈ ')
    .replace(/\\times/g, '×')
    .replace(/\\cdots/g, '…')
    .replace(/\\%/g, '%');
}
