import {
  OAUTH_STATE_COOKIE,
  clearCookie,
  getGitHubConfig,
  getOrigin,
  githubRequest,
  json,
  makeCookie,
  parseCookies,
  randomState,
  redirect,
  readSession,
  sessionCookie,
  statesMatch,
} from './_shared.mjs';

const publicUser = (session) => ({ login: session.login, name: session.name || session.login, avatarUrl: session.avatarUrl || '' });

const startLogin = (request) => {
  const { clientId } = getGitHubConfig();
  const origin = getOrigin(request);
  const state = randomState();
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', `${origin}/.netlify/functions/auth?action=callback`);
  authorizeUrl.searchParams.set('scope', process.env.GITHUB_OAUTH_SCOPE || 'read:user gist repo');
  authorizeUrl.searchParams.set('state', state);
  return redirect(authorizeUrl.toString(), [makeCookie(OAUTH_STATE_COOKIE, state, {
    maxAge: 600,
    secure: origin.startsWith('https://'),
  })]);
};

const completeLogin = async (request, url) => {
  const origin = getOrigin(request);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const expectedState = parseCookies(request)[OAUTH_STATE_COOKIE];
  const clearState = clearCookie(request, OAUTH_STATE_COOKIE);

  if (!code || !statesMatch(expectedState, state)) {
    return redirect(`${origin}/?sync=cancelled`, [clearState]);
  }

  try {
    const { clientId, clientSecret } = getGitHubConfig();
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error('GitHub sign-in was not completed.');

    const user = await githubRequest(tokenData.access_token, '/user');
    const session = {
      accessToken: tokenData.access_token,
      login: user.login,
      name: user.name || user.login,
      avatarUrl: user.avatar_url || '',
    };
    return redirect(origin, [sessionCookie(request, session), clearState]);
  } catch {
    return redirect(`${origin}/?sync=error`, [clearState]);
  }
};

export default async (request) => {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'session';

  if (action === 'login') {
    try {
      return startLogin(request);
    } catch {
      // A deployment can serve the study app before its OAuth values are added.
      // Keep learners in the product with their device-local profile instead of
      // exposing a raw function error page.
      return redirect(`${getOrigin(request)}/?sync=setup`);
    }
  }

  if (action === 'callback') return completeLogin(request, url);

  if (action === 'logout') {
    return json({ authenticated: false }, { headers: { 'Set-Cookie': clearCookie(request, 'ag_project_session') } });
  }

  if (action === 'session') {
    const session = readSession(request);
    return json(session ? { authenticated: true, user: publicUser(session) } : { authenticated: false });
  }

  return json({ error: 'Unknown authentication action.' }, { status: 400 });
};
