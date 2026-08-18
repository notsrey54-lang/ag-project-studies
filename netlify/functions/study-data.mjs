import { PROFILE_DESCRIPTION, PROFILE_FILE_NAME, findStudyGist, githubRequest, json, readSession, validProfile } from './_shared.mjs';

const noSession = () => json({ error: 'Please sign in with GitHub to sync this study space.' }, { status: 401 });

const readProfile = async (accessToken) => {
  const gist = await findStudyGist(accessToken);
  if (!gist) return null;
  const fullGist = await githubRequest(accessToken, `/gists/${gist.id}`);
  const content = fullGist.files?.[PROFILE_FILE_NAME]?.content;
  if (!content) return null;
  try {
    const profile = JSON.parse(content);
    return validProfile(profile) ? profile : null;
  } catch {
    return null;
  }
};

const saveProfile = async (accessToken, profile) => {
  const gist = await findStudyGist(accessToken);
  const content = JSON.stringify(profile);
  if (gist) {
    await githubRequest(accessToken, `/gists/${gist.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { [PROFILE_FILE_NAME]: { content } } }),
    });
    return gist.id;
  }
  const created = await githubRequest(accessToken, '/gists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: PROFILE_DESCRIPTION,
      public: false,
      files: { [PROFILE_FILE_NAME]: { content } },
    }),
  });
  return created.id;
};

export default async (request) => {
  const session = readSession(request);
  if (!session?.accessToken) return noSession();

  try {
    if (request.method === 'GET') {
      return json({ profile: await readProfile(session.accessToken) });
    }

    if (request.method === 'PUT') {
      const body = await request.json().catch(() => null);
      if (!validProfile(body?.profile)) return json({ error: 'The study profile was not valid.' }, { status: 400 });
      await saveProfile(session.accessToken, body.profile);
      return json({ saved: true, savedAt: new Date().toISOString() });
    }

    return json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'GET, PUT' } });
  } catch (error) {
    return json({ error: error.message || 'Your study profile could not be synchronized.' }, { status: 502 });
  }
};
