import type { ScoreRow } from './schema';

export interface RankResult {
  rank: number;
  status: 'exact' | 'nearest-lower' | 'above-table' | 'below-table';
}

export function bestRankOf(row: ScoreRow): number {
  return row.cumulative - row.count + 1;
}

export function scoreToRank(rows: ScoreRow[], score: number): RankResult | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  if (score > top.score) return { rank: bestRankOf(top), status: 'above-table' };
  if (score < bottom.score) return { rank: bottom.cumulative + 1, status: 'below-table' };
  const exact = sorted.find((r) => r.score === score);
  if (exact) return { rank: bestRankOf(exact), status: 'exact' };
  const lower = sorted.find((r) => r.score < score);
  if (!lower) return null;
  return { rank: bestRankOf(lower), status: 'nearest-lower' };
}

export function rankToScore(rows: ScoreRow[], rank: number): number | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  for (const row of sorted) {
    if (rank >= bestRankOf(row) && rank <= row.cumulative) return row.score;
  }
  if (rank < bestRankOf(sorted[0])) return sorted[0].score;
  return sorted[sorted.length - 1].score;
}
