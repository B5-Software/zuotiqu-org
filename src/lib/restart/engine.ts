import type { Rng } from '../rng';
import {
  PROPS,
  type Achievement,
  type Condition,
  type Effects,
  type Ending,
  type GameEvent,
  type PropKey,
  type Rarity,
  type Talent,
} from './types';

export type Props = Record<PropKey, number>;

export interface LifeData {
  talents: Talent[];
  events: GameEvent[];
  endings: Ending[];
  achievements: Achievement[];
}

export interface LogEntry {
  age: number;
  title: string;
  text: string;
  label: string;
  outcome: string;
  delta: Effects;
}

export interface CurvePoint {
  age: number;
  grade: number;
  health: number;
  joy: number;
  juan: number;
}

export interface LifeState {
  age: number;
  props: Props;
  talents: string[];
  notes: string[];
  flags: Set<string>;
  fired: Set<string>;
  log: LogEntry[];
  curve: CurvePoint[];
  dead: boolean;
}

export interface LifeResult {
  state: LifeState;
  ending: Ending;
  achievements: Achievement[];
}

export const MAX_AGE = 80;
export const EVENT_CHANCE = 0.5;

const BASE: Props = { grade: 50, health: 70, family: 50, joy: 60, network: 30, juan: 30 };
const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, rare: 30, legendary: 10 };

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function applyEffects(state: LifeState, effects: Effects | undefined): void {
  if (!effects) return;
  for (const key of PROPS) {
    const delta = effects[key];
    if (delta) state.props[key] = clamp(state.props[key] + delta);
  }
}

export function evalCondition(c: Condition, state: Pick<LifeState, 'props' | 'flags' | 'talents'>): boolean {
  if ('prop' in c) {
    const v = state.props[c.prop];
    return c.op === '>=' ? v >= c.value : v <= c.value;
  }
  if ('flag' in c) return state.flags.has(c.flag);
  if ('talent' in c) return state.talents.includes(c.talent);
  if ('all' in c) return c.all.every((x) => evalCondition(x, state));
  if ('any' in c) return c.any.some((x) => evalCondition(x, state));
  return !evalCondition(c.not, state);
}

function pickWeighted<T>(items: T[], weightOf: (item: T) => number, rng: Rng): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let r = rng() * total;
  for (const item of items) {
    r -= weightOf(item);
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

export function drawTalents(pool: Talent[], rng: Rng, count = 3): Talent[] {
  const chosen: Talent[] = [];
  let candidates = [...pool];
  while (chosen.length < count && candidates.length > 0) {
    const pick = pickWeighted(candidates, (t) => RARITY_WEIGHT[t.rarity], rng);
    if (!pick) break;
    chosen.push(pick);
    candidates = candidates.filter(
      (t) =>
        t.id !== pick.id &&
        !(pick.excludes ?? []).includes(t.id) &&
        !(t.excludes ?? []).includes(pick.id),
    );
  }
  return chosen;
}

export function createLife(data: LifeData, rng: Rng): LifeState {
  const state: LifeState = {
    age: 0,
    props: { ...BASE },
    talents: [],
    notes: [],
    flags: new Set(),
    fired: new Set(),
    log: [],
    curve: [],
    dead: false,
  };
  state.props.family = 30 + Math.floor(rng() * 41);

  const drawn = drawTalents(data.talents, rng, 3);
  state.talents = drawn.map((t) => t.id);
  for (const t of drawn) applyEffects(state, t.effects);

  const ids = new Set(state.talents);
  const seen = new Set<string>();
  for (const t of drawn) {
    for (const syn of t.synergies ?? []) {
      if (!ids.has(syn.with)) continue;
      const key = [t.id, syn.with].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      applyEffects(state, syn.effects);
      state.notes.push(syn.text);
    }
  }

  recordCurve(state);
  return state;
}

function recordCurve(state: LifeState): void {
  state.curve.push({
    age: state.age,
    grade: state.props.grade,
    health: state.props.health,
    joy: state.props.joy,
    juan: state.props.juan,
  });
}

function drift(state: LifeState): void {
  if (state.props.juan >= 60) {
    applyEffects(state, { joy: -1, health: -1 });
  }
  if (state.props.juan <= 20) {
    applyEffects(state, { joy: 1 });
  }
  if (state.age >= 60) {
    applyEffects(state, { health: -1 });
  }
}

function eligibleEvents(data: LifeData, state: LifeState): GameEvent[] {
  return data.events.filter(
    (e) =>
      state.age >= e.ageMin &&
      state.age <= e.ageMax &&
      !(e.once !== false && state.fired.has(e.id)) &&
      (!e.when || evalCondition(e.when, state)),
  );
}

export function advanceToEvent(state: LifeState, data: LifeData, rng: Rng): GameEvent | null {
  while (state.age < MAX_AGE && !state.dead) {
    state.age += 1;
    drift(state);
    recordCurve(state);
    if (state.props.health <= 0) {
      state.dead = true;
      break;
    }
    if (rng() < EVENT_CHANCE) {
      const pick = pickWeighted(eligibleEvents(data, state), (e) => e.weight, rng);
      if (pick) return pick;
    }
  }
  return null;
}

export function applyChoice(state: LifeState, event: GameEvent, optionIndex: number): LogEntry {
  const option = event.options[optionIndex];
  if (!option) throw new Error(`Invalid option ${optionIndex} for event ${event.id}`);
  applyEffects(state, option.effects);
  for (const f of option.setFlags ?? []) state.flags.add(f);
  for (const f of option.clearFlags ?? []) state.flags.delete(f);
  state.fired.add(event.id);
  const entry: LogEntry = {
    age: state.age,
    title: event.title,
    text: event.text,
    label: option.label,
    outcome: option.outcome,
    delta: option.effects ?? {},
  };
  state.log.push(entry);
  if (state.props.health <= 0) state.dead = true;
  return entry;
}

export function finishLife(state: LifeState, data: LifeData): { ending: Ending; achievements: Achievement[] } {
  if (state.dead) state.flags.add('dead');
  const ordered = [...data.endings].sort((a, b) => b.priority - a.priority);
  const ending = ordered.find((e) => evalCondition(e.when, state));
  if (!ending) throw new Error('No ending matched; add a fallback ending');
  const achievements = data.achievements.filter((a) => evalCondition(a.when, state));
  return { ending, achievements };
}

export function runLife(
  data: LifeData,
  rng: Rng,
  choose: (event: GameEvent, rng: Rng) => number = (event, r) => Math.floor(r() * event.options.length),
): LifeResult {
  const state = createLife(data, rng);
  let guard = 0;
  let event = advanceToEvent(state, data, rng);
  while (event) {
    applyChoice(state, event, choose(event, rng));
    event = advanceToEvent(state, data, rng);
    if (++guard > 1000) throw new Error('Life loop guard exceeded');
  }
  const { ending, achievements } = finishLife(state, data);
  return { state, ending, achievements };
}
