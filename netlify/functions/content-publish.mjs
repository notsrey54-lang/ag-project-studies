import { createHash, timingSafeEqual } from 'node:crypto';

const DEFAULT_ADMIN_PASSWORD_HASH = 'ecd6512bdf3b727d065dec7da7b0523023594a474c7fb63bf0efce1e8d080da6';
const CONTENT_PATH = 'public/content.json';
const MAX_CONTENT_BYTES = 750000;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
});

const hashPassword = (value) => createHash('sha256').update(value).digest('hex');

const sameSecret = (provided, expected) => {
  const left = Buffer.from(hashPassword(provided || ''));
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

const configuredPasswordHash = () => {
  if (process.env.ADMIN_PUBLISH_PASSWORD_HASH) return process.env.ADMIN_PUBLISH_PASSWORD_HASH;
  if (process.env.ADMIN_PUBLISH_PASSWORD) return hashPassword(process.env.ADMIN_PUBLISH_PASSWORD);
  return DEFAULT_ADMIN_PASSWORD_HASH;
};

const githubHeaders = (token) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'AG-Project-Study-Hub',
  'Content-Type': 'application/json',
});

const githubJson = async (url, options) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `GitHub request failed with status ${response.status}.`);
  return body;
};

const validateContent = (content) => {
  if (!content || typeof content !== 'object' || Array.isArray(content)) throw new Error('The content payload was not valid.');
  if (content.version !== 1 || !Array.isArray(content.subjects)) throw new Error('The content version or subject list was not valid.');
  const sections = new Set(['course', 'midterm', 'final']);
  const subjectIds = new Set();
  const subjectCodes = new Set();
  content.subjects.forEach((subject, subjectIndex) => {
    const label = subject?.code || `Subject ${subjectIndex + 1}`;
    if (!subject || typeof subject !== 'object' || !String(subject.id || '').trim() || !String(subject.code || '').trim() || !String(subject.name || '').trim()) throw new Error(`${label}: every subject needs an ID, code, and name.`);
    if (subjectIds.has(subject.id)) throw new Error(`${label}: duplicate subject ID.`);
    if (subjectCodes.has(String(subject.code).trim().toUpperCase())) throw new Error(`${label}: duplicate subject code.`);
    subjectIds.add(subject.id);
    subjectCodes.add(String(subject.code).trim().toUpperCase());
    if (!Array.isArray(subject.modules) || subject.modules.some((module) => !module?.id || !String(module.title || '').trim() || !sections.has(module.section || 'course'))) throw new Error(`${label}: every chapter needs an ID, title, and valid assessment section.`);
    for (const collection of ['materials', 'resources', 'flashcards', 'quiz', 'glossary', 'formulas']) {
      if (!Array.isArray(subject[collection])) throw new Error(`${label}: ${collection} must be a list.`);
    }
  });
  const serialized = JSON.stringify({ version: 1, updatedAt: content.updatedAt || new Date().toISOString(), subjects: content.subjects });
  if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTENT_BYTES) throw new Error('The content file is too large to publish.');
  return serialized;
};

const originIsSafe = (request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
};

export default async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!originIsSafe(request)) return json({ error: 'This publish request came from an unexpected origin.' }, 403);

  try {
    const body = await request.json().catch(() => null);
    if (!sameSecret(body?.password, configuredPasswordHash())) return json({ error: 'The administrator password is not correct for publishing.' }, 401);

    const token = process.env.GITHUB_CONTENT_TOKEN;
    if (!token) return json({ error: 'GitHub publishing is not configured on this deployment yet. Add GITHUB_CONTENT_TOKEN in Netlify.' }, 503);

    const serialized = validateContent(body?.content);
    const repository = process.env.CONTENT_REPOSITORY || 'notsrey54-lang/ag-project-studies';
    const branch = process.env.CONTENT_BRANCH || 'main';
    const encodedPath = CONTENT_PATH.split('/').map((part) => encodeURIComponent(part)).join('/');
    const apiUrl = `https://api.github.com/repos/${repository}/contents/${encodedPath}`;
    let currentSha = null;

    const currentResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders(token) });
    if (currentResponse.ok) {
      const current = await currentResponse.json();
      currentSha = current.sha;
    } else if (currentResponse.status !== 404) {
      const currentError = await currentResponse.json().catch(() => ({}));
      throw new Error(currentError.message || 'GitHub could not read the shared content file.');
    }

    const update = await githubJson(apiUrl, {
      method: 'PUT',
      headers: githubHeaders(token),
      body: JSON.stringify({
        message: `Update AG Study shared content (${new Date().toISOString().slice(0, 10)})`,
        content: Buffer.from(serialized, 'utf8').toString('base64'),
        branch,
        ...(currentSha ? { sha: currentSha } : {}),
      }),
    });

    return json({
      published: true,
      path: CONTENT_PATH,
      branch,
      commitSha: update.commit?.sha || null,
      commitUrl: update.commit?.html_url || null,
      publishedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json({ error: error.message || 'GitHub could not publish the shared content.' }, 502);
  }
};
