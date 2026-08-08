import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SESSION_SECRET = 'test-only-session-secret-that-is-long-enough-for-a-stable-key';
const { decryptSession, encryptSession, validProfile } = await import('../netlify/functions/_shared.mjs');
const authFunction = (await import('../netlify/functions/auth.mjs')).default;
const studyDataFunction = (await import('../netlify/functions/study-data.mjs')).default;

test('the server keeps a GitHub access token inside an encrypted session value', () => {
  const payload = { accessToken: 'github-token', login: 'student', name: 'Study Student' };
  const encrypted = encryptSession(payload);

  assert.notEqual(encrypted.includes(payload.accessToken), true);
  assert.deepEqual(decryptSession(encrypted), payload);
  assert.equal(decryptSession('not-a-session'), null);
});

test('only small versioned study profiles are accepted for remote storage', () => {
  assert.equal(validProfile({ version: 1, notes: {}, progress: {} }), true);
  assert.equal(validProfile({ version: 2 }), false);
  assert.equal(validProfile([]), false);
});

test('sync functions keep unauthenticated study data private', async () => {
  const sessionResponse = await authFunction(new Request('https://study.example/.netlify/functions/auth?action=session'));
  const dataResponse = await studyDataFunction(new Request('https://study.example/.netlify/functions/study-data'));

  assert.deepEqual(await sessionResponse.json(), { authenticated: false });
  assert.equal(dataResponse.status, 401);
  assert.match((await dataResponse.json()).error, /sign in with GitHub/i);
});

test('an unconfigured sign-in returns learners to the local study space', async (t) => {
  const originalClientId = process.env.GITHUB_CLIENT_ID;
  const originalClientSecret = process.env.GITHUB_CLIENT_SECRET;
  process.env.GITHUB_CLIENT_ID = '';
  process.env.GITHUB_CLIENT_SECRET = '';
  t.after(() => {
    if (originalClientId === undefined) delete process.env.GITHUB_CLIENT_ID;
    else process.env.GITHUB_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.GITHUB_CLIENT_SECRET;
    else process.env.GITHUB_CLIENT_SECRET = originalClientSecret;
  });

  const response = await authFunction(new Request('https://study.example/.netlify/functions/auth?action=login'));

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://study.example/?sync=setup');
});

test('an authenticated learner profile is saved in a secret GitHub Gist', async (t) => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/gists?per_page=100')) return new Response('[]', { status: 200 });
    if (String(url).endsWith('/gists')) return new Response(JSON.stringify({ id: 'study-gist' }), { status: 201 });
    throw new Error(`Unexpected request: ${url}`);
  };
  t.after(() => { global.fetch = originalFetch; });

  const session = encryptSession({ accessToken: 'github-token', login: 'student', name: 'Study Student' });
  const profile = { version: 1, progress: { BUC111: { chapter7: true } }, notes: { BUC111: 'Review decentralization.' } };
  const response = await studyDataFunction(new Request('https://study.example/.netlify/functions/study-data', {
    method: 'PUT',
    headers: {
      Cookie: `ag_project_session=${encodeURIComponent(session)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profile }),
  }));

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.saved, true);
  assert.match(body.savedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer github-token');
  assert.equal(JSON.parse(calls[1].options.body).public, false);
  assert.match(JSON.parse(calls[1].options.body).description, /secret/);
});
