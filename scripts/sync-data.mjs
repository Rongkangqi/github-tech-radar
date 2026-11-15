import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { classify, isDownloadPromotion } from '../lib/radar.ts';

export async function search(q, { fetcher = fetch, token = process.env.GITHUB_TOKEN } = {}) {
  const url = 'https://api.github.com/search/repositories?' + new URLSearchParams({ q, sort: 'stars', order: 'desc', per_page: '100' });
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'GitHub-Tech-Radar' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetcher(url, { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`GitHub repository search failed (HTTP ${response.status}).`);
  const data = await response.json();
  if (!Array.isArray(data.items)) throw new Error('GitHub returned an invalid repository list.');
  return { ...data, query: 'https://github.com/search?' + new URLSearchParams({ q, type: 'repositories', s: 'stars', o: 'desc' }) };
}

export function combine(days, fresh, active, previous, now = Date.now()) {
  const old = new Map((previous?.repos || []).map(r => [r.id, r]));
  const newIds = new Set(fresh.items.map(r => r.id)), activeIds = new Set(active.items.map(r => r.id));
  const repos = [...new Map([...fresh.items, ...active.items].map(r => [r.id, r])).values()].map(r => ({
    id: r.id, name: r.name, owner: r.owner.login, fullName: r.full_name,
    description: r.description || '项目作者暂未提供简介。', url: r.html_url,
    language: r.language, stars: r.stargazers_count, forks: r.forks_count, topics: r.topics || [],
    license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : null,
    createdAt: r.created_at, pushedAt: r.pushed_at, direction: classify(r.name, r.description || '', r.topics || []),
    isNew: newIds.has(r.id), active: activeIds.has(r.id), delta: old.has(r.id) ? r.stargazers_count - old.get(r.id).stars : null,
  })).filter(r => !isDownloadPromotion(r)).map(repo => {
    const prior = old.get(repo.id);
    return prior?.description === repo.description ? { ...repo, descriptionLanguage: prior.descriptionLanguage, descriptionTranslations: prior.descriptionTranslations } : repo;
  });
  return { version: 1, days, syncedAt: new Date(now).toISOString(), comparedAt: previous?.syncedAt || null, repos,
    totals: { new: fresh.total_count, active: active.total_count }, incomplete: !!(fresh.incomplete_results || active.incomplete_results),
    sources: { new: fresh.query, active: active.query } };
}

export function staleSnapshot(previous) {
  if (!previous?.repos?.length) throw new Error('No previous snapshot is available; stopping without publishing empty data.');
  return { ...previous, stale: true, notice: '本轮采集未完成，保留上次成功采集的数据。' };
}

async function main() {
  const output = new URL('../public/data/', import.meta.url);
  await mkdir(output, { recursive: true });
  const now = Date.now(), date = days => new Date(now - days * 86400000).toISOString().slice(0, 10);
  const previous = {};
  for (const days of [7, 30, 90]) {
    try { previous[days] = JSON.parse(await readFile(new URL(`radar-${days}.json`, output), 'utf8')); } catch { previous[days] = null; }
  }
  const queries = [
    `pushed:>=${date(7)} stars:>=500 archived:false fork:false`,
    ...[7, 30, 90].map(days => `created:>=${date(days)} stars:>=20 archived:false fork:false`),
  ];
  const results = await Promise.allSettled(queries.map(q => search(q)));
  const snapshots = [];
  let successful = 0;
  for (const [index, days] of [7, 30, 90].entries()) {
    const active = results[0], fresh = results[index + 1];
    let snapshot;
    if (active.status === 'fulfilled' && fresh.status === 'fulfilled') { snapshot = combine(days, fresh.value, active.value, previous[days], now); successful++; }
    else { console.warn(`Keeping previous ${days}-day data because this fetch did not complete.`); snapshot = staleSnapshot(previous[days]); }
    snapshots.push([days, snapshot]);
  }
  if (!successful) throw new Error('All GitHub queries failed. Previous publication is preserved.');
  for (const [days, snapshot] of snapshots) {
    const target = new URL(`radar-${days}.json`, output), temporary = new URL(`radar-${days}.json.tmp`, output);
    await writeFile(temporary, JSON.stringify(snapshot)); await rename(temporary, target);
    console.log(`${days} days: ${snapshot.repos.length} repositories; ${snapshot.stale ? 'previous snapshot' : snapshot.syncedAt}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
