import { z } from 'zod';

export const EXAM_TYPES = ['old', 'new-3+3', 'new-3+1+2'] as const;
export const TRACKS = ['文科', '理科'] as const;
export const FIRST_SUBJECTS = ['物理', '历史'] as const;
export const NEW_3_3_SUBJECTS = ['物理', '化学', '生物', '思想政治', '历史', '地理'] as const;
export const NEW_3_1_2_OPTIONAL = ['思想政治', '地理', '化学', '生物'] as const;
export const LEVELS = ['985', '211', '双一流', '普通本科', '专科'] as const;

export const scoreRowSchema = z.object({
  track: z.enum(TRACKS).optional(),
  score: z.number().int().min(0).max(750),
  count: z.number().int().min(0),
  cumulative: z.number().int().min(0),
});

export const schoolSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  level: z.enum(LEVELS),
  type: z.string().min(1),
  region: z.string().min(1),
});

export const requirementSchema = z.object({
  firstSubject: z.enum(FIRST_SUBJECTS).optional(),
  all: z.array(z.string().min(1)).optional(),
  anyOf: z.array(z.array(z.string().min(1)).min(1)).optional(),
});

export const groupSchema = z.object({
  schoolCode: z.string().min(1),
  group: z.string().min(1),
  batch: z.string().min(1),
  track: z.enum(TRACKS).optional(),
  requirement: requirementSchema,
  planCount: z.number().int().min(0),
  minScore: z.number().min(0),
  minRank: z.number().int().min(1),
  sourceUrl: z.string().min(1),
  fetchedAt: z.string().min(1),
});

export const provinceYearSchema = z.object({
  meta: z.object({
    province: z.string().min(1),
    provinceName: z.string().min(1),
    year: z.number().int(),
    examType: z.enum(EXAM_TYPES),
    demo: z.boolean(),
    source: z.string().min(1),
    fetchedAt: z.string().min(1),
  }),
  scoreRanks: z.array(scoreRowSchema),
  schools: z.array(schoolSchema),
  groups: z.array(groupSchema),
});

export const indexSchema = z.array(
  z.object({
    province: z.string().min(1),
    provinceName: z.string().min(1),
    years: z.array(z.number().int()),
    examType: z.enum(EXAM_TYPES),
    demo: z.boolean(),
  }),
);

export type ExamType = (typeof EXAM_TYPES)[number];
export type Track = (typeof TRACKS)[number];
export type FirstSubject = (typeof FIRST_SUBJECTS)[number];
export type ScoreRow = z.infer<typeof scoreRowSchema>;
export type School = z.infer<typeof schoolSchema>;
export type SubjectRequirement = z.infer<typeof requirementSchema>;
export type AdmissionGroup = z.infer<typeof groupSchema>;
export type ProvinceYearData = z.infer<typeof provinceYearSchema>;
export type ProvinceIndex = z.infer<typeof indexSchema>;

export function validateSemantics(data: ProvinceYearData): string[] {
  const errors: string[] = [];
  const codes = new Set(data.schools.map((s) => s.code));
  if (codes.size !== data.schools.length) errors.push('院校代码重复');
  for (const g of data.groups) {
    if (!codes.has(g.schoolCode)) errors.push(`专业组引用了不存在的院校 ${g.schoolCode}`);
    if (data.meta.examType === 'old' && (g.requirement.firstSubject || g.requirement.all || g.requirement.anyOf)) {
      errors.push(`老高考数据不应包含选科要求：${g.schoolCode} ${g.group}`);
    }
  }
  const tracks = new Set(data.scoreRanks.map((r) => r.track ?? 'all'));
  for (const track of tracks) {
    const rows = data.scoreRanks.filter((r) => (r.track ?? 'all') === track);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].score >= rows[i - 1].score) errors.push(`一分一段未按分数降序：${track} ${rows[i].score}`);
      if (rows[i].cumulative < rows[i - 1].cumulative) errors.push(`累计人数不是单调递增：${track} ${rows[i].score}`);
    }
    for (const r of rows) {
      if (r.cumulative < r.count) errors.push(`累计人数小于本分数人数：${track} ${r.score}`);
    }
  }
  return errors;
}
