# 做题区.org

一个讽刺"唯分数论"和内卷文化的整活网站。我们讽刺的是评价体系，不是做题的人。

## 包含的模块

| 路径 | 模块 | 说明 |
|---|---|---|
| `/wiki` | 黑话 Wiki | 做题区与学生黑话词典，支持搜索、分类、随机，可投稿 |
| `/chaogang` | 超纲解法生成器 | 自己填题目参数，或随机出一题，再配一套用不着的高阶解法；答案用 mathjs 实际计算并校验 |
| `/restart` | 做题区版人生重开 | 自选天赋、按固定总和分配属性，逐年事件、结局与成就，附人生曲线 |
| `/run` | 做题区快跑 | 无尽跑酷，Canvas 2D 实现，支持触屏、键盘与全屏 |
| `/gaokao` | 模拟志愿 | 按省份、分数或位次和选科，给出冲、稳、保参考；全部在浏览器本地计算 |
| `/gaokao/schools` | 院校查询 | 按省份、层次、地区、关键词筛选，查看近几年分数线 |
| `/about`、`/privacy` | 关于与隐私 | 致谢、许可证、隐私说明 |

ZTQI 做题区指数量表是另一个项目。本站把它的 `site/` 静态站同步到 `public/ztqi/`，首页入口默认指向站内 `/ztqi/`。同步后的目录包含量表、研究论文、问卷与答题卡的 PDF/TeX，来源 commit 记录在 [`docs/ztqi-sync.json`](./docs/ztqi-sync.json)。

## 技术栈

- Astro 7 + TypeScript，纯静态输出
- Vitest 做单元测试；`scripts/smoke-e2e.mjs` 用本机浏览器做端到端冒烟测试
- 中文搜索使用 MiniSearch，并自定义 CJK 切词
- 公式渲染使用 KaTeX，题目计算使用 mathjs
- 词条使用 Astro content collections，frontmatter 由 zod 校验

## 本地开发

```bash
npm install
npm run dev        # 开发服务器
npm test           # 单元测试
npm run typecheck  # 类型检查
npm run build      # 构建到 dist/
npm run preview    # 预览构建结果
```

端到端冒烟测试（需要先 `npm run build` 并启动 `npm run preview`）：

```bash
node scripts/smoke-e2e.mjs
```

## 配置

ZTQI 默认使用站内的 `/ztqi/`。如果把它部署在别处，可以复制 `.env.example` 为 `.env` 并填写外部地址：

```
PUBLIC_ZTQI_URL=https://example.com/ztqi
```

更新站内 ZTQI 内容时，从来源仓库同步 `site/`（只同步对外发布的静态站，不复制私有源材料）：

```bash
node scripts/sync-ztqi.mjs                 # 从 B5-Software/ZTQI-dev 克隆后同步
node scripts/sync-ztqi.mjs <本地仓库路径>   # 或使用已有的本地检出
```

## 参与贡献

### 投稿黑话词条

点击 Wiki 页面的"我要补充"会打开 GitHub 投稿模板。词条规范见 [`content/wiki/CONTRIBUTING.md`](./content/wiki/CONTRIBUTING.md)。要点：

- 客观描述，不引战，不放真实个人信息
- 出处必须能查到；查不到就写"待考证"，不要编造
- 带贬义的词必须在 `note` 中说明贬义和语义流变

### 录取数据

目前的 `public/data/gaokao/` 是由 `scripts/make-demo-gaokao.mjs` 生成的**虚构演示数据**。

收录真实数据需要满足：

- 只使用各省教育考试院和阳光高考等**官方公开**的数据，不爬取商业志愿平台
- 每条记录带 `sourceUrl` 与 `fetchedAt`
- 数据文件格式与校验规则见 `src/lib/gaokao/schema.ts`，`npm test` 会校验所有数据文件

## 隐私

本站不收集个人信息。成绩、选科和志愿只在浏览器本地计算，不会上传。本地只保存快跑的最高分和音效开关。详见 [隐私说明](https://做题区.org/privacy)。

## 许可证

- 代码：[MIT](./LICENSE)
- 词条、文案与图像：[CC0 1.0](./LICENSE-CONTENT.md)

## 致谢

- 人生重开的玩法灵感来自 [lifeRestart](https://github.com/VickScarlet/remake)（MIT，版权归神戸小鳥 与 神户小德 所有）。本站的引擎与内容为独立编写。
- 录取演示数据、院校名称全部虚构，与任何真实院校无关。
