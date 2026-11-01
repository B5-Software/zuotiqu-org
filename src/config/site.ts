export const site = {
  name: '做题区.org',
  tagline: '唯分数论之外，还有一整片草稿纸。',
  ztqiUrl: import.meta.env.PUBLIC_ZTQI_URL || '',
  repoUrl: 'https://github.com/B5-Software/zuotiqu-org',
  wikiNewIssueUrl:
    'https://github.com/B5-Software/zuotiqu-org/issues/new?template=wiki-entry.yml',
  license: {
    code: 'MIT',
    content: 'CC0 1.0',
  },
} as const;

export const disclaimers = {
  gaokao:
    '本页数据仅供娱乐和参考，不构成填报建议。以各省教育考试院和院校官方发布为准。你输入的成绩和志愿只在本机计算，不会上传。',
  privacy: '本站不收集个人信息。成绩、志愿等输入只在浏览器本地计算。',
} as const;
