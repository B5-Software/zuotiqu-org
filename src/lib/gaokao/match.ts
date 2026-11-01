import { scoreToRank, type RankResult } from './rank';
import { meetsRequirement, trackMatches, validateChoice, type StudentChoice } from './requirements';
import type { AdmissionGroup, ProvinceYearData, School } from './schema';

export const TIER_RULES = { safe: 0.95, stable: 1.05, reach: 1.25 } as const;
export const VOLATILITY_LIMIT = 0.15;

export type Tier = '冲' | '稳' | '保';

export interface StudentInput {
  score?: number;
  rank?: number;
  choice: StudentChoice;
  batch?: string;
  maxYears?: number;
}

export interface YearPoint {
  year: number;
  rank: number;
  minRank: number;
  minScore: number;
  ratio: number;
}

export interface Judgement {
  key: string;
  school: School;
  group: AdmissionGroup;
  tier: Tier;
  medianRatio: number;
  points: YearPoint[];
  notes: string[];
}

export interface MatchResult {
  judgements: Judgement[];
  excluded: { byRequirement: number; byTrack: number; byBatch: number; tooFar: number };
  yearsUsed: number[];
}

export function tierOf(ratio: number): Tier | null {
  if (ratio <= TIER_RULES.safe) return '保';
  if (ratio <= TIER_RULES.stable) return '稳';
  if (ratio <= TIER_RULES.reach) return '冲';
  return null;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function rowsFor(year: ProvinceYearData, choice: StudentChoice) {
  return year.scoreRanks.filter((r) =>
    choice.examType === 'old' ? r.track === choice.track : r.track === undefined,
  );
}

function rankInYear(year: ProvinceYearData, input: StudentInput): RankResult | null {
  if (input.rank !== undefined) return { rank: input.rank, status: 'exact' };
  if (input.score === undefined) return null;
  return scoreToRank(rowsFor(year, input.choice), input.score);
}

export function explain(j: Judgement): string {
  const parts = j.points.map(
    (p) => `${p.year} 年你的位次约 ${p.rank}，该专业组最低位次 ${p.minRank}，比值 ${p.ratio.toFixed(2)}`,
  );
  return `${parts.join('；')}。比值为你的位次除以最低位次，越小越靠前。中位数 ${j.medianRatio.toFixed(2)}，按 ≤${TIER_RULES.safe} 保、≤${TIER_RULES.stable} 稳、≤${TIER_RULES.reach} 冲 判定为「${j.tier}」。`;
}

export function matchVolunteers(input: StudentInput, years: ProvinceYearData[]): MatchResult {
  const choiceError = validateChoice(input.choice);
  if (choiceError) throw new Error(choiceError);
  if (input.score === undefined && input.rank === undefined) throw new Error('请输入分数或位次');

  const maxYears = input.maxYears ?? 3;
  const sorted = [...years].sort((a, b) => b.meta.year - a.meta.year).slice(0, maxYears);
  const result: MatchResult = {
    judgements: [],
    excluded: { byRequirement: 0, byTrack: 0, byBatch: 0, tooFar: 0 },
    yearsUsed: sorted.map((y) => y.meta.year),
  };
  if (sorted.length === 0) return result;

  const entries = new Map<string, Array<{ year: ProvinceYearData; group: AdmissionGroup; school: School }>>();
  for (const y of sorted) {
    const schools = new Map(y.schools.map((s) => [s.code, s]));
    for (const g of y.groups) {
      const school = schools.get(g.schoolCode);
      if (!school) continue;
      const key = `${g.schoolCode}|${g.group}`;
      const list = entries.get(key) ?? [];
      list.push({ year: y, group: g, school });
      entries.set(key, list);
    }
  }

  const judgements: Judgement[] = [];
  for (const [key, list] of entries) {
    const latest = list[0];
    if (!meetsRequirement(input.choice, latest.group.requirement)) {
      result.excluded.byRequirement++;
      continue;
    }
    if (!trackMatches(input.choice, latest.group.track)) {
      result.excluded.byTrack++;
      continue;
    }
    if (input.batch && latest.group.batch !== input.batch) {
      result.excluded.byBatch++;
      continue;
    }

    const notes: string[] = [];
    const points: YearPoint[] = [];
    for (const entry of list) {
      const r = rankInYear(entry.year, input);
      if (!r) continue;
      if (r.status === 'below-table' || r.status === 'above-table') {
        notes.push(`${entry.year.meta.year} 年分数超出一分一段表范围，位次为估算`);
      } else if (r.status === 'nearest-lower') {
        notes.push(`${entry.year.meta.year} 年分数不在表中，按较低分取位次，结果偏保守`);
      }
      points.push({
        year: entry.year.meta.year,
        rank: r.rank,
        minRank: entry.group.minRank,
        minScore: entry.group.minScore,
        ratio: r.rank / entry.group.minRank,
      });
    }
    if (points.length === 0) continue;

    const ratios = points.map((p) => p.ratio);
    const medianRatio = median(ratios);
    const tier = tierOf(medianRatio);
    if (!tier) {
      result.excluded.tooFar++;
      continue;
    }
    if (points.length < maxYears && sorted.length >= maxYears) {
      notes.push(`数据年份不足：该专业组只有 ${points.length} 年可比数据`);
    } else if (points.length < sorted.length) {
      notes.push(`该专业组只有 ${points.length} 年可比数据`);
    }
    if (points.length > 1 && Math.max(...ratios) - Math.min(...ratios) > VOLATILITY_LIMIT) {
      notes.push('近几年位次变化较大，结论不稳定');
    }

    judgements.push({
      key,
      school: latest.school,
      group: latest.group,
      tier,
      medianRatio,
      points: points.sort((a, b) => b.year - a.year),
      notes: [...new Set(notes)],
    });
  }

  const tierOrder: Record<Tier, number> = { 冲: 0, 稳: 1, 保: 2 };
  judgements.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || a.medianRatio - b.medianRatio);
  result.judgements = judgements;
  return result;
}
