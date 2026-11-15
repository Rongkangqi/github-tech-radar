import test from 'node:test';
import assert from 'node:assert/strict';
import { combine, search, staleSnapshot } from '../scripts/sync-data.mjs';
import { classify } from '../lib/radar.ts';

const repo = (id, name, stars = 50) => ({
  id, name, owner: { login: 'example' }, full_name: `example/${name}`,
  html_url: `https://github.com/example/${name}`, description: 'A useful terminal tool',
  language: 'TypeScript', stargazers_count: stars, forks_count: 2, topics: ['cli'],
  license: { spdx_id: 'MIT' }, created_at: '2026-11-01T00:00:00Z', pushed_at: '2026-11-13T00:00:00Z',
});
const result = items => ({ items, total_count: items.length, incomplete_results: false, query: 'https://github.com/search?q=example' });

test('merges overlapping samples, preserves flags, and measures actual star changes', () => {
  const shared = repo(1, 'terminal', 103);
  const previous = { syncedAt: '2026-11-12T00:00:00Z', repos: [{ id: 1, stars: 100 }] };
  const data = combine(30, result([shared, repo(2, 'new-tool')]), result([shared, repo(3, 'active-tool')]), previous, 0);
  assert.equal(data.repos.length, 3);
  assert.equal(data.repos[0].isNew, true);
  assert.equal(data.repos[0].active, true);
  assert.equal(data.repos[0].delta, 3);
  assert.equal(data.repos[1].delta, null);
  assert.equal(data.comparedAt, previous.syncedAt);
  assert.equal(data.syncedAt, '1970-01-01T00:00:00.000Z');
  assert.equal(data.repos[2].isNew, false);
});

test('does not fabricate a growth value for the first collection', () => {
  const data = combine(7, result([repo(1, 'tool')]), result([]), null);
  assert.equal(data.comparedAt, null);
  assert.equal(data.repos[0].delta, null);
});

test('preserves translations only while the author description is unchanged', () => {
  const item = repo(1, 'tool');
  const previous = { syncedAt: '2026-11-12T00:00:00Z', repos: [{ id: 1, stars: 50, description: item.description, descriptionLanguage: 'en', descriptionTranslations: { zh: '终端工具' } }] };
  assert.equal(combine(30, result([item]), result([]), previous).repos[0].descriptionTranslations.zh, '终端工具');
  assert.equal(combine(30, result([{ ...item, description: 'A different tool' }]), result([]), previous).repos[0].descriptionTranslations, undefined);
});

test('filters commercial download promotions and reports an unrecognized license honestly', () => {
  const unknown = { ...repo(2, 'tool'), license: { spdx_id: 'NOASSERTION' } };
  const data = combine(7, result([repo(1, 'Photoshop-full-version-download'), unknown]), result([]), null);
  assert.deepEqual(data.repos.map(r => r.id), [2]);
  assert.equal(data.repos[0].license, null);
});

test('does not classify an owner name as the technology direction', () => {
  assert.equal(classify('ai-labs/terminal', 'A terminal tool', ['cli']), 'devtools');
  assert.equal(classify('agent-kit', 'An LLM agent framework', ['agents']), 'ai');
});

test('preserves successful timestamps on failure and refuses an empty fallback', () => {
  const previous = { syncedAt: '2026-11-12T00:00:00Z', repos: [{ id: 1 }] };
  const fallback = staleSnapshot(previous);
  assert.equal(fallback.syncedAt, previous.syncedAt);
  assert.equal(fallback.stale, true);
  assert.equal(previous.stale, undefined);
  assert.throws(() => staleSnapshot(null), /No previous snapshot/);
});

test('collects official GitHub queries with the token confined to the request header', async () => {
  let request;
  const response = await search('stars:>=20', { token: 'test-token', fetcher: async (url, options) => {
    request = { url: new URL(url), options };
    return { ok: true, json: async () => ({ items: [], total_count: 0, incomplete_results: false }) };
  } });
  assert.equal(request.url.hostname, 'api.github.com');
  assert.equal(request.url.searchParams.get('per_page'), '100');
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
  assert.equal(JSON.stringify(response).includes('test-token'), false);
});

test('surfaces API failures and invalid responses instead of publishing them', async () => {
  await assert.rejects(search('q', { token: '', fetcher: async () => ({ ok: false, status: 403 }) }), /HTTP 403/);
  await assert.rejects(search('q', { token: '', fetcher: async () => ({ ok: true, json: async () => ({ message: 'invalid' }) }) }), /invalid repository list/);
});
