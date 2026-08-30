import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_PASSWORD_HASH =
  "ecd6512bdf3b727d065dec7da7b0523023594a474c7fb63bf0efce1e8d080da6";
const MAX_CONTENT_BYTES = 8_000_000;
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
  return ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://ag-study-studioo.netlify.app";
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
      block_type: text(item.blockType, "paragraph"),
      title_en: text(item.title),
      title_ar: text(item.titleAr),
      content: item.content && typeof item.content === "object" ? item.content : item,
      sort_order: numberOr(item.sortOrder, index),
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
    const questionType = ["mcq", "true_false", "short_answer", "paragraph", "bullet_list", "matching", "ordering", "formula", "fill_blank", "custom"].includes(text(item.questionType))
      ? text(item.questionType)
      : options.length ? "mcq" : "short_answer";
    const responseFormat = ["paragraph", "bullet_list", "single_choice", "multiple_choice", "short_text", "number", "formula", "matching", "ordering"].includes(text(item.responseFormat))
      ? text(item.responseFormat)
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
      difficulty: ["easy", "medium", "hard", "expert"].includes(text(item.difficulty))
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
    return {
      id: text(item.id),
      subject_id: text(subject.id),
      chapter_id: text(item.chapterId) || null,
      block_id: text(item.blockId) || null,
      resource_type: ["link", "pdf", "video", "audio", "image", "file", "article", "book", "custom"].includes(text(item.resourceType))
        ? text(item.resourceType)
        : "link",
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
      tool_type: text(item.toolType, "custom"),
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

const getPasswordHash = async (db: ReturnType<typeof createClient>) => {
  const { data, error } = await db
    .from("cms_admin_settings")
    .select("password_hash")
    .eq("setting_key", "administrator")
    .maybeSingle();
  if (error) throw new Error("The administrator configuration could not be read.");
  return data?.password_hash || DEFAULT_PASSWORD_HASH;
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
    if (!(await isAuthorized(db, body.password))) {
      return reply({ error: "The administrator password is not correct." }, 401, origin);
    }

    const action = text(body.action, "publish");
    if (action === "verify") {
      return reply({ ok: true, action: "verified" }, 200, origin);
    }

    if (action === "change_password") {
      const nextPassword = body.nextPassword;
      if (typeof nextPassword !== "string" || nextPassword.length < 4 || nextPassword.length > 128) {
        return reply({ error: "Use a password between 4 and 128 characters." }, 400, origin);
      }
      const { error } = await db.from("cms_admin_settings").upsert({
        setting_key: "administrator",
        password_hash: await sha256(nextPassword),
        password_version: 1,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return reply({ ok: true, action: "password_changed" }, 200, origin);
    }

    if (action === "reset_password") {
      const { error } = await db.from("cms_admin_settings").upsert({
        setting_key: "administrator",
        password_hash: DEFAULT_PASSWORD_HASH,
        password_version: 1,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return reply({ ok: true, action: "password_reset" }, 200, origin);
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
    if (subjects.length > 200) return reply({ error: "A publish package may contain at most 200 subjects." }, 400, origin);
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

