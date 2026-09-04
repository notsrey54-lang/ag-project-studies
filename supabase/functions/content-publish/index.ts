import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.115.0";

const MAX_CONTENT_BYTES = 8_000_000;
const MAX_SUBJECTS = 200;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_BLOCK_MS = 30 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 8;
const STUDIO_DRAFT_KEY = "main";
const STUDIO_VERSION_LIMIT = 50;
const STUDIO_UPLOAD_BUCKET = "ag-study-assets";
const ALLOWED_ORIGINS = new Set([
  "https://ag-study-studioo.netlify.app",
  "https://ag-study-studio.netlify.app",
  "http://localhost:5173",
  "http://localhost:4173",
]);

const encoder = new TextEncoder();

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
};

const serviceKey = () => {
  const direct =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEY");
  if (direct) return direct;

  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    for (const name of ["service_role", "serviceRole", "service_role_key"]) {
      if (typeof parsed?.[name] === "string") return parsed[name];
    }
    const candidate = Object.values(parsed || {}).find(
      (value) =>
        typeof value === "string" &&
        (value.startsWith("sb_secret_") || value.split(".").length === 3),
    );
    return typeof candidate === "string" ? candidate : null;
  } catch {
    return null;
  }
};

const originFor = (request: Request) => {
  const origin = request.headers.get("origin") || "";
  return origin && ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://ag-study-studioo.netlify.app";
};

const originIsAllowed = (request: Request) => {
  const origin = request.headers.get("origin");
  return !origin || ALLOWED_ORIGINS.has(origin);
};

const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  Vary: "Origin",
});

const reply = (payload: Record<string, unknown>, status: number, origin: string) =>
  new Response(JSON.stringify(payload), { status, headers: corsHeaders(origin) });

