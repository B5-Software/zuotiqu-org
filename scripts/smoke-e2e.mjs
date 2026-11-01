// 端到端冒烟测试：用本机 Chromium 内核浏览器打开预览站点，走一遍主要交互。
// 运行前先执行 npm run build && npm run preview，然后：
//   node scripts/smoke-e2e.mjs
// 可用环境变量 BROWSER_PATH 指定浏览器（默认尝试 Edge、Chrome），BASE_URL 指定站点地址。
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4321';
const candidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) throw new Error('找不到可用的浏览器，请设置 BROWSER_PATH');

const errors = [];
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});

async function open(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
}

try {
  // 首页：ZTQI 入口预留、模块卡片
  await open('/');
  check('首页有五个模块卡片', (await page.locator('.grid-cards a.card').count()) === 5);
  check('ZTQI 入口预留（未配置地址）', (await page.getByText('入口预留').count()) === 1);

  // Wiki：搜索别名、随机
  await open('/wiki');
  await page.fill('#wiki-q', '做题蛆');
  await page.waitForTimeout(300);
  const visibleWiki = await page.locator('#wiki-list li:not([hidden])').count();
  check('Wiki 按别名搜索只剩 1 条', visibleWiki === 1, `visible=${visibleWiki}`);
  await page.fill('#wiki-q', '');
  await page.waitForTimeout(200);
  check('Wiki 清空搜索后显示全部', (await page.locator('#wiki-list li:not([hidden])').count()) === 15);
  await page.fill('#wiki-q', '不存在的词汇');
  await page.waitForTimeout(200);
  check('Wiki 查不到时显示投稿提示', await page.locator('#wiki-empty').isVisible());

  // 超纲解法：出题、解法数量、评级
  await open('/chaogang');
  await page.click('#generate');
  check('超纲解法出题后有 3 个解法', (await page.locator('.solution').count()) === 3);
  check('超纲解法有评级标签', (await page.locator('[data-rating]').count()) === 1);
  await page.selectOption('#template', 'gcd');
  await page.click('#generate');
  check('超纲解法可指定题型', (await page.locator('.problem-head h2').textContent())?.includes('最大公约数') ?? false);

  // 人生重开：走完一局到结局
  await open('/restart');
  await page.click('[data-action="start"]');
  await page.click('[data-action="next"]');
  let rounds = 0;
  while (rounds < 400) {
    rounds++;
    if (await page.locator('[data-action="share"]').count()) break;
    const choose = page.locator('[data-action="choose"]').first();
    if (await choose.count()) {
      await choose.click();
      await page.click('[data-action="next"]');
    } else {
      await page.click('[data-action="next"]');
    }
  }
  check('人生重开能走到结局', (await page.locator('[data-action="share"]').count()) === 1, `rounds=${rounds}`);
  check('人生重开结局有人生曲线', (await page.locator('svg.curve').count()) === 1);

  // 快跑：开始、跳跃、分数增长
  await open('/run');
  await page.click('[data-action="start"]');
  await page.waitForTimeout(1500);
  const score1 = Number(await page.locator('#hud-score').textContent());
  check('快跑开始后卷度增长', score1 > 0, `score=${score1}`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyP');
  check('快跑按 P 可暂停', (await page.locator('#run-overlay').textContent())?.includes('已暂停') ?? false);
  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => document.querySelector('[data-action="restart"]') !== null, null, { timeout: 60000 });
  check('快跑撞上障碍后出现结算', await page.getByText('再跑一局').isVisible());

  // 录取：计算参考、加入志愿表
  await open('/gaokao');
  await page.waitForSelector('#g-province option[value="demo-a"]', { state: 'attached' });
  await page.selectOption('#g-province', 'demo-a');
  await page.fill('#g-value', '580');
  await page.check('input[name="subject"][value="化学"]');
  await page.check('input[name="subject"][value="生物"]');
  await page.click('#g-submit');
  await page.waitForSelector('#g-results h3', { timeout: 15000 });
  const tierHeadings = await page.locator('#g-results .tier h3').allTextContents();
  check('录取结果有冲、稳、保三档', tierHeadings.length === 3, tierHeadings.join(' / '));
  check('录取结果有演示数据提示', (await page.getByText('演示数据').count()) >= 1);
  const addBtn = page.locator('#g-results [data-add]').first();
  if (await addBtn.count()) {
    await addBtn.click();
    check('加入志愿表后出现列表', (await page.locator('.vol-item').count()) === 1);
  } else {
    check('加入志愿表后出现列表', false, '结果为空，无法加入');
  }
  await page.selectOption('#g-province', 'demo-a');
  await page.fill('#g-value', '');
  await page.click('#g-submit');
  check('分数为空时给出提示', (await page.locator('#g-error').textContent())?.includes('请输入分数') ?? false);

  // 院校查询
  await open('/gaokao/schools');
  await page.waitForFunction(() => document.querySelectorAll('#s-list .school').length > 0, null, { timeout: 15000 });
  const total = await page.locator('#s-list .school').count();
  check('院校查询列出院校', total > 0, `count=${total}`);
  await page.selectOption('#s-level', '985');
  check('院校查询按层次筛选', (await page.locator('#s-list .school').count()) === 2);
} catch (err) {
  check('脚本执行未中断', false, err instanceof Error ? err.message : String(err));
} finally {
  await browser.close();
}

const realErrors = errors.filter((e) => !e.includes('favicon'));
check('页面无脚本错误', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 项通过`);
process.exit(failed.length ? 1 : 0);
