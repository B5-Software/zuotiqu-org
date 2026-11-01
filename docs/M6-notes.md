# M6：收尾

## 做了什么

- 首页：ZTQI 入口（预留）、五个模块卡片、统一头像。
- SEO：每页有 title、description、canonical、og 基础字段；`@astrojs/sitemap` 生成 `sitemap-index.xml`；`public/robots.txt` 指向 sitemap。
- 可访问性：跳到正文链接、可见的焦点样式、按钮最小触控尺寸 44px、`prefers-reduced-motion` 时关闭动画、快跑画面 `aria-label`、结果区域 `aria-live`。
- 隐私说明页：`/privacy`，写明不收集个人信息，只保存快跑最高分和音效开关。
- 关于页：`/about`，致谢 lifeRestart（MIT，版权人与原仓库）、许可证、头像与数据的说明。
- 许可证：代码 MIT（`LICENSE`），内容与图像 CC0 1.0（`LICENSE-CONTENT.md`）。
- README：项目介绍、本地开发、配置、投稿与数据贡献、隐私、许可证、致谢。
- CI：`.github/workflows/ci.yml`，执行 typecheck、test、build。**不包含部署。**
- 验证：
  - `npm run typecheck`（astro check + tsc）无错误。
  - `npm test` 全部通过。
  - `npm run build` 生成 30 个页面。
  - `scripts/smoke-e2e.mjs`：用本机 Edge 跑端到端冒烟，20 项通过。覆盖首页、Wiki 搜索、超纲解法出题、人生重开走完一局、快跑开始/暂停/结算、录取计算/加入志愿表/校验提示、院校查询与筛选，以及页面无脚本错误。

## 没做

- OG 图（需要 PNG 资源；SVG 大多数平台不识别）。
- 性能：没有跑 Lighthouse。
- 真机测试（触屏、移动端布局）。
- 部署（按你的要求）。

## 已知问题

- 构建时有一个 chunk 超过 500KB 的警告：`/chaogang` 的 JS 约 570KB（未压缩），主要是 KaTeX 与 mathjs。只影响这一页和快跑所在页。
- 大体积 chunk 的警告保留未处理。
