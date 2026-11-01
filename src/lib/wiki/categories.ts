export const WIKI_CATEGORIES = ['梗', '学习', '考试', '校园', '网络'] as const;
export type WikiCategory = (typeof WIKI_CATEGORIES)[number];
