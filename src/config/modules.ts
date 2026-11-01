export type ModuleStatus = 'live' | 'soon';

export interface SiteModule {
  id: 'wiki' | 'chaogang' | 'restart' | 'run' | 'gaokao';
  title: string;
  href: string;
  summary: string;
  status: ModuleStatus;
}

export const modules: SiteModule[] = [
  {
    id: 'wiki',
    title: '黑话 Wiki',
    href: '/wiki',
    summary: '做题区与学生黑话词典，可以投稿补充。',
    status: 'live',
  },
  {
    id: 'chaogang',
    title: '超纲解法生成器',
    href: '/chaogang',
    summary: '给简单题配一套用不着的高阶解法，最后给出正确答案。',
    status: 'live',
  },
  {
    id: 'restart',
    title: '做题区版人生重开',
    href: '/restart',
    summary: '在分数、卷度和天赋之间重开一局人生。',
    status: 'live',
  },
  {
    id: 'run',
    title: '做题区快跑',
    href: '/run',
    summary: '无尽跑酷，躲开作业堆，收集满分卷。',
    status: 'live',
  },
  {
    id: 'gaokao',
    title: '录取数据与模拟志愿',
    href: '/gaokao',
    summary: '按位次看冲、稳、保，全部在本机计算。',
    status: 'live',
  },
];
