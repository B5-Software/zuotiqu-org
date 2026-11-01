// 把 ZTQI-dev 仓库的 site/ 静态站同步到 public/ztqi/。
// 只复制 site/ 目录（部署用的静态产物），不复制 paper/、tests/、README 等私有源材料。
// 用法：
//   node scripts/sync-ztqi.mjs                 # 从 GitHub 克隆 B5-Software/ZTQI-dev 后同步
//   node scripts/sync-ztqi.mjs <本地 ZTQI 仓库路径>   # 使用已有的本地检出
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'public', 'ztqi');
const repoUrl = 'https://github.com/B5-Software/ZTQI-dev.git';

let source = process.argv[2] ? resolve(process.argv[2]) : null;
let tempDir = null;
if (!source) {
  tempDir = mkdtempSync(join(tmpdir(), 'ztqi-'));
  execFileSync('git', ['clone', '--depth', '1', repoUrl, tempDir], { stdio: 'inherit' });
  source = tempDir;
}

const siteDir = join(source, 'site');
if (!existsSync(join(siteDir, 'index.html'))) {
  throw new Error(`找不到 ${siteDir}/index.html，请确认来源仓库正确`);
}

let commit = 'unknown';
try {
  commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  // 非 git 检出时忽略版本号
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(siteDir, target, { recursive: true });

// ZTQI 页面没有图标链接，浏览器会请求根目录 /favicon.ico 并得到 404。
// 同步时注入站点统一图标，避免控制台报错。
const indexPath = join(target, 'index.html');
const iconLink = '<link rel="icon" href="/avatar/zuotiqu-head.svg" type="image/svg+xml" />';
const html = readFileSync(indexPath, 'utf8');
if (!html.includes('rel="icon"')) {
  writeFileSync(indexPath, html.replace('</head>', `  ${iconLink}\n</head>`), 'utf8');
}

mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(
  join(root, 'docs', 'ztqi-sync.json'),
  JSON.stringify({ repo: 'B5-Software/ZTQI-dev', path: 'site/', commit, syncedAt: new Date().toISOString() }, null, 2) + '\n',
  'utf8',
);

if (tempDir) rmSync(tempDir, { recursive: true, force: true });
console.log(`synced ZTQI site/ (${commit.slice(0, 7) || 'unknown'}) -> public/ztqi/`);