const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const numberOr = (value: unknown, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const containsUnsafeMarkup = (value: unknown): boolean => {
  if (typeof value === "string") {
    return /<\/?script\b|javascript:|\son\w+\s*=/i.test(value);
  }
  if (Array.isArray(value)) return value.some(containsUnsafeMarkup);
  if (value && typeof value === "object") {
    return Object.values(value).some(containsUnsafeMarkup);
  }
  return false;
};

const subjectRow = (subject: Record<string, unknown>, version: number) => {
  const id = text(subject.id);
  const code = text(subject.code);
  const name = text(subject.name);
  if (!id || !code || !name) {
    throw new Error("Every subject needs an ID, code, and name.");
  }
  const archived = Boolean(subject.archived);
  return {
    id,
    code,
    status: archived ? "archived" : "published",
    archived,
    name_en: name,
    name_ar: text(subject.nameAr),
    short_name_en: text(subject.shortName, name),
    short_name_ar: text(subject.shortNameAr),
    description_en: text(subject.description),
    description_ar: text(subject.descriptionAr),
    eyebrow_en: text(subject.eyebrow),
    eyebrow_ar: text(subject.eyebrowAr),
    color: text(subject.color, "gold"),
    material_type: text(subject.materialType, "structured"),
    document: subject,
    metadata: typeof subject.metadata === "object" && subject.metadata
      ? subject.metadata
      : {},
    version,
    published_at: archived ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

const chapterRows = (subject: Record<string, unknown>) => {
  const modules = Array.isArray(subject.modules) ? subject.modules : [];
  return modules.map((module, index) => ({
    id: text((module as Record<string, unknown>)?.id),
    subject_id: text(subject.id),
    section: ["course", "midterm", "final", "custom"].includes(
      text((module as Record<string, unknown>)?.section),
    )
      ? text((module as Record<string, unknown>)?.section)
      : "course",
    title_en: text((module as Record<string, unknown>)?.title, `Chapter ${index + 1}`),
    title_ar: text((module as Record<string, unknown>)?.titleAr),
    subtitle_en: text((module as Record<string, unknown>)?.subtitle),
    subtitle_ar: text((module as Record<string, unknown>)?.subtitleAr),
    duration: text((module as Record<string, unknown>)?.duration),
    sort_order: index,
    status: "published",
    document: module,
    metadata: {},
    updated_at: new Date().toISOString(),
  })).filter((row) => row.id);
};

const noteRows = (subject: Record<string, unknown>) => {
  const materials = Array.isArray(subject.materials) ? subject.materials : [];
  return materials.map((material, index) => {
    const note = material as Record<string, unknown>;
    return {
      id: text(note.id),
      subject_id: text(subject.id),
      chapter_id: null,
      block_type: "note",
      title_en: text(note.title, `Note ${index + 1}`),
      title_ar: text(note.titleAr),
      content: { ...note, kind: "note" },
      sort_order: index,
      status: "published",
      metadata: {},
      updated_at: new Date().toISOString(),
    };
  }).filter((row) => row.id);
};

const customBlockRows = (subject: Record<string, unknown>) => {
  const blocks = Array.isArray(subject.contentBlocks) ? subject.contentBlocks : [];
  return blocks.map((block, index) => {
    const item = block as Record<string, unknown>;
    return {
      id: text(item.id),
      subject_id: text(subject.id),
      chapter_id: text(item.chapterId) || null,
      parent_id: text(item.parentId) || null,
      block_type: text(item.type || item.blockType, "paragraph"),
      title_en: text(item.title),
      title_ar: text(item.titleAr),
      content: item.content && typeof item.content === "object" ? item.content : item,
      sort_order: numberOr(item.order ?? item.sortOrder, index),
      status: item.status === "draft" ? "draft" : "published",
      metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : {},
      updated_at: new Date().toISOString(),
    };
  }).filter((row) => row.id);
};

const questionRows = (subject: Record<string, unknown>) => {
  const quiz = Array.isArray(subject.quiz) ? subject.quiz : [];
  return quiz.map((question, index) => {
    const item = question as Record<string, unknown>;
    const options = Array.isArray(item.options) ? item.options : [];
    const rawQuestionType = text(item.questionType);
    const questionType = ["mcq", "multiple_choice", "true_false", "short_answer", "paragraph", "bullet_list", "bullet_point", "matching", "ordering", "formula", "fill_blank", "numeric", "case_study", "custom"].includes(rawQuestionType)
      ? rawQuestionType
      : options.length ? "mcq" : "short_answer";
    const rawResponseFormat = text(item.responseFormat) === "bullet" ? "bullet_point" : text(item.responseFormat);
    const responseFormat = ["paragraph", "bullet_list", "bullet_point", "single_choice", "multiple_choice", "short_text", "number", "formula", "matching", "ordering"].includes(rawResponseFormat)
      ? rawResponseFormat
      : questionType === "mcq" ? "single_choice" : "paragraph";
    return {
      id: text(item.id),
      subject_id: text(subject.id),
      chapter_id: text(item.chapterId) || null,
      block_id: text(item.blockId) || null,
      question_type: questionType,
      response_format: responseFormat,
      prompt_en: text(item.prompt, `Question ${index + 1}`),
      prompt_ar: text(item.promptAr),
      options,
      correct_answer: item.correctAnswer ?? item.answer ?? null,
      points: Math.max(0, numberOr(item.points, 1)),
      negative_points: Math.max(0, numberOr(item.negativePoints, 0)),
      model_answer_en: text(item.modelAnswer),
      model_answer_ar: text(item.modelAnswerAr),
      explanation_en: text(item.explanation),
      explanation_ar: text(item.explanationAr),
      hint_en: text(item.hint),
      hint_ar: text(item.hintAr),
      rubric: Array.isArray(item.rubric) ? item.rubric : [],
      difficulty: ["easy", "medium", "hard", "exam", "expert"].includes(text(item.difficulty))
        ? text(item.difficulty)
        : "medium",
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => text(tag)).filter(Boolean) : [],
      settings: item.settings && typeof item.settings === "object" ? item.settings : {},
      sort_order: index,
      status: item.status === "draft" ? "draft" : "published",
      updated_at: new Date().toISOString(),
    };
  }).filter((row) => row.id);
};

const resourceRows = (subject: Record<string, unknown>) => {
  const resources = Array.isArray(subject.resources) ? subject.resources : [];
  return resources.map((resource, index) => {
    const item = resource as Record<string, unknown>;
    const candidateType = text(item.resourceType || item.type, "link").toLowerCase();
    const resourceType = ["doc", "docx", "ppt", "pptx"].includes(candidateType)
      ? "file"
      : ["link", "pdf", "video", "audio", "image", "file", "article", "book", "custom"].includes(candidateType)
      ? candidateType
      : "link";
    return {
      id: text(item.id),
      subject_id: text(subject.id),
      chapter_id: text(item.chapterId) || null,
      block_id: text(item.blockId) || null,
      resource_type: resourceType,
      title_en: text(item.title, `Resource ${index + 1}`),
      title_ar: text(item.titleAr),
      url: text(item.url),
      description_en: text(item.description),
      description_ar: text(item.descriptionAr),
      metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : {},
      sort_order: index,
      status: item.status === "draft" ? "draft" : "published",
      updated_at: new Date().toISOString(),
    };
  }).filter((row) => row.id);
};

const toolRows = (subject: Record<string, unknown>) => {
  const tools = Array.isArray(subject.tools) ? subject.tools : [];
  return tools.map((tool, index) => {
    const item = tool as Record<string, unknown>;
    return {
      id: text(item.id),
      subject_id: text(subject.id),
      chapter_id: text(item.chapterId) || null,
      tool_type: text(item.type || item.toolType, "custom"),
      name_en: text(item.name, `Tool ${index + 1}`),
      name_ar: text(item.nameAr),
      description_en: text(item.description),
      description_ar: text(item.descriptionAr),
      config: item.config && typeof item.config === "object" ? item.config : item,
      sort_order: index,
      status: item.status === "draft" ? "draft" : "published",
      updated_at: new Date().toISOString(),
    };
  }).filter((row) => row.id);
};

const getAdminSettings = async (db: ReturnType<typeof createClient>) => {
  const { data, error } = await db
    .from("cms_admin_settings")
    .select("password_hash, reset_password_hash, password_version")
    .eq("setting_key", "administrator")
    .maybeSingle();
  if (error) throw new Error("The administrator configuration could not be read.");
  if (!data?.password_hash) throw new Error("The administrator password has not been configured.");
  return data;
};

const getPasswordHash = async (db: ReturnType<typeof createClient>) =>
  (await getAdminSettings(db)).password_hash;

const requestFingerprint = async (request: Request) => {
  const forwarded = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  return sha256(`${forwarded}|${agent}`);
};

const authLimit = async (db: ReturnType<typeof createClient>, fingerprint: string) => {
  const { data, error } = await db
    .from("cms_admin_rate_limits")
    .select("attempts, window_started_at, blocked_until")
    .eq("fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw new Error("The administrator rate-limit service could not be read.");
  if (!data) return { blocked: false, retryAfter: 0 };
  const now = Date.now();
  const blockedUntil = data.blocked_until ? Date.parse(data.blocked_until) : 0;
  if (blockedUntil > now) return { blocked: true, retryAfter: Math.ceil((blockedUntil - now) / 1000) };
  const windowStarted = data.window_started_at ? Date.parse(data.window_started_at) : 0;
  if (!windowStarted || windowStarted + AUTH_WINDOW_MS <= now) {
    await db.from("cms_admin_rate_limits").upsert({
      fingerprint,
      attempts: 0,
      window_started_at: new Date().toISOString(),
      blocked_until: null,
      updated_at: new Date().toISOString(),
    });
  }
  return { blocked: false, retryAfter: 0 };
};

const recordFailedAuth = async (db: ReturnType<typeof createClient>, fingerprint: string) => {
  const existing = await db
    .from("cms_admin_rate_limits")
    .select("attempts, window_started_at")
    .eq("fingerprint", fingerprint)
    .maybeSingle();
  if (existing.error) throw existing.error;
  const now = Date.now();
  const started = existing.data?.window_started_at ? Date.parse(existing.data.window_started_at) : 0;
  const inWindow = started && started + AUTH_WINDOW_MS > now;
  const attempts = inWindow ? Number(existing.data?.attempts || 0) + 1 : 1;
  const blocked = attempts >= AUTH_MAX_ATTEMPTS ? new Date(now + AUTH_BLOCK_MS).toISOString() : null;
  const result = await db.from("cms_admin_rate_limits").upsert({
    fingerprint,
    attempts,
    window_started_at: inWindow ? existing.data.window_started_at : new Date(now).toISOString(),
    blocked_until: blocked,
    updated_at: new Date().toISOString(),
  });
  if (result.error) throw result.error;
  return blocked ? Math.ceil(AUTH_BLOCK_MS / 1000) : 0;
};

const clearFailedAuth = async (db: ReturnType<typeof createClient>, fingerprint: string) => {
  const result = await db.from("cms_admin_rate_limits").delete().eq("fingerprint", fingerprint);
  if (result.error) throw result.error;
};

const draftKey = (value: unknown) => {
  const candidate = text(value, STUDIO_DRAFT_KEY).replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 120);
  return candidate || STUDIO_DRAFT_KEY;
};

const draftDocument = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The studio document must be an object.");
  }
  const document = value as Record<string, unknown>;
  if (!Array.isArray(document.subjects)) throw new Error("The studio document must contain a subject list.");
  if (document.subjects.length > MAX_SUBJECTS) throw new Error(`A studio draft may contain at most ${MAX_SUBJECTS} subjects.`);
  if (containsUnsafeMarkup(document)) throw new Error("Unsafe HTML or script content was rejected.");
  const serialized = JSON.stringify(document);
  if (new TextEncoder().encode(serialized).length > MAX_CONTENT_BYTES) throw new Error("The studio draft is too large.");
  return document;
};

