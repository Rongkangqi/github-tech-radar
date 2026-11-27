import test from 'node:test';
import assert from 'node:assert/strict';
import publish from '../scripts/publish-pages.cjs';

const artifactId = 15204832202;
const pageUrl = 'https://example.github.io/radar/';
const missingArtifact = () => Object.assign(new Error('Artifact not found'), { status: 404 });

function run(request) {
  const waits = [];
  const output = {};
  const result = publish({
    github: { request }, context: { repo: { owner: 'example', repo: 'radar' }, sha: 'abc123' },
    artifactId: String(artifactId), wait: async ms => { waits.push(ms); },
    core: { getIDToken: async () => 'test-token', info() {}, setOutput(key, value) { output[key] = value; } },
  });
  return { result, waits, output };
}

test('retry the same uploaded ID and track the accepted deployment through success', async () => {
  let creates = 0;
  let reads = 0;
  const { result, output, waits } = run(async (route, data) => {
    if (route === 'POST /repos/{owner}/{repo}/pages/deployments') {
      assert.equal(data.artifact_id, artifactId);
      if (++creates === 1) throw missingArtifact();
      return { data: { id: 'deployment-123', page_url: pageUrl } };
    }
    assert.equal(route, 'GET /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}');
    assert.equal(data.pages_deployment_id, 'deployment-123');
    if (++reads === 1) throw Object.assign(new Error('Service unavailable'), { status: 503 });
    return { data: { status: reads === 2 ? 'deploying' : 'succeed' } };
  });
  await result;
  assert.equal(creates, 2);
  assert.equal(waits[0], 2000);
  assert.equal(output.page_url, pageUrl);
});

test('artifact retries are bounded and permission or ambiguous create failures are not replayed', async () => {
  for (const [error, expectedCalls] of [[missingArtifact(), 5], [Object.assign(new Error('Forbidden'), { status: 403 }), 1], [new Error('Connection reset'), 1]]) {
    let calls = 0;
    const { result, output } = run(async () => { calls++; throw error; });
    await assert.rejects(result, /Could not create Pages deployment/);
    assert.equal(calls, expectedCalls);
    assert.deepEqual(output, {});
  }
});

test('a rejected Pages build cannot report a successful publication', async () => {
  const { result, output } = run(async route => route.startsWith('POST')
    ? { data: { id: 'deployment-123', page_url: pageUrl } } : { data: { status: 'deployment_content_failed' } });
  await assert.rejects(result, /deployment_content_failed/);
  assert.deepEqual(output, {});
});
