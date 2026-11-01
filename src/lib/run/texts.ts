import type { Rng } from '../rng';
import type { ObstacleKind } from './world';

const FAIL: Record<ObstacleKind, string[]> = {
  homework: ['作业堆把你压住了。它对每个人都一样，不是针对你。', '这摞作业还没写完，但你已经跑了很远。'],
  alarm: ['闹钟响了。今天的第一节课，依然是八点。', '又被叫醒了。休息一下，闹钟会等你。'],
  notice: ['家长群@了你。一条通知，比障碍物还准。', '群里发了一条通知。消息很多，可以先关掉一会儿。'],
  ranking: ['排名榜刷新了。一个数字，装不下你整个人。', '月考排名榜挡住了去路。榜单会变，你也会。'],
};

const GENERIC = ['先停一下，喝口水，再跑也不迟。', '这一局结束了。分数会过去，你还在。'];

export function pickFailText(kind: ObstacleKind | null, rng: Rng): string {
  const pool = kind ? FAIL[kind] : GENERIC;
  return pool[Math.floor(rng() * pool.length)];
}