const readStudioDraft = async (db: ReturnType<typeof createClient>, key: string) => {
  const result = await db.from("cms_studio_drafts")
    .select("draft_key, version, document, checksum, updated_by, created_at, updated_at")
    .eq("draft_key", key)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
};

const publicDraft = (row: Record<string, unknown> | null) => row ? ({
  draftKey: row.draft_key,
  version: Number(row.version || 0),
  document: row.document,
  checksum: row.checksum || "",
  updatedBy: row.updated_by || "administrator",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}) : null;

const saveStudioDraft = async (
  db: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) => {
  const key = draftKey(body.draftKey);
  const document = draftDocument(body.document);
  const current = await readStudioDraft(db, key);
  const currentVersion = Number(current?.version || 0);
  const baseVersion = Math.max(0, Math.trunc(numberOr(body.baseVersion, 0)));
  if (current && baseVersion !== currentVersion) {
    return { conflict: true, draft: publicDraft(current), currentVersion };
  }
  const nextVersion = currentVersion + 1;
  const checksum = await sha256(JSON.stringify(document));
  const now = new Date().toISOString();
  const saved = await db.from("cms_studio_drafts").upsert({
    draft_key: key,
    version: nextVersion,
    document,
    checksum,
    updated_by: "administrator",
    updated_at: now,
  }, { onConflict: "draft_key" }).select("draft_key, version, document, checksum, updated_by, created_at, updated_at").single();
  if (saved.error) throw saved.error;

  let checkpoint = null;
  if (body.checkpoint === true) {
    const allowedKinds = new Set(["manual", "publish", "restore", "import"]);
    const kind = allowedKinds.has(text(body.kind)) ? text(body.kind) : "manual";
    const version = await db.from("cms_studio_versions").insert({
      draft_key: key,
      version: nextVersion,
      label: text(body.label, `Version ${nextVersion}`).slice(0, 160),
      kind,
      document,
    }).select("id, version, label, kind, created_at").single();
    if (version.error) throw version.error;
    checkpoint = version.data;
  }
  return { conflict: false, draft: publicDraft(saved.data), checkpoint };
};

