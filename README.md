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
- Local progress controls for a selected subject or the whole device, with a hard 100% cap

Published content is stored in `public/content.json` in this GitHub repository. The public app reads that file and merges it with the built-in BUC111/ECO101 catalog, so every deployed visitor receives the same approved subjects and notes across phones and laptops.

The browser never receives the GitHub token. The `content-publish` Netlify Function validates the administrator request, updates only `public/content.json`, and lets the connected Netlify deployment rebuild the site.

The Administrator chapter editor has dedicated `+ Midterm` and `+ Final` actions, a section filter, and an assessment-section selector. Moving a chapter between those groups changes shared curriculum only; it does not change any learner's private completion data.

## Student data is local-only

The GPA plan, personal study notes, bookmarks, completed sections, flashcard reviews, and quiz attempts are saved automatically in the current browser's local storage. They are never included in `public/content.json`, sent to GitHub, or synced to another student's device. Students do not need an account or GitHub sign-in.

This is intentionally device-specific: clearing browser/site data or moving to another device removes that local copy. The shared university library is separate and remains repository-backed.

The Administrator dashboard can mark the selected subject or every subject as 100% complete on the current device for preview/demo purposes. It cannot make progress exceed 100%, and it cannot write progress to GitHub or to another device.

## Enable Administrator publishing

The publish button needs a GitHub token in Netlify because a browser must never contain a repository write token.

1. Create a fine-grained GitHub token with **Contents: Read and write** access limited to this repository.
2. In Netlify, open the site settings and add `GITHUB_CONTENT_TOKEN` with that token as its value.
3. Add `CONTENT_REPOSITORY` as `notsrey54-lang/ag-project-studies` and `CONTENT_BRANCH` as `main` if those values are not already present.
4. Optionally add `ADMIN_PUBLISH_PASSWORD` if you later want the server-side publishing password to differ from the initial administrator password. Keep it as a Netlify secret, never in GitHub.
5. Trigger a fresh Netlify deploy after adding or changing environment variables.

The administrator password is intentionally not printed anywhere in the interface. The initial value is represented in the frontend and function as a hash; use the Administrator password controls to change/reset the local administrator unlock, and update `ADMIN_PUBLISH_PASSWORD` in Netlify too when you move to a different publishing password.

The AI generator is intentionally not enabled in this non-AI foundation. It can be added later behind a server-side API key without changing the content model.

<!-- TASKPLANNER:ATTRIBUTION:START -->
This project uses [TaskPlanner](https://github.com/smekai/taskplanner) for task planning.
<!-- TASKPLANNER:ATTRIBUTION:END -->
