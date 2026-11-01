// 生成录取模拟用的演示数据。所有院校、专业组与分数线均为虚构，仅用于功能演示。
// 运行：node scripts/make-demo-gaokao.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'gaokao');
const FETCHED_AT = '2026-10-31';
const SOURCE = 'synthetic://demo-generator';
const NOTE = 'DEMO：学校、专业组与分数线均为虚构，仅用于演示功能，不代表任何真实院校的数据。';

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const SCHOOLS = [
  { code: 'DA001', name: '示例理工大学甲', level: '985', type: '理工', region: '东部', percentile: [0.02, 0.04], batch: '本科一批' },
  { code: 'DA002', name: '示例综合大学乙', level: '985', type: '综合', region: '东部', percentile: [0.03, 0.05], batch: '本科一批' },
  { code: 'DA003', name: '示例师范大学丙', level: '211', type: '师范', region: '中部', percentile: [0.06, 0.09], batch: '本科一批' },
  { code: 'DA004', name: '示例财经学院丁', level: '211', type: '财经', region: '西部', percentile: [0.07, 0.11], batch: '本科一批' },
  { code: 'DA005', name: '示例医科大学戊', level: '双一流', type: '医药', region: '中部', percentile: [0.05, 0.08], batch: '本科一批' },
  { code: 'DA006', name: '示例工业大学己', level: '普通本科', type: '理工', region: '西部', percentile: [0.16, 0.22], batch: '本科二批' },
  { code: 'DA007', name: '示例外国语学院庚', level: '普通本科', type: '语言', region: '东部', percentile: [0.18, 0.25], batch: '本科二批' },
  { code: 'DA008', name: '示例农林学院辛', level: '普通本科', type: '农林', region: '中部', percentile: [0.28, 0.34], batch: '本科二批' },
  { code: 'DA009', name: '示例科技学院壬', level: '普通本科', type: '理工', region: '东部', percentile: [0.3, 0.38], batch: '本科二批' },
  { code: 'DA010', name: '示例职业技术学院癸', level: '专科', type: '职业', region: '西部', percentile: [0.62, 0.78], batch: '专科批' },
  { code: 'DA011', name: '示例艺术学院子', level: '普通本科', type: '艺术', region: '中部', percentile: [0.4, 0.5], batch: '本科二批' },
  { code: 'DA012', name: '示例大学巳', level: '双一流', type: '综合', region: '西部', percentile: [0.1, 0.14], batch: '本科一批' },
];

const NEW_REQS = [
  { firstSubject: '物理', all: ['化学'] },
  { firstSubject: '物理' },
  { firstSubject: '历史', anyOf: [['思想政治', '地理']] },
  { firstSubject: '历史' },
  {},
  { firstSubject: '物理', all: ['生物'] },
];

function normalPdf(x, mean, sd) {
  return Math.exp(-((x - mean) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
}

function buildScoreRows(total, mean, sd, track) {
  const rows = [];
  for (let score = 750; score >= 0; score--) {
    const count = Math.round(total * normalPdf(score, mean, sd));
    rows.push({ ...(track ? { track } : {}), score, count, cumulative: 0 });
  }
  let cum = 0;
  for (const r of rows) {
    cum += r.count;
    r.cumulative = cum;
  }
  return rows;
}

function scoreAtRank(rows, rank) {
  for (const r of rows) {
    if (r.cumulative >= rank) return r.score;
  }
  return rows[rows.length - 1].score;
}

function yearFactor(year, rng) {
  const base = year === 2024 ? 1 : 1 + (rng() - 0.5) * 0.16;
  return base * (1 + (rng() - 0.5) * 0.04);
}

function buildYear({ province, provinceName, year, examType, rows, schools, groupsFor, rng }) {
  const groups = [];
  for (const school of schools) {
    groupsFor(school).forEach((spec, idx) => {
      const trackRows = spec.track ? rows.filter((r) => r.track === spec.track) : rows;
      const total = trackRows.reduce((sum, r) => sum + r.count, 0);
      const pct = school.percentile[0] + (school.percentile[1] - school.percentile[0]) * rng();
      const minRank = Math.max(1, Math.round(total * pct * yearFactor(year, rng)));
      groups.push({
        schoolCode: school.code,
        group: `${String(idx + 1).padStart(2, '0')}组`,
        batch: school.batch,
        ...(spec.track ? { track: spec.track } : {}),
        requirement: spec.requirement,
        planCount: 20 + Math.floor(rng() * 60),
        minScore: scoreAtRank(trackRows, minRank),
        minRank,
        sourceUrl: SOURCE,
        fetchedAt: FETCHED_AT,
      });
    });
  }
  return {
    meta: { province, provinceName, year, examType, demo: true, source: SOURCE, fetchedAt: FETCHED_AT, note: NOTE },
    scoreRanks: rows,
    schools: schools.map(({ code, name, level, type, region }) => ({ code, name, level, type, region })),
    groups,
  };
}

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('wrote', path);
}

for (const year of [2024, 2025]) {
  const rng = lcg(year * 7 + 1);
  const rows = buildScoreRows(60000, 430, 85, undefined);
  const data = buildYear({
    province: 'demo-a',
    provinceName: '示例省甲',
    year,
    examType: 'new-3+1+2',
    rows,
    schools: SCHOOLS,
    groupsFor: (school) => {
      const offset = Number(school.code.slice(2)) % NEW_REQS.length;
      return [{ requirement: NEW_REQS[offset] }, { requirement: NEW_REQS[(offset + 2) % NEW_REQS.length] }];
    },
    rng,
  });
  write(join(root, 'demo-a', `${year}.json`), data);
}

{
  const rng = lcg(2025);
  const rows = [
    ...buildScoreRows(30000, 440, 90, '理科'),
    ...buildScoreRows(30000, 420, 80, '文科'),
  ];
  const data = buildYear({
    province: 'demo-b',
    provinceName: '示例省乙',
    year: 2025,
    examType: 'old',
    rows,
    schools: SCHOOLS.filter((s) => s.level !== '专科'),
    groupsFor: (school) => {
      const groups = [{ track: '理科', requirement: {} }];
      if (school.type !== '理工' && school.type !== '医药') groups.push({ track: '文科', requirement: {} });
      return groups;
    },
    rng,
  });
  write(join(root, 'demo-b', '2025.json'), data);
}

write(join(root, 'index.json'), [
  { province: 'demo-a', provinceName: '示例省甲', years: [2024, 2025], examType: 'new-3+1+2', demo: true },
  { province: 'demo-b', provinceName: '示例省乙', years: [2025], examType: 'old', demo: true },
]);
