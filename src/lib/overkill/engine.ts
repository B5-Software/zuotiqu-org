import { TEMPLATES, type OverkillTemplate, type Rng, type Solution, type Tier } from './templates';

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

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function generateOverkill(templateId: string | null, rng: Rng = Math.random): OverkillResult {
  const template = templateId
    ? getTemplate(templateId)
    : TEMPLATES[Math.floor(rng() * TEMPLATES.length)];
  const built = template.build(rng);
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