const listStudioVersions = async (db: ReturnType<typeof createClient>, body: Record<string, unknown>) => {
  const result = await db.from("cms_studio_versions")
    .select("id, version, label, kind, created_at")
    .eq("draft_key", draftKey(body.draftKey))
    .order("created_at", { ascending: false })
    .limit(STUDIO_VERSION_LIMIT);
  if (result.error) throw result.error;
  return result.data || [];
};

const loadStudioVersion = async (db: ReturnType<typeof createClient>, body: Record<string, unknown>) => {
  const versionNumber = Math.max(1, Math.trunc(numberOr(body.version, 0)));
  const result = await db.from("cms_studio_versions")
    .select("id, version, label, kind, document, created_at")
    .eq("draft_key", draftKey(body.draftKey))
    .eq("version", versionNumber)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new Error("That studio version could not be found.");
  return result.data;
};

const restoreStudioVersion = async (db: ReturnType<typeof createClient>, body: Record<string, unknown>) => {
  const key = draftKey(body.draftKey);
  const current = await readStudioDraft(db, key);
  const currentVersion = Number(current?.version || 0);
  const baseVersion = Math.max(0, Math.trunc(numberOr(body.baseVersion, 0)));
  if (current && baseVersion !== currentVersion) {
    return { conflict: true, draft: publicDraft(current), currentVersion };
  }
  const source = await loadStudioVersion(db, { ...body, draftKey: key });
  const document = draftDocument(source.document);
  const nextVersion = currentVersion + 1;
  const checksum = await sha256(JSON.stringify(document));
  const now = new Date().toISOString();
  const saved = await db.from("cms_studio_drafts").upsert({
    draft_key: key,
    version: nextVersion,
    document,
    checksum,
    updated_by: "administrator",
    updated_at: now,
  }, { onConflict: "draft_key" }).select("draft_key, version, document, checksum, updated_by, created_at, updated_at").single();
  if (saved.error) throw saved.error;
  const revision = await db.from("cms_studio_versions").insert({
    draft_key: key,
    version: nextVersion,
    label: `Restore: ${text(source.label, `Version ${source.version}`)}`.slice(0, 160),
    kind: "restore",
    document,
  }).select("id, version, label, kind, created_at").single();
  if (revision.error) throw revision.error;
  return { conflict: false, draft: publicDraft(saved.data), checkpoint: revision.data };
};

