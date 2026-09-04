# AG Project

A focused university study platform for BUC111 and ECO101. It gives learners complete BUC111 material, structured ECO101 notes, flashcards, quick quizzes, notes, bookmarks, progress tracking, a light/dark view, a GPA calculator, and a reusable Administrator content workspace.

## Run locally

```bash
npm install
npm run dev
```

Run the checks before publishing:

```bash
npm run check
```

## Shared university content

The Administrator workspace is opened from the lower sidebar and uses an administrator password. It supports:

- Subjects with descriptions, colours, archive state, and duplicate/reorder controls
- Chapters and ordered study sections, with separate Course content, Midterm, and Final groups inside one subject
- Long-form notes with summaries, key points, examples, and safe plain-text bodies
- Resources such as PDFs, slides, videos, and external links
- Flashcards, multiple-choice questions, answer explanations, glossary terms, and formulas
- Draft saving, JSON import/export, and publish status
- Protected cloud drafts with optimistic conflict detection, named recovery checkpoints, version restore, and active-session presence
- Local progress controls for a selected subject or the whole device, with a hard 100% cap
- A high-fidelity Word-style document editor with a tabbed ribbon, formatting, page design/layout, bilingual direction, dictation when the browser supports it, zoom, and live student rendering
- A high-fidelity PowerPoint-style slide editor with a ribbon, slide filmstrip, layouts, shapes, themes, transitions, animations, presenter notes, slideshow mode, and live student rendering
- Safe HTML/HTM import that removes scripts and source styling, converts readable content to structured blocks, assigns it to a subject/chapter, and automatically applies the AG Project theme
- Protected uploads for images, PDFs, Word files, PowerPoint files, audio, and short videos through Supabase Storage
- Advanced subject-scoped content blocks, bilingual tables, formulas, drawings, safe media links, custom schemas, and reusable tool definitions

Published content is stored in Supabase tables and exposed through the read-only `cms_public_subjects` view. The public app reads the shared subject documents and merges them with the built-in BUC111/ECO101 catalog, so every visitor receives the same approved subjects and notes across phones and laptops.

The browser contains only the Supabase publishable key. The Supabase `content-publish` Edge Function validates the administrator password and writes the approved subject document to the CMS tables. No GitHub token is required for publishing content, and content publishing does not trigger a Netlify build.

The Administrator chapter editor has dedicated `+ Midterm` and `+ Final` actions, a section filter, and an assessment-section selector. Moving a chapter between those groups changes shared curriculum only; it does not change any learner's private completion data.

## Student data is local-only

The GPA plan, personal study notes, bookmarks, completed sections, flashcard reviews, and quiz attempts are saved automatically in the current browser's local storage. They are never included in `public/content.json`, sent to GitHub, or synced to another student's device. Students do not need an account or GitHub sign-in.

This is intentionally device-specific: clearing browser/site data or moving to another device removes that local copy. The shared university library is separate and remains repository-backed.

The Administrator dashboard can mark the selected subject or every subject as 100% complete on the current device for preview/demo purposes. It cannot make progress exceed 100%, and it cannot write progress to GitHub or to another device.

## Enable Administrator publishing

The publish button is already connected to the Supabase project used by this site. No GitHub token or new Netlify environment variable is needed for the content workflow.

1. Open Administrator and enter the current administrator password.
2. Edit one subject in Content Studio.
3. Save draft if you want a local checkpoint, then review the validation message.
4. Click `Publish to Supabase`.
5. Refresh the public site on another device to read the new shared content.

The administrator password is intentionally not printed anywhere in the interface. The Edge Function stores the password hash in the private `cms_admin_settings` table. Use the Administrator password controls to change or reset it.

The CMS intentionally uses deterministic browser tools instead of a paid AI API. The editing, HTML conversion, preview, versioning, publishing, and media workflows run on the existing GitHub, Netlify, and Supabase setup without adding a paid service.

## Deployment model

Netlify remains the website host and handles code deployments from GitHub. Supabase handles shared subject content. Student notes, GPA plans, bookmarks, completion, flashcard reviews, and quiz attempts remain local to each student's device. GitHub is the code/version repository and is not used as the live CMS database.

<!-- TASKPLANNER:ATTRIBUTION:START -->
This project uses [TaskPlanner](https://github.com/smekai/taskplanner) for task planning.
<!-- TASKPLANNER:ATTRIBUTION:END -->
