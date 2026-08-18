import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'ag_project_session';
export const OAUTH_STATE_COOKIE = 'ag_project_oauth_state';
export const PROFILE_DESCRIPTION = 'AG Project study profile (secret)';
const LEGACY_PROFILE_DESCRIPTION = 'AG Project study profile (private)';
export const PROFILE_FILE_NAME = 'ag-project-study-profile.json';

const asBase64Url = (value) => Buffer.from(value).toString('base64url');
const fromBase64Url = (value) => Buffer.from(value, 'base64url');

export const json = (body, init = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(init.headers || {}),
  },
});

export const getOrigin = (request) => {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || url.host;
  const protocol = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  return `${protocol}://${host}`;
};

export const isSecureRequest = (request) => getOrigin(request).startsWith('https://');

export const parseCookies = (request) => Object.fromEntries(
  (request.headers.get('cookie') || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      return separator === -1 ? [part, ''] : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
    }),
);

export const makeCookie = (name, value, { maxAge = 0, secure = true, httpOnly = true } = {}) => [
  `${name}=${encodeURIComponent(value)}`,
  'Path=/',
  'SameSite=Lax',
  httpOnly ? 'HttpOnly' : '',
  secure ? 'Secure' : '',
  `Max-Age=${maxAge}`,
].filter(Boolean).join('; ');

export const redirect = (url, cookies = []) => {
  const headers = new Headers({ Location: url, 'Cache-Control': 'no-store' });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
};

const sessionKey = () => {
  if (!process.env.SESSION_SECRET) throw new Error('GitHub sync is not configured yet.');
  return createHash('sha256').update(process.env.SESSION_SECRET).digest();
};

export const encryptSession = (payload) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sessionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return `${asBase64Url(iv)}.${asBase64Url(cipher.getAuthTag())}.${asBase64Url(encrypted)}`;
};

export const decryptSession = (value) => {
  try {
    const [iv, tag, encrypted] = value.split('.').map(fromBase64Url);
    if (!iv || !tag || !encrypted) return null;
    const decipher = createDecipheriv('aes-256-gcm', sessionKey(), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'));
  } catch {
    return null;
  }
};

export const readSession = (request) => {
  const raw = parseCookies(request)[SESSION_COOKIE];
  return raw ? decryptSession(raw) : null;
};

export const sessionCookie = (request, session) => makeCookie(SESSION_COOKIE, encryptSession(session), {
  maxAge: 60 * 60 * 24 * 30,
  secure: isSecureRequest(request),
});

export const clearCookie = (request, name) => makeCookie(name, '', { maxAge: 0, secure: isSecureRequest(request) });

export const randomState = () => randomBytes(24).toString('base64url');

export const statesMatch = (expected, received) => {
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const getGitHubConfig = () => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || !process.env.SESSION_SECRET) {
    throw new Error('GitHub sync is not configured yet.');
  }
  return {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
};

export const githubRequest = async (accessToken, path, options = {}) => {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'AG-Project-Study-Hub',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'GitHub could not save the study profile.');
  return data;
};

export const findStudyGist = async (accessToken) => {
  const gists = await githubRequest(accessToken, '/gists?per_page=100');
  return gists.find((gist) => (
    [PROFILE_DESCRIPTION, LEGACY_PROFILE_DESCRIPTION].includes(gist.description)
      && gist.files?.[PROFILE_FILE_NAME]
  )) || null;
};

export const validProfile = (profile) => {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return false;
  if (profile.version !== 1) return false;
  try {
    const raw = JSON.stringify(profile);
    return raw.length <= 200000;
  } catch {
    return false;
  }
};
