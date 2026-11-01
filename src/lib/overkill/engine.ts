import { TEMPLATES, type Field, type OverkillTemplate, type Rng, type Solution, type Tier, type Values } from './templates';

export const RATINGS: Record<Tier, string> = {
  1: '略微过度',
  2: '本题已降维打击',
  3: '本题已彻底降维打击',
  4: '降维到了隔壁维度',
  5: '题目本身都在为你让路',
};

export interface OverkillResult {
  templateId: string;
  title: string;
  grade: string;
  statement: string;
  answer: string;
  solutions: Solution[];
  tier: Tier;
  rating: string;
}

export function listTemplates(): Array<{ id: string; title: string; grade: string }> {
  return TEMPLATES.map(({ id, title, grade }) => ({ id, title, grade }));
}

export function getTemplate(id: string): OverkillTemplate {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) throw new Error(`Unknown overkill template: ${id}`);
  return template;
}

export function fieldsFor(id: string): Field[] {
  return getTemplate(id).fields;
}

export function randomValuesFor(id: string, rng: Rng = Math.random): Values {
  return getTemplate(id).random(rng);
}

export function validateValues(template: OverkillTemplate, values: Values): string | null {
  for (const f of template.fields) {
    const v = values[f.key];
    if (typeof v !== 'number' || !Number.isFinite(v)) return `请填写「${f.label}」`;
    if (v < f.min || v > f.max) return `「${f.label}」应在 ${f.min} 到 ${f.max} 之间`;
    if (f.integer && !Number.isInteger(v)) return `「${f.label}」应为整数`;
  }
  return null;
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function toResult(template: OverkillTemplate, built: ReturnType<OverkillTemplate['solve']>, rng: Rng): OverkillResult {
  const solutions = shuffle(built.solutions, rng).slice(0, 3);
  const tier = Math.max(...solutions.map((s) => s.tier)) as Tier;
  return {
    templateId: template.id,
    title: template.title,
    grade: template.grade,
    statement: built.statement,
    answer: built.answer,
    solutions,
    tier,
    rating: RATINGS[tier],
  };
}

export function generateOverkill(templateId: string | null, rng: Rng = Math.random): OverkillResult {
  const template = templateId
    ? getTemplate(templateId)
    : TEMPLATES[Math.floor(rng() * TEMPLATES.length)];
  return toResult(template, template.solve(template.random(rng)), rng);
}

export function generateFromInput(templateId: string, values: Values, rng: Rng = Math.random): OverkillResult {
  const template = getTemplate(templateId);
  const error = validateValues(template, values);
  if (error) throw new Error(error);
  return toResult(template, template.solve(values), rng);
}
