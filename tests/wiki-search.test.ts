import { describe, expect, it } from 'vitest';
import { createWikiSearch, matchingIds, tokenize, type WikiIndexEntry } from '../src/lib/wiki/search';

const entries: WikiIndexEntry[] = [
  {
    id: 'zuotiqu',
    term: '做题区',
    aliases: ['做题蛆', '做题王'],
    category: '梗',
    definition: '做题区是一个黑话。',
  },
  {
    id: 'xiaozhen-zuotijia',
    term: '小镇做题家',
    aliases: [],
    category: '梗',
    definition: '指出身小城镇、靠刷题进入好学校的学生。',
  },
  {
    id: 'neijuan',
    term: '内卷',
    aliases: [],
    category: '网络',
    definition: '同一赛道内无效竞争的状态。',
  },
  {
    id: 'zaoba',
    term: '早八',
    aliases: [],
    category: '校园',
    definition: '早上八点的课。',
  },
];

describe('中文分词', () => {
  it('同时产出整段、单字与双字', () => {
    const tokens = tokenize('做题区');
    expect(tokens).toContain('做题区');
    expect(tokens).toContain('做题');
    expect(tokens).toContain('题区');
    expect(tokens).toContain('区');
  });

  it('英文与数字按词切分并转小写', () => {
    expect(tokenize('ZTQI 2026')).toEqual(expect.arrayContaining(['ztqi', '2026']));
  });
});

describe('Wiki 搜索', () => {
  const search = createWikiSearch(entries);

  it('按词条名搜索', () => {
    expect(matchingIds(search, '做题区')).toEqual(new Set(['zuotiqu']));
  });

  it('按别名搜索', () => {
    expect(matchingIds(search, '做题蛆')).toEqual(new Set(['zuotiqu']));
  });

  it('搜索部分词也能命中', () => {
    expect(matchingIds(search, '小镇')).toEqual(new Set(['xiaozhen-zuotijia']));
  });

  it('按释义搜索', () => {
    expect(matchingIds(search, '无效竞争')).toEqual(new Set(['neijuan']));
  });

  it('空查询返回 null（表示显示全部）', () => {
    expect(matchingIds(search, '   ')).toBeNull();
  });

  it('查不到时返回空集合', () => {
    expect(matchingIds(search, '不存在的词')).toEqual(new Set());
  });
});
