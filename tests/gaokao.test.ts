import { describe, expect, it } from 'vitest';
import { matchVolunteers, TIER_RULES, tierOf, type StudentInput } from '../src/lib/gaokao/match';
import { rankToScore, scoreToRank } from '../src/lib/gaokao/rank';
import { meetsRequirement, trackMatches, validateChoice, type StudentChoice } from '../src/lib/gaokao/requirements';
import { validateSemantics, type ProvinceYearData, type ScoreRow } from '../src/lib/gaokao/schema';

const rows: ScoreRow[] = [
  { score: 600, count: 10, cumulative: 10 },
  { score: 590, count: 20, cumulative: 30 },
  { score: 580, count: 30, cumulative: 60 },
  { score: 570, count: 0, cumulative: 60 },
  { score: 560, count: 40, cumulative: 100 },
];

describe('一分一段换算', () => {
  it('分数正好在表中时，取同分最前位次', () => {
    expect(scoreToRank(rows, 600)).toEqual({ rank: 1, status: 'exact' });
    expect(scoreToRank(rows, 590)).toEqual({ rank: 11, status: 'exact' });
    expect(scoreToRank(rows, 580)).toEqual({ rank: 31, status: 'exact' });
  });

  it('同分人数为 0 的分数，位次与下一档一致', () => {
    expect(scoreToRank(rows, 570)?.rank).toBe(61);
  });

  it('分数不在表中时，取较低的一档（偏保守）', () => {
    expect(scoreToRank(rows, 585)).toEqual({ rank: 31, status: 'nearest-lower' });
  });

  it('高于表中最高分时，位次为 1 并标记为估算', () => {
    expect(scoreToRank(rows, 650)).toEqual({ rank: 1, status: 'above-table' });
  });

  it('低于表中最低分时，位次排在所有人之后', () => {
    expect(scoreToRank(rows, 500)).toEqual({ rank: 101, status: 'below-table' });
  });

  it('空表返回 null', () => {
    expect(scoreToRank([], 500)).toBeNull();
  });

  it('位次换算回分数是换算的逆过程（边界）', () => {
    expect(rankToScore(rows, 1)).toBe(600);
    expect(rankToScore(rows, 11)).toBe(590);
    expect(rankToScore(rows, 100)).toBe(560);
  });
});

describe('选科与科类', () => {
  const base: StudentChoice = { examType: 'new-3+1+2', first: '物理', selected: ['化学', '生物'] };

  it('3+1+2 必须选首选科目与两门再选', () => {
    expect(validateChoice({ ...base, first: undefined })).toBeTruthy();
    expect(validateChoice({ ...base, selected: ['化学'] })).toBeTruthy();
    expect(validateChoice({ ...base, selected: ['化学', '化学'] })).toBeTruthy();
    expect(validateChoice(base)).toBeNull();
  });

  it('3+3 必须选三门', () => {
    expect(validateChoice({ examType: 'new-3+3', selected: ['物理', '化学'] })).toBeTruthy();
    expect(validateChoice({ examType: 'new-3+3', selected: ['物理', '化学', '生物'] })).toBeNull();
  });

  it('首选科目不符时过滤掉', () => {
    expect(meetsRequirement(base, { firstSubject: '历史' })).toBe(false);
    expect(meetsRequirement(base, { firstSubject: '物理' })).toBe(true);
  });

  it('必选科目必须在选科中', () => {
    expect(meetsRequirement(base, { firstSubject: '物理', all: ['生物'] })).toBe(true);
    expect(meetsRequirement(base, { firstSubject: '物理', all: ['政治'] })).toBe(false);
  });

  it('anyOf 每一组至少满足一门', () => {
    expect(meetsRequirement(base, { anyOf: [['化学', '地理'], ['化学', '生物']] })).toBe(true);
    expect(meetsRequirement(base, { anyOf: [['化学', '地理'], ['思想政治', '地理']] })).toBe(false);
  });

  it('老高考按文理科过滤', () => {
    const li: StudentChoice = { examType: 'old', track: '理科', selected: [] };
    expect(trackMatches(li, '理科')).toBe(true);
    expect(trackMatches(li, '文科')).toBe(false);
    expect(trackMatches(li, undefined)).toBe(true);
  });
});

