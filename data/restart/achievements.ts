import type { Achievement } from '../../src/lib/restart/types';

export const achievements: Achievement[] = [
  {
    id: 'break_the_ruler',
    name: '跳出那把尺子',
    description: '在评价以外，找到了一件让你安静下来的事。',
    when: { flag: 'off_ladder' },
  },
  {
    id: 'outside_bookmark',
    name: '题外的书签',
    description: '书架上有一本不在大纲里的书，书签停在中间。',
    when: { all: [{ talent: 'outside_book_reader' }, { flag: 'off_ladder' }] },
  },
  {
    id: 'third_page_draft',
    name: '草稿纸翻到第三面',
    description: '一张草稿纸被用到了背面，还在继续。',
    when: { talent: 'paper_draft_perpetual' },
  },
  {
    id: 'on_time_leave',
    name: '准时下班的人',
    description: '电梯门打开的时候，时间刚刚好。',
    when: { flag: 'clocked_out' },
  },
  {
    id: 'two_am_light',
    name: '凌晨两点的灯',
    description: '写字楼的灯还亮着，你也在里面。',
    when: { flag: 'overtime' },
  },
  {
    id: 'juan_peak',
    name: '卷到顶',
    description: '卷度冲到了顶端，身体和快乐的指标也在同一时间往下走。',
    when: { prop: 'juan', op: '>=', value: 85 },
  },
  {
    id: 'full_score_day',
    name: '满分的一天',
    description: '分数冲到了九十五以上，那一刻没有人问你为什么。',
    when: { prop: 'grade', op: '>=', value: 95 },
  },
  {
    id: 'full_network',
    name: '人缘满格',
    description: '群里的每一条消息，都有人回应。',
    when: { prop: 'network', op: '>=', value: 85 },
  },
  {
    id: 'calligraphy_steady',
    name: '字比字帖稳',
    description: '写完一张纸，最后一笔没有抖。',
    when: { flag: 'calligraphy' },
  },
  {
    id: 'first_tree_mountain',
    name: '山里的第一棵树',
    description: '树苗已经长到了膝盖的高度。',
    when: { flag: 'planted_trees' },
  },
  {
    id: 'body_first',
    name: '身体先说了算',
    description: '体力指标保持在高位，身体比任何人都诚实。',
    when: { prop: 'health', op: '>=', value: 80 },
  },
  {
    id: 'cooking_lesson',
    name: '会做饭的人',
    description: '第一道菜的蛋有点老，但它是你自己做的。',
    when: { flag: 'learned_cooking' },
  },
];
