const { setTimeout: sleep } = require('node:timers/promises');

const route = '/repos/{owner}/{repo}/pages/deployments';
const failedStates = new Set(['deployment_failed', 'deployment_content_failed', 'deployment_cancelled', 'deployment_lost']);

// Upload already returned the artifact ID. Listing artifacts by name immediately
// after upload can return an empty list even when the archive was finalized.
module.exports = async function publishPages({ github, context, core, artifactId, wait = sleep }) {
  const id = Number(artifactId);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Upload did not return a valid Pages artifact ID.');

  const request = { ...context.repo, request: { timeout: 20000 } };
  const token = await core.getIDToken();
  const backoff = [2000, 5000, 10000, 20000];
  let deployment;
  for (let attempt = 0; ; attempt++) {
    try {
      ({ data: deployment } = await github.request('POST ' + route, {
        ...request, pages_build_version: context.sha, oidc_token: token, artifact_id: id,
      }));
      break;
    } catch (error) {
      // Only repeat a POST when GitHub explicitly rejected the artifact as missing.
      const missing = [400, 404, 422].includes(error.status)
        && /artifact/i.test(error.message) && /not found|not yet available|could not be found|does not exist/i.test(error.message);
      if (!missing || attempt === backoff.length) {
        // An Octokit error object can include the request body with the OIDC token.
        throw new Error('Could not create Pages deployment for artifact ' + id + ': ' + error.message);
      }
      core.info('Pages cannot see artifact ' + id + ' yet. Retrying in ' + backoff[attempt] / 1000 + 's.');
      await wait(backoff[attempt]);
    }
  }

  const deploymentId = deployment.id || deployment.status_url?.split('/').pop() || context.sha;
  const statusRoute = route + '/{pages_deployment_id}';
  const statusRequest = { ...request, pages_deployment_id: deploymentId };
  core.info('Tracking Pages deployment ' + deploymentId + ' for artifact ' + id + '.');
  async function cancel() {
    try {
      await github.request('POST ' + statusRoute + '/cancel', statusRequest);
    } catch (error) {
      core.warning('Could not cancel Pages deployment ' + deploymentId + ': ' + error.message);
    }
  }
  const stop = () => { cancel().finally(() => process.exit(1)); };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  const deadline = Date.now() + 600000;
  try {
    while (Date.now() < deadline) {
      await wait(5000);
      let state;
      try {
        const { data } = await github.request('GET ' + statusRoute, statusRequest);
        state = data.status;
      } catch (error) {
        if (error.status === 404 || error.status === 429 || error.status >= 500) continue;
        throw error;
      }
      if (state === 'succeed') {
        core.setOutput('page_url', deployment.page_url);
        core.info('Pages published ' + deployment.page_url);
        return;
      }
      if (failedStates.has(state)) throw new Error('Pages deployment ' + deploymentId + ': ' + state);
    }
    await cancel();
    throw new Error('Timed out waiting for Pages deployment ' + deploymentId);
  } finally {
    process.off('SIGTERM', stop);
    process.off('SIGINT', stop);
  }
};
