export const PROPS = ['grade', 'health', 'family', 'joy', 'network', 'juan'] as const;
export type PropKey = (typeof PROPS)[number];

export const PROP_LABELS: Record<PropKey, string> = {
  grade: '分数',
  health: '体力',
  family: '家境',
  joy: '快乐',
  network: '人脉',
  juan: '卷度',
};

export type Effects = Partial<Record<PropKey, number>>;

export const STAGES = ['primary', 'junior', 'senior', 'college', 'work', 'midlife', 'later'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
  college: '大学',
  work: '工作',
  midlife: '中年',
  later: '之后',
};

export const STAGE_AGES: Record<Stage, [number, number]> = {
  primary: [6, 11],
  junior: [12, 14],
  senior: [15, 17],
  college: [18, 22],
  work: [23, 34],
  midlife: [35, 59],
  later: [60, 80],
};

export type Rarity = 'common' | 'rare' | 'legendary';

export type Condition =
  | { prop: PropKey; op: '>=' | '<='; value: number }
  | { flag: string }
  | { talent: string }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export interface Talent {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  effects: Effects;
  excludes?: string[];
  synergies?: Synergy[];
}

export interface Synergy {
  with: string;
  effects?: Effects;
  text: string;
}

export interface Option {
  label: string;
  outcome: string;
  effects?: Effects;
  setFlags?: string[];
  clearFlags?: string[];
}

export interface GameEvent {
  id: string;
  stage: Stage;
  ageMin: number;
  ageMax: number;
  weight: number;
  once?: boolean;
  when?: Condition;
  title: string;
  text: string;
  options: Option[];
}

export interface Ending {
  id: string;
  title: string;
  text: string;
  priority: number;
  when: Condition;
  escape?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  when: Condition;
}
