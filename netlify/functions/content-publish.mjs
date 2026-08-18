import { githubRequest, json, readSession, validContentDocument } from './_shared.mjs';

const CONTENT_PATH = process.env.CONTENT_FILE_PATH || 'public/content/subjects.json';

const getConfig = () => {
  const owner = process.env.CONTENT_REPO_OWNER;
  const repo = process.env.CONTENT_REPO_NAME;
  const branch = process.env.CONTENT_REPO_BRANCH || 'main';
  const adminLogin = process.env.ADMIN_GITHUB_LOGIN;
  if (!owner || !repo || !adminLogin) throw new Error('Content publishing is not configured yet.');
  return { owner, repo, branch, adminLogin };
};

const repositoryPath = (config, suffix) => `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}${suffix}`;

const readExistingFile = async (token, config) => {
  try {
    return await githubRequest(token, `${repositoryPath(config, `/contents/${CONTENT_PATH}`)}?ref=${encodeURIComponent(config.branch)}`);
  } catch (error) {
    if (/not found/i.test(error.message || '')) return null;
    throw error;
  }
};

export default async (request) => {
  let config;
  try {
    config = getConfig();
  } catch (error) {
    return json({ error: error.message }, { status: 503 });
  }

  const session = readSession(request);
  if (!session?.accessToken) return json({ error: 'Admin GitHub sign-in is required before publishing.' }, { status: 401 });
  if (session.login !== config.adminLogin) return json({ error: 'This GitHub account is not allowed to publish study content.' }, { status: 403 });

  if (request.method === 'GET') return json({ configured: true, canPublish: true, path: CONTENT_PATH, branch: config.branch });
  if (request.method !== 'PUT') return json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'GET, PUT' } });

  const body = await request.json().catch(() => null);
  if (!validContentDocument(body?.document)) return json({ error: 'The content document was not valid or was too large.' }, { status: 400 });

  try {
    const existing = await readExistingFile(session.accessToken, config);
    const content = Buffer.from(JSON.stringify(body.document, null, 2), 'utf8').toString('base64');
    const result = await githubRequest(session.accessToken, repositoryPath(config, `/contents/${CONTENT_PATH}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: typeof body.message === 'string' && body.message.trim() ? body.message.trim().slice(0, 120) : 'Update published study content',
        content,
        branch: config.branch,
        ...(existing?.sha ? { sha: existing.sha } : {}),
      }),
    });
    return json({ published: true, commit: result.commit?.sha || null, path: CONTENT_PATH });
  } catch (error) {
    return json({ error: error.message || 'GitHub could not publish the study content.' }, { status: 502 });
  }
};
