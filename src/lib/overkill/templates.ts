import {
  addDependencies,
  create,
  divideDependencies,
  evaluateDependencies,
  multiplyDependencies,
  parseDependencies,
  piDependencies,
  powDependencies,
  sqrtDependencies,
  subtractDependencies,
  unaryMinusDependencies,
} from 'mathjs';

const math = create({
  addDependencies,
  divideDependencies,
  evaluateDependencies,
  multiplyDependencies,
  parseDependencies,
  piDependencies,
  powDependencies,
  sqrtDependencies,
  subtractDependencies,
  unaryMinusDependencies,
});

const evaluate = (expr: string) => math.evaluate(expr);

export type Rng = () => number;
export type Tier = 1 | 2 | 3 | 4 | 5;

export interface Solution {
  title: string;
  tier: Tier;
  steps: string[];
}

export interface Built {
  statement: string;
  answer: string;
  solutions: Solution[];
}

export interface OverkillTemplate {
  id: string;
  title: string;
  grade: '小学' | '初中' | '高中';
  build: (rng: Rng) => Built;
}

const int = (rng: Rng, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
const sgn = (n: number): string => (n < 0 ? `-${-n}` : `+${n}`);
const fmt = (v: number): string => String(Math.round(v * 100) / 100);
const eq = (v: number): string => (Number.isInteger(v) ? String(v) : String.raw`\approx ${fmt(v)}`);

function factorize(n: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let m = n;
  for (let p = 2; p * p <= m; p++) {
    let k = 0;
    while (m % p === 0) {
      m /= p;
      k++;
    }
    if (k > 0) out.push([p, k]);
  }
  if (m > 1) out.push([m, 1]);
  return out;
}

function factorText(f: Array<[number, number]>): string {
  if (f.length === 0) return '1';
  return f.map(([p, k]) => (k === 1 ? `${p}` : String.raw`${p}^{${k}}`)).join(String.raw`\times `);
}

function euclid(a: number, b: number): { steps: string[]; g: number } {
  const steps: string[] = [];
  let x = Math.max(a, b);
  let y = Math.min(a, b);
  while (y !== 0) {
    const q = Math.floor(x / y);
    const r = x % y;
    steps.push(String.raw`$${x}=${y}\times${q}+${r}$`);
    x = y;
    y = r;
  }
  steps.push(String.raw`余数为 $0$ 时，除数即为最大公约数 $${x}$。`);
  return { steps, g: x };
}

const linear: OverkillTemplate = {
  id: 'linear',
  title: '一元一次方程',
  grade: '初中',
  build(rng) {
    const a = int(rng, 2, 9) * (rng() < 0.3 ? -1 : 1);
    const x = int(rng, -9, 9);
    const b = int(rng, 1, 20) * (rng() < 0.5 ? -1 : 1);
    const c = a * x + b;
    const value = Number(evaluate(`(${c} - (${b})) / (${a})`));
    const g = String.raw`${a}x${sgn(b)}-${c}`;
    return {
      statement: String.raw`解方程 $${a}x${sgn(b)}=${c}$`,
      answer: String.raw`$x=${value}$`,
      solutions: [
        {
          title: '拉格朗日乘数法',
          tier: 4,
          steps: [
            String.raw`把方程看作约束优化问题，目标函数取 $f(x)=0$。`,
            String.raw`约束条件为 $g(x)=${g}=0$。`,
            String.raw`构造拉格朗日函数 $\mathcal{L}(x,\lambda)=f(x)-\lambda g(x)$。`,
            String.raw`令 $\partial\mathcal{L}/\partial x=0$，得 $\lambda=0$。这一步对结果没有任何贡献。`,
            String.raw`回代约束，解得 $x=${value}$。`,
          ],
        },
        {
          title: '不动点定理',
          tier: 3,
          steps: [
            String.raw`令 $\varphi(x)=x-\frac{${g}}{${a}}$，于是方程等价于 $x=\varphi(x)$。`,
            String.raw`化简得 $\varphi(x)\equiv\frac{${c}${sgn(-b)}}{${a}}$，这是一个常值映射。`,
            String.raw`常值映射的压缩常数为 $0$，由 Banach 不动点定理，不动点唯一，即 $x^*=${value}$。`,
          ],
        },
        {
          title: '牛顿迭代法',
          tier: 2,
          steps: [
            String.raw`令 $f(x)=${g}$，则 $f'(x)=${a}$。`,
            String.raw`取初值 $x_0=0$，迭代 $x_{n+1}=x_n-\frac{f(x_n)}{f'(x_n)}$。`,
            String.raw`$f(0)=${b - c}$，故 $x_1=0-\frac{${b - c}}{${a}}=${value}$。`,
            String.raw`线性函数的牛顿迭代一步就收敛，第二步可以省略。`,
          ],
        },
      ],
    };
  },
};

const addition: OverkillTemplate = {
  id: 'addition',
  title: '一加一（加法）',
  grade: '小学',
  build(rng) {
    const a = int(rng, 1, 9);
    const b = int(rng, 1, 9);
    const s = a + b;
    return {
      statement: String.raw`计算 $${a}+${b}$`,
      answer: String.raw`$${s}$`,
      solutions: [
        {
          title: '皮亚诺公理',
          tier: 5,
          steps: [
            String.raw`令 $0$ 为自然数，后继函数 $S$ 满足皮亚诺公理。`,
            String.raw`记 $${a}=S^{${a}}(0)$，$${b}=S^{${b}}(0)$。`,
            String.raw`由递归定义 $m+S(n)=S(m+n)$ 与 $m+0=m$，逐步展开得 $${a}+${b}=S^{${s}}(0)$。`,
            String.raw`$S^{${s}}(0)$ 即为 $${s}$。`,
          ],
        },
        {
          title: '集合的基数',
          tier: 2,
          steps: [
            String.raw`构造两个不相交的有限集合 $A$、$B$，满足 $|A|=${a}$，$|B|=${b}$。`,
            String.raw`不相交时，并集的基数满足 $|A\cup B|=|A|+|B|$。`,
            String.raw`因此 $|A\cup B|=${s}$。`,
          ],
        },
        {
          title: '模 100 的加法群',
          tier: 3,
          steps: [
            String.raw`在群 $\mathbb{Z}/100\mathbb{Z}$ 中计算。`,
            String.raw`运算封闭，且 $${a}+${b}=${s}<100$，因此无需取模。`,
            String.raw`结果为 $${s}$。`,
          ],
        },
      ],
    };
  },
};

const shortestPath: OverkillTemplate = {
  id: 'shortest-path',
  title: '两点间最短距离',
  grade: '初中',
  build(rng) {
    const x1 = int(rng, -9, 9);
    const y1 = int(rng, -9, 9);
    let x2 = int(rng, -9, 9);
    let y2 = int(rng, -9, 9);
    while (x1 === x2 && y1 === y2) {
      x2 = int(rng, -9, 9);
      y2 = int(rng, -9, 9);
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const value = Number(evaluate(`sqrt((${dx})^2 + (${dy})^2)`));
    const ans = eq(value);
    return {
      statement: String.raw`平面上两点 $P_1(${x1},${y1})$、$P_2(${x2},${y2})$，求两点间的最短距离。`,
      answer: String.raw`$${ans}$`,
      solutions: [
        {
          title: '变分法',
          tier: 4,
          steps: [
            String.raw`设连接两点的曲线为 $y(x)$，弧长泛函为 $J[y]=\int\sqrt{1+y'^2}\,dx$。`,
            String.raw`对 $J$ 取变分，得欧拉–拉格朗日方程 $\frac{d}{dx}\frac{y'}{\sqrt{1+y'^2}}=0$。`,
            String.raw`由此 $y''=0$，最优曲线是直线。`,
            String.raw`代入两端点计算，得最短距离 $${ans}$。`,
          ],
        },
        {
          title: '黎曼几何',
          tier: 5,
          steps: [
            String.raw`在度量 $ds^2=dx^2+dy^2$ 下求两点间的测地线长度。`,
            String.raw`测地线方程为 $\ddot{\gamma}^k+\Gamma^k_{ij}\dot{\gamma}^i\dot{\gamma}^j=0$，平直空间的克氏符号 $\Gamma^k_{ij}$ 全部为零。`,
            String.raw`因此测地线就是直线，积分弧长 $\int ds$ 得 $${ans}$。`,
          ],
        },
        {
          title: '勾股定理',
          tier: 1,
          steps: [
            String.raw`以横向距离 $${Math.abs(dx)}$、纵向距离 $${Math.abs(dy)}$ 作为直角边。`,
            String.raw`由勾股定理，斜边即为所求距离，得 $${ans}$。`,
          ],
        },
      ],
    };
  },
};

const arithmeticSum: OverkillTemplate = {
  id: 'arithmetic-sum',
  title: '1 加到 n',
  grade: '初中',
  build(rng) {
    const n = int(rng, 5, 100);
    const value = Number(evaluate(`${n} * (${n} + 1) / 2`));
    return {
      statement: String.raw`计算 $1+2+3+\cdots+${n}$`,
      answer: String.raw`$${value}$`,
      solutions: [
        {
          title: '拉格朗日插值',
          tier: 4,
          steps: [
            String.raw`设部分和 $S_n=1+2+\cdots+n$ 是关于 $n$ 的多项式，已知其次数不超过 $2$。`,
            String.raw`取 $n=0,1,2$ 三个点，$S_0=0$，$S_1=1$，$S_2=3$。`,
            String.raw`构造二次拉格朗日插值多项式，化简得 $S_n=\frac{n^2+n}{2}$。`,
            String.raw`代入 $n=${n}$，得 $S_{${n}}=${value}$。`,
          ],
        },
        {
          title: '离散积分',
          tier: 3,
          steps: [
            String.raw`把求和视为离散积分：$\sum_{k=1}^{n}k\approx\int_0^n x\,dx=\frac{n^2}{2}$。`,
            String.raw`欧拉–麦克劳林公式给出修正项 $\frac{n}{2}$，两项相加得 $\frac{n^2+n}{2}$。`,
            String.raw`代入 $n=${n}$，结果为 $${value}$。`,
          ],
        },
        {
          title: '高斯配对',
          tier: 1,
          steps: [
            String.raw`把 $1$ 与 $${n}$ 配对，$2$ 与 $${n - 1}$ 配对，依此类推。`,
            String.raw`每对之和为 $${n + 1}$。奇数个时取中间项作修正，结果为 $${value}$。`,
          ],
        },
      ],
    };
  },
};

const triangleAngles: OverkillTemplate = {
  id: 'triangle-angles',
  title: '三角形内角和',
  grade: '小学',
  build(rng) {
    const a = int(rng, 20, 80);
    const b = int(rng, 20, 80);
    const value = 180 - a - b;
    return {
      statement: String.raw`三角形的两个内角分别为 $${a}^\circ$ 和 $${b}^\circ$，求第三个内角。`,
      answer: String.raw`$${value}^\circ$`,
      solutions: [
        {
          title: '高斯–博内公式',
          tier: 5,
          steps: [
            String.raw`平面三角形的高斯曲率处处为零，$\iint K\,dA=0$。`,
            String.raw`由高斯–博内公式，三个外角之和为 $2\pi$，因此内角和为 $\pi$。`,
            String.raw`故第三角为 $180^\circ-${a}^\circ-${b}^\circ=${value}^\circ$。`,
          ],
        },
        {
          title: '球面几何修正',
          tier: 2,
          steps: [
            String.raw`若把三角形画在球面上，内角和会大于 $180^\circ$。`,
            String.raw`但本题画在草稿纸上，所以内角和仍是 $180^\circ$。`,
            String.raw`第三角为 $${value}^\circ$。`,
          ],
        },
        {
          title: '线性代数',
          tier: 3,
          steps: [
            String.raw`设三个内角为未知向量 $(\alpha,\beta,\gamma)$，约束写成 $\begin{pmatrix}1&1&1\end{pmatrix}\begin{pmatrix}\alpha\\\beta\\\gamma\end{pmatrix}=180$。`,
            String.raw`代入 $\alpha=${a}$，$\beta=${b}$，解得 $\gamma=${value}$。`,
          ],
        },
      ],
    };
  },
};

const circleArea: OverkillTemplate = {
  id: 'circle-area',
  title: '圆的面积',
  grade: '初中',
  build(rng) {
    const r = int(rng, 1, 9);
    const value = Number(evaluate(`pi * ${r}^2`));
    const ans = eq(value);
    return {
      statement: String.raw`半径为 $${r}$ 的圆，求面积（结果保留两位小数）。`,
      answer: String.raw`$${ans}$`,
      solutions: [
        {
          title: '莱布尼茨积分',
          tier: 4,
          steps: [
            String.raw`圆面积 $A=\int_0^{${r}}2\pi t\,dt$，其中 $2\pi t$ 是半径为 $t$ 的圆周长。`,
            String.raw`计算得 $A=\pi\cdot ${r}^2$，即 $${ans}$。`,
          ],
        },
        {
          title: '格林公式',
          tier: 4,
          steps: [
            String.raw`由格林公式 $\oint x\,dy=\iint dx\,dy$，取圆周 $x=${r}\cos\theta$，$y=${r}\sin\theta$。`,
            String.raw`$\oint x\,dy=\int_0^{2\pi}${r}^2\cos^2\theta\,d\theta=\pi ${r}^2$，即 $${ans}$。`,
          ],
        },
        {
          title: '蒙特卡洛积分',
          tier: 3,
          steps: [
            String.raw`在边长为 $${2 * r}$ 的正方形内均匀撒点，统计落在圆内的比例 $p$。`,
            String.raw`面积估计为 $(${2 * r})^2 p$。`,
            String.raw`撒点数趋于无穷时，估计值收敛到 $${ans}$。`,
          ],
        },
      ],
    };
  },
};

const chickenRabbit: OverkillTemplate = {
  id: 'chicken-rabbit',
  title: '鸡兔同笼',
  grade: '小学',
  build(rng) {
    const chicken = int(rng, 1, 20);
    const rabbit = int(rng, 1, 20);
    const heads = chicken + rabbit;
    const legs = 2 * chicken + 4 * rabbit;
    const value = Number(evaluate(`(${legs} - 2 * ${heads}) / 2`));
    return {
      statement: String.raw`鸡兔同笼，共 $${heads}$ 个头、$${legs}$ 条腿，问兔有几只？`,
      answer: String.raw`兔 $${value}$ 只，鸡 $${heads - value}$ 只`,
      solutions: [
        {
          title: '线性规划单纯形法',
          tier: 4,
          steps: [
            String.raw`决策变量为鸡数 $c$ 与兔数 $r$，约束为 $c+r=${heads}$，$2c+4r=${legs}$。`,
            String.raw`可行域退化为一个点，单纯形法在第一次迭代时就到达该顶点。`,
            String.raw`解得 $r=${value}$，$c=${heads - value}$。`,
          ],
        },
        {
          title: '矩阵求逆',
          tier: 3,
          steps: [
            String.raw`写成矩阵形式 $\begin{pmatrix}1&1\\2&4\end{pmatrix}\begin{pmatrix}c\\r\end{pmatrix}=\begin{pmatrix}${heads}\\${legs}\end{pmatrix}$。`,
            String.raw`系数矩阵的行列式为 $2\neq 0$，可逆，左乘逆矩阵。`,
            String.raw`得 $r=${value}$。`,
          ],
        },
        {
          title: '拉格朗日乘数法',
          tier: 5,
          steps: [
            String.raw`令目标函数 $f(c,r)=r$，约束为 $g(c,r)=c+r-${heads}=0$ 与 $k(c,r)=2c+4r-${legs}=0$。`,
            String.raw`两个约束确定唯一的可行点，乘子只是把它算出来两次。`,
            String.raw`最终 $r=${value}$。`,
          ],
        },
      ],
    };
  },
};

const percent: OverkillTemplate = {
  id: 'percent',
  title: '求百分之几',
  grade: '小学',
  build(rng) {
    const total = int(rng, 2, 50) * 10;
    const p = [5, 10, 20, 25, 30, 40, 50, 60, 75][int(rng, 0, 8)];
    const value = Number(evaluate(`${total} * ${p} / 100`));
    const ans = fmt(value);
    return {
      statement: String.raw`$${total}$ 的 ${p}% 是多少？`,
      answer: String.raw`$${ans}$`,
      solutions: [
        {
          title: '勒贝格积分',
          tier: 4,
          steps: [
            String.raw`取计数测度 $\mu$，令 $\Omega$ 为含有 $${total}$ 个单位的集合，$\mu(\Omega)=${total}$。`,
            String.raw`子集 $A\subseteq\Omega$ 占比为 ${p}%，由勒贝格积分 $\mu(A)=\int_A d\mu$，得 $\mu(A)=${ans}$。`,
          ],
        },
        {
          title: '概率论',
          tier: 3,
          steps: [
            String.raw`令每个单位独立地以概率 $${p}\%$ 被选中，记随机变量为 $X$。`,
            String.raw`其期望为 $\mathbb{E}[X]=${total}\times${p}\%=${ans}$。`,
          ],
        },
        {
          title: '分数约分',
          tier: 1,
          steps: [
            String.raw`把 ${p}% 写成 $\frac{${p}}{100}$，约分后再乘以 $${total}$。`,
            String.raw`结果为 $${ans}$。`,
          ],
        },
      ],
    };
  },
};

const gcdTemplate: OverkillTemplate = {
  id: 'gcd',
  title: '最大公约数',
  grade: '初中',
  build(rng) {
    const a = int(rng, 6, 120);
    let b = int(rng, 6, 120);
    while (b === a) b = int(rng, 6, 120);
    const { steps: euclidSteps, g } = euclid(a, b);
    const fa = factorize(a);
    const fb = factorize(b);
    const common = fa
      .map(([p, k]) => {
        const kb = fb.find(([q]) => q === p)?.[1] ?? 0;
        return [p, Math.min(k, kb)] as [number, number];
      })
      .filter(([, k]) => k > 0);
    const commonText = factorText(common);
    return {
      statement: String.raw`求 $${a}$ 与 $${b}$ 的最大公约数。`,
      answer: String.raw`$${g}$`,
      solutions: [
        {
          title: '理想论',
          tier: 5,
          steps: [
            String.raw`在整数环 $\mathbb{Z}$ 中，考虑由 $${a}$ 与 $${b}$ 生成的理想 $I=(${a},${b})$。`,
            String.raw`$\mathbb{Z}$ 是主理想整环，故 $I=(d)$，由 Bézout 恒等式可知 $d=\gcd(${a},${b})$。`,
            String.raw`因此 $I=(${g})$，生成元即为最大公约数 $${g}$。`,
          ],
        },
        {
          title: '欧几里得算法',
          tier: 2,
          steps: euclidSteps,
        },
        {
          title: '素因数分解',
          tier: 3,
          steps: [
            String.raw`$${a}=${factorText(fa)}$，$${b}=${factorText(fb)}$。`,
            String.raw`取公共素因子的最小幂次，得 $${commonText}$。`,
            String.raw`结果为 $${g}$。`,
          ],
        },
      ],
    };
  },
};

const pythagoras: OverkillTemplate = {
  id: 'pythagoras',
  title: '勾股定理',
  grade: '初中',
  build(rng) {
    const a = int(rng, 3, 30);
    const b = int(rng, 3, 30);
    const value = Number(evaluate(`sqrt(${a}^2 + ${b}^2)`));
    const ans = eq(value);
    return {
      statement: String.raw`直角三角形的两条直角边分别为 $${a}$ 和 $${b}$，求斜边长（保留两位小数）。`,
      answer: String.raw`$${ans}$`,
      solutions: [
        {
          title: '复数的模',
          tier: 3,
          steps: [
            String.raw`令复数 $z=${a}+${b}i$，其模为 $|z|=\sqrt{${a}^2+${b}^2}$。`,
            String.raw`复数的模即欧氏距离，结果为 $${ans}$。`,
          ],
        },
        {
          title: '欧几里得范数',
          tier: 4,
          steps: [
            String.raw`在 $\mathbb{R}^2$ 上赋予欧几里得范数 $\|\cdot\|_2$，取向量 $v=(${a},${b})$。`,
            String.raw`范数满足三角不等式与齐次性，斜边长即为 $\|v\|_2=${ans}$。`,
          ],
        },
        {
          title: '内积',
          tier: 1,
          steps: [
            String.raw`$\langle v,v\rangle=${a}^2+${b}^2=${a * a + b * b}$。`,
            String.raw`开平方即得 $${ans}$。`,
          ],
        },
      ],
    };
  },
};

export const TEMPLATES: OverkillTemplate[] = [
  linear,
  addition,
  shortestPath,
  arithmeticSum,
  triangleAngles,
  circleArea,
  chickenRabbit,
  percent,
  gcdTemplate,
  pythagoras,
];