describe('冲稳保判定', () => {
  it('档位边界', () => {
    expect(tierOf(TIER_RULES.safe)).toBe('保');
    expect(tierOf(TIER_RULES.safe + 0.001)).toBe('稳');
    expect(tierOf(TIER_RULES.stable)).toBe('稳');
    expect(tierOf(TIER_RULES.stable + 0.001)).toBe('冲');
    expect(tierOf(TIER_RULES.reach)).toBe('冲');
    expect(tierOf(TIER_RULES.reach + 0.001)).toBeNull();
  });

  function fixture(overrides: Partial<ProvinceYearData['groups'][number]> = {}): ProvinceYearData {
    const groups = [
      {
        schoolCode: 'S1',
        group: '01组',
        batch: '本科一批',
        requirement: { firstSubject: '物理' as const },
        planCount: 10,
        minScore: 560,
        minRank: 1000,
        sourceUrl: 'test://a',
        fetchedAt: '2026-01-01',
        ...overrides,
      },
    ];
    const year = (y: number, minRank: number, minScore: number) => ({
      meta: { province: 'p', provinceName: 'P', year: y, examType: 'new-3+1+2' as const, demo: true, source: 't', fetchedAt: 't' },
      scoreRanks: rows,
      schools: [{ code: 'S1', name: '学校甲', level: '985' as const, type: '综合', region: '东部' }],
      groups: [{ ...groups[0], minRank, minScore }],
    });
    return year(2025, 1000, 560);
  }

  const input = (score: number): StudentInput => ({
    score,
    choice: { examType: 'new-3+1+2', first: '物理', selected: ['化学', '生物'] },
  });

  it('位次明显优于最低位次判为保，接近判为稳，略差判为冲，远差不出现', () => {
    const data = fixture();
    const safe = matchVolunteers({ rank: 500, choice: input(0).choice }, [data]);
    expect(safe.judgements[0].tier).toBe('保');
    const stable = matchVolunteers({ rank: 1000, choice: input(0).choice }, [data]);
    expect(stable.judgements[0].tier).toBe('稳');
    const reach = matchVolunteers({ rank: 1200, choice: input(0).choice }, [data]);
    expect(reach.judgements[0].tier).toBe('冲');
    const far = matchVolunteers({ rank: 2000, choice: input(0).choice }, [data]);
    expect(far.judgements).toHaveLength(0);
    expect(far.excluded.tooFar).toBe(1);
  });

  it('选科不符的专业组不会出现在结果中', () => {
    const data = fixture({ requirement: { firstSubject: '历史' } });
    const result = matchVolunteers({ rank: 500, choice: input(0).choice }, [data]);
    expect(result.judgements).toHaveLength(0);
    expect(result.excluded.byRequirement).toBe(1);
  });

  it('只有一年数据时给出数据不足的提示', () => {
    const data = fixture();
    const other = { ...data, meta: { ...data.meta, year: 2024 }, groups: [] };
    const result = matchVolunteers({ rank: 500, choice: input(0).choice, maxYears: 3 }, [data, other]);
    expect(result.judgements[0].notes.join()).toMatch(/数据/);
  });

  it('某一年缺数据时，只用有数据的年份', () => {
    const data = fixture();
    const missing = { ...data, meta: { ...data.meta, year: 2024 }, groups: [] };
    const result = matchVolunteers({ rank: 1000, choice: input(0).choice, maxYears: 3 }, [data, missing]);
    expect(result.judgements[0].points.map((p) => p.year)).toEqual([2025]);
  });

  it('分数换算的位次在不同年份不同，按该年的一分一段表计算', () => {
    const y2025 = fixture();
    const y2024 = {
      ...y2025,
      meta: { ...y2025.meta, year: 2024 },
      scoreRanks: rows.map((r) => ({ ...r, cumulative: r.cumulative * 2, count: r.count * 2 })),
      groups: [{ ...y2025.groups[0], minRank: 1000, minScore: 560 }],
    };
    const result = matchVolunteers({ score: 580, choice: input(0).choice }, [y2025, y2024]);
    const byYear = Object.fromEntries(result.judgements[0].points.map((p) => [p.year, p.rank]));
    expect(byYear[2025]).toBe(31);
    expect(byYear[2024]).toBe(61);
  });

  it('输入不合法时抛出错误', () => {
    expect(() => matchVolunteers({ choice: { examType: 'new-3+1+2', selected: [] } }, [fixture()])).toThrow();
    expect(() => matchVolunteers({ choice: input(0).choice }, [fixture()])).toThrow();
  });
});

describe('演示数据校验', () => {
  it('语义校验能抓到明显错误', () => {
    const bad: ProvinceYearData = {
      meta: { province: 'p', provinceName: 'P', year: 2025, examType: 'old', demo: true, source: 't', fetchedAt: 't' },
      scoreRanks: [
        { score: 500, count: 10, cumulative: 10 },
        { score: 510, count: 10, cumulative: 20 },
      ],
      schools: [{ code: 'S1', name: 'x', level: '985', type: 't', region: 'r' }],
      groups: [
        {
          schoolCode: 'NOPE',
          group: 'g',
          batch: 'b',
          requirement: { firstSubject: '物理' },
          planCount: 1,
          minScore: 1,
          minRank: 1,
          sourceUrl: 'u',
          fetchedAt: 'f',
        },
      ],
    };
    const errors = validateSemantics(bad);
    expect(errors.some((e) => e.includes('不存在的院校'))).toBe(true);
    expect(errors.some((e) => e.includes('未按分数降序'))).toBe(true);
    expect(errors.some((e) => e.includes('老高考数据不应包含选科要求'))).toBe(true);
  });
});
