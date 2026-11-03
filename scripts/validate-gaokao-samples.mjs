import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const ranks = readJson('public/data/gaokao/shaanxi/2026-ranks.json');
const samples = readJson('public/data/gaokao/shaanxi/2026-samples.json');
assert.equal(samples.meta.province, '陕西');
assert.equal(samples.meta.year, 2026);
assert.equal(samples.entries.length, samples.meta.records);
assert.ok(samples.entries.length >= 150, 'unexpectedly small admissions dataset');
assert.equal(new Set(samples.entries.map(e => e.id)).size, samples.entries.length, 'record ID collision');
assert.equal(new Set(samples.entries.map(e => e.school)).size, samples.meta.schools);
const sources = new Map(samples.sources.map(s => [s.id,s]));
const rankRows = Object.fromEntries(
  Object.entries(ranks.tracks).map(([subject, track]) => [
    subject, new Map(track.scoreRows.map(row => [row.score,row]))
  ])
);
let groupCount=0, majorCount=0;
for (const e of samples.entries) {
  assert.equal(e.province,'陕西');
  assert.equal(e.year,2026);
  assert.equal(e.batch,'本科批');
  assert.ok(e.track === '物理' || e.track === '历史');
  assert.ok(e.unit === 'group' || e.unit === 'major');
  assert.ok(typeof e.label==='string' && e.label.length>1);
  assert.ok(Number.isInteger(e.minimumScore) && e.minimumScore>0);
  assert.ok(e.minimumType.endsWith('最低分'));
  assert.ok(sources.has(e.sourceId));
  const src=sources.get(e.sourceId);
  assert.equal(e.school,src.school);
  assert.equal(e.sourceUrl,src.url);
  assert.ok(e.sourceUrl.startsWith('https://'));
  assert.ok(e.plan===null || Number.isInteger(e.plan) && e.plan>0);
  const rank = rankRows[e.track].get(e.minimumScore);
  assert.ok(rank, 'missing official score band for '+e.id);
  assert.equal(e.rankFrom,rank.cumulative-rank.count+1, 'inconsistent best tied rank '+e.id);
  assert.equal(e.rankThrough,rank.cumulative,'inconsistent cumulative rank '+e.id);
  assert.ok(e.rankFrom<=e.rankThrough);
  if(e.unit==='group'){
    groupCount++;
    assert.ok(Array.isArray(e.requiredSubjects) && e.requiredSubjects.includes(e.track), 'missing verified group subject requirement');
  } else {
    majorCount++;
    assert.equal(e.requiredSubjects,null, 'unverified major requirements must stay unset');
  }
}
assert.equal(groupCount + majorCount, samples.entries.length);
assert.ok(groupCount>=10);
console.log(`Verified ${samples.entries.length} official admission records across ${sources.size} universities: ${groupCount} group, ${majorCount} major; rank ranges reconcile exactly.`);