const updatePresence = async (db: ReturnType<typeof createClient>, body: Record<string, unknown>) => {
  const sessionId = text(body.sessionId).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
  if (!sessionId) throw new Error("A studio session ID is required.");
  const key = draftKey(body.draftKey);
  const now = new Date();
  const stale = new Date(now.getTime() - 90_000).toISOString();
  await db.from("cms_studio_presence").delete().eq("draft_key", key).lt("last_seen", stale);
  const saved = await db.from("cms_studio_presence").upsert({
    session_id: sessionId,
    draft_key: key,
    label: text(body.label, "Administrator").slice(0, 80),
    subject_id: text(body.subjectId).slice(0, 160) || null,
    page_id: text(body.pageId).slice(0, 160) || null,
    last_seen: now.toISOString(),
  }, { onConflict: "session_id" });
  if (saved.error) throw saved.error;
  const active = await db.from("cms_studio_presence")
    .select("session_id, draft_key, label, subject_id, page_id, last_seen")
    .eq("draft_key", key)
    .order("last_seen", { ascending: false });
  if (active.error) throw active.error;
  return active.data || [];
};

const uploadStudioAsset = async (db: ReturnType<typeof createClient>, body: Record<string, unknown>, projectUrl: string) => {
  const contentType = text(body.contentType).toLowerCase();
  const allowedTypes = new Set([
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "video/mp4", "video/webm", "audio/mpeg", "audio/ogg", "audio/wav",
  ]);
  if (!allowedTypes.has(contentType)) throw new Error("That file type is not supported. Use an image, PDF, Word, PowerPoint, MP4, WebM, MP3, OGG, or WAV file.");
  const encoded = text(body.data);
  if (!encoded || encoded.length > 7_500_000) throw new Error("The file is too large for the browser publisher.");
  let bytes: Uint8Array;
  try {
    const binary = atob(encoded);
    bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("The uploaded file data was not valid.");
  }
  if (bytes.length > 5_500_000) throw new Error("For this publisher, choose a file smaller than 5.5 MB.");
  const filename = text(body.fileName, "asset").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "asset";
  const path = `studio/${crypto.randomUUID()}-${filename}`;
  const upload = await db.storage.from(STUDIO_UPLOAD_BUCKET).upload(path, bytes, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) throw upload.error;
  const publicUrl = `${projectUrl.replace(/\/$/, "")}/storage/v1/object/public/${STUDIO_UPLOAD_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
  return { path, url: publicUrl, contentType, size: bytes.length };
};

const isAuthorized = async (db: ReturnType<typeof createClient>, password: unknown) => {
  if (typeof password !== "string" || password.length < 1 || password.length > 128) return false;
  const expected = await getPasswordHash(db);
  return constantTimeEqual(await sha256(password), expected);
};

Deno.serve(async (request: Request) => {
  const origin = originFor(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405, origin);
  if (!originIsAllowed(request)) return reply({ error: "This administrator request came from an unexpected origin." }, 403, origin);

  const key = serviceKey();
  const url = Deno.env.get("SUPABASE_URL");
  if (!key || !url) return reply({ error: "Supabase server configuration is incomplete." }, 503, origin);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Request body must be valid JSON." }, 400, origin);
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const fingerprint = await requestFingerprint(request);
    const limit = await authLimit(db, fingerprint);
    if (limit.blocked) {
      return reply({ error: "Too many unsuccessful administrator attempts. Try again later.", retryAfter: limit.retryAfter }, 429, origin);
    }
    if (!(await isAuthorized(db, body.password))) {
      const retryAfter = await recordFailedAuth(db, fingerprint);
      if (retryAfter) return reply({ error: "Too many unsuccessful administrator attempts. Try again later.", retryAfter }, 429, origin);
      return reply({ error: "The administrator password is not correct." }, 401, origin);
    }
    await clearFailedAuth(db, fingerprint);

    const action = text(body.action, "publish");
    const supportedActions = new Set([
      "publish",
      "verify",
      "change_password",
      "reset_password",
      "load_draft",
      "save_draft",
      "list_versions",
      "load_version",
      "restore_version",
      "presence",
      "upload_asset",
    ]);
    if (!supportedActions.has(action)) {
      return reply({ error: "That administrator action is not supported." }, 400, origin);
    }
    if (action === "verify") {
      return reply({ ok: true, action: "verified" }, 200, origin);
    }

    if (action === "change_password") {
      const nextPassword = body.nextPassword;
      if (typeof nextPassword !== "string" || nextPassword.length < 4 || nextPassword.length > 128) {
        return reply({ error: "Use a password between 4 and 128 characters." }, 400, origin);
      }
      const settings = await getAdminSettings(db);
      const { error } = await db.from("cms_admin_settings").upsert({
        setting_key: "administrator",
        password_hash: await sha256(nextPassword),
        password_version: Number(settings.password_version || 1) + 1,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return reply({ ok: true, action: "password_changed" }, 200, origin);
    }

    if (action === "reset_password") {
      const settings = await getAdminSettings(db);
      if (!settings.reset_password_hash) return reply({ error: "A reset password has not been configured." }, 503, origin);
      const { error } = await db.from("cms_admin_settings").upsert({
        setting_key: "administrator",
        password_hash: settings.reset_password_hash,
        password_version: Number(settings.password_version || 1) + 1,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return reply({ ok: true, action: "password_reset" }, 200, origin);
    }

    if (action === "load_draft") {
      return reply({ ok: true, draft: publicDraft(await readStudioDraft(db, draftKey(body.draftKey))) }, 200, origin);
    }

    if (action === "save_draft") {
      const result = await saveStudioDraft(db, body);
      if (result.conflict) return reply({ ok: false, conflict: true, code: "DRAFT_CONFLICT", error: "This draft changed in another administrator session.", draft: result.draft, currentVersion: result.currentVersion }, 409, origin);
      return reply({ ok: true, draft: result.draft, checkpoint: result.checkpoint }, 200, origin);
    }

    if (action === "list_versions") {
      return reply({ ok: true, versions: await listStudioVersions(db, body) }, 200, origin);
    }

    if (action === "load_version") {
      const version = await loadStudioVersion(db, body);
      return reply({ ok: true, version }, 200, origin);
    }

    if (action === "restore_version") {
      const result = await restoreStudioVersion(db, body);
      if (result.conflict) return reply({ ok: false, conflict: true, code: "DRAFT_CONFLICT", error: "This draft changed in another administrator session.", draft: result.draft, currentVersion: result.currentVersion }, 409, origin);
      return reply({ ok: true, draft: result.draft, checkpoint: result.checkpoint }, 200, origin);
    }

    if (action === "presence") {
      return reply({ ok: true, active: await updatePresence(db, body) }, 200, origin);
    }

    if (action === "upload_asset") {
      return reply({ ok: true, asset: await uploadStudioAsset(db, body, url) }, 200, origin);
    }

    const content = body.content as Record<string, unknown> | undefined;
    const subjects = Array.isArray(content?.subjects) ? content.subjects as Record<string, unknown>[] : [];
    const contentText = JSON.stringify(content || {});
    if (contentText.length > MAX_CONTENT_BYTES) {
      return reply({ error: "The content package is too large to publish." }, 413, origin);
    }
    if (containsUnsafeMarkup(content)) {
      return reply({ error: "Unsafe HTML or script content was rejected. Use supported content blocks and links." }, 400, origin);
    }
    if (subjects.length > MAX_SUBJECTS) return reply({ error: `A publish package may contain at most ${MAX_SUBJECTS} subjects.` }, 400, origin);
    if (!subjects.length) return reply({ error: "Add at least one subject before publishing." }, 400, origin);

    const version = Math.max(1, Math.trunc(numberOr(content?.version, 1)));
    const rows = subjects.map((subject) => subjectRow(subject, version));
    const event = await db.from("cms_publish_events").insert({
      subject_ids: rows.map((row) => row.id),
      status: "started",
      version,
    }).select("id").single();
    if (event.error) throw event.error;

    const upserted = await db.from("cms_subjects").upsert(rows, { onConflict: "id" });
    if (upserted.error) throw upserted.error;

    const chapters = subjects.flatMap(chapterRows);
    if (chapters.length) {
      const result = await db.from("cms_chapters").upsert(chapters, { onConflict: "id" });
      if (result.error) throw result.error;
    }

    const blocks = [...subjects.flatMap(noteRows), ...subjects.flatMap(customBlockRows)];
    if (blocks.length) {
      const uniqueBlocks = [...new Map(blocks.map((block) => [block.id, block])).values()];
      const result = await db.from("cms_content_blocks").upsert(uniqueBlocks, { onConflict: "id" });
      if (result.error) throw result.error;
    }

    const questions = subjects.flatMap(questionRows);
    if (questions.length) {
      const result = await db.from("cms_questions").upsert(questions, { onConflict: "id" });
      if (result.error) throw result.error;
    }

    const resources = subjects.flatMap(resourceRows);
    if (resources.length) {
      const result = await db.from("cms_resources").upsert(resources, { onConflict: "id" });
      if (result.error) throw result.error;
    }

    const tools = subjects.flatMap(toolRows);
    if (tools.length) {
      const result = await db.from("cms_tools").upsert(tools, { onConflict: "id" });
      if (result.error) throw result.error;
    }

    const revisionRows = rows.map((row) => ({
      subject_id: row.id,
      entity_type: "subject",
      entity_id: row.id,
      version,
      action: "publish",
      snapshot: row.document,
      author_label: "administrator",
    }));
    const revisions = await db.from("cms_revisions").insert(revisionRows);
    if (revisions.error) throw revisions.error;

    const completed = await db.from("cms_publish_events")
      .update({ status: "succeeded", completed_at: new Date().toISOString() })
      .eq("id", event.data.id);
    if (completed.error) throw completed.error;

    return reply({
      ok: true,
      provider: "supabase",
      publishedSubjects: rows.filter((row) => !row.archived).length,
      version,
    }, 200, origin);
  } catch (error) {
    console.error("content-publish failed", error);
    return reply({ error: "The content could not be published. Check the Supabase function logs." }, 500, origin);
  }
});
