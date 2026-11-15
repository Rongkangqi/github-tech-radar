import test from 'node:test';
import assert from 'node:assert/strict';
import { readDescription, searchableDescription } from '../lib/descriptions.ts';

const repo = { description: 'A local database for developers.', descriptionLanguage: 'en', descriptionTranslations: { zh: '面向开发者的本地数据库。' } };
test('reading language selects a translation without replacing the original', () => {
  assert.deepEqual(readDescription(repo, 'zh'), { text: '面向开发者的本地数据库。', translated: true, pending: false, lang: 'zh' });
  assert.equal(readDescription(repo, 'original').text, repo.description);
  assert.equal(readDescription(repo, 'en').translated, false);
  assert.equal(readDescription(repo, 'en').pending, false);
  assert.equal(repo.description, 'A local database for developers.');
});
test('old saved projects and missing or empty translations show original with a pending state', () => {
  for (const project of [{ description: 'Older saved description' }, { ...repo, descriptionTranslations: { zh: ' ' } }]) {
    assert.equal(readDescription(project, 'zh').text, project.description);
    assert.equal(readDescription(project, 'zh').pending, true);
    assert.equal(readDescription(project, 'original').pending, false);
  }
});
test('search covers original and translated descriptions together', () => {
  const text = searchableDescription(repo);
  assert.ok(text.includes('database'));
  assert.ok(text.includes('数据库'));
  assert.ok(!text.includes('undefined'));
});
