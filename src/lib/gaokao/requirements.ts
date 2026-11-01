import type { ExamType, FirstSubject, SubjectRequirement, Track } from './schema';

export interface StudentChoice {
  examType: ExamType;
  track?: Track;
  first?: FirstSubject;
  selected: string[];
}

export function validateChoice(c: StudentChoice): string | null {
  if (c.examType === 'old') {
    return c.track ? null : '老高考请选择文科或理科';
  }
  if (c.examType === 'new-3+1+2') {
    if (!c.first) return '请选择首选科目（物理或历史）';
    if (c.selected.length !== 2) return '3+1+2 需要从再选科目中选 2 门';
    if (new Set(c.selected).size !== 2) return '再选科目不能重复';
    return null;
  }
  if (c.selected.length !== 3) return '3+3 需要从六门中选 3 门';
  if (new Set(c.selected).size !== 3) return '选考科目不能重复';
  return null;
}

export function meetsRequirement(c: StudentChoice, req: SubjectRequirement): boolean {
  if (c.examType === 'old') return true;
  const pool = new Set<string>([...(c.first ? [c.first] : []), ...c.selected]);
  if (req.firstSubject && c.first !== req.firstSubject) return false;
  for (const subject of req.all ?? []) {
    if (!pool.has(subject)) return false;
  }
  for (const group of req.anyOf ?? []) {
    if (!group.some((subject) => pool.has(subject))) return false;
  }
  return true;
}

export function trackMatches(c: StudentChoice, track?: Track): boolean {
  if (!track || c.examType !== 'old') return true;
  return c.track === track;
}
