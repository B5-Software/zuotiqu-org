# M0：骨架与摸底

## 做了什么

- 新站放在 `D:\ztq_dot_org` 根目录（已按你的选择），`git init` 为公开仓库根。
- 技术栈：Astro 7 + TypeScript，纯静态输出（`output: 'static'`）。
- ZTQI-dev 只读过目录结构与 README、部署 workflow，**没有修改**。首页只预留入口，地址由环境变量 `PUBLIC_ZTQI_URL` 控制，未配置时显示"入口预留"。
- 设计 token（`src/styles/tokens.css`）：草稿纸底纹、黑笔、红笔批改、蓝色笔迹；支持 `prefers-color-scheme: dark`。
- 通用组件：`BaseLayout`、`Header`、`Footer`、`DisclaimerBar`、`ModuleCard`、`Avatar`。
- 分享：`src/lib/share/card.ts` 用 canvas 生成 1080×1440 分享图，`share.ts` 优先走系统分享，否则下载 PNG。
- 原创头像 `public/avatar/zuotiqu-head.svg`（寸头、黑框眼镜、两撮胡须、翻不齐的校服领口），**不基于原图绘制**。

## 与计划的偏差

| 计划 | 实际 | 原因 |
|---|---|---|
| 头像放 `assets/avatar/` | 放 `public/avatar/` | 直接被页面引用，少一层复制 |
| 每个里程碑一个分支 | 在 `main` 上按里程碑顺序提交 | 骨架与五个模块是一次性搭起来的，拆分支意义不大 |
| 通读 ZTQI 代码 | 只读了目录与 README | 你说了不需要考虑 ZTQI 本身 |

## 没做

- 不做部署（按你的要求）。
- ZTQI 线上地址未知，入口暂未生成链接。

## 已知问题

- 原图的"忠实矢量化"尚未做：版权归属还没有确认（见 `docs/avatar-spec.md`）。
