# AG Project

A focused study platform for BUC111 and ECO101. It gives learners complete BUC111 material, structured ECO101 notes, flashcards, quick quizzes, notes, bookmarks, progress tracking, a mistake book, an exam simulator, an economics graph/formula lab, bilingual-ready fields, a light/dark view, and an admin content builder.

## Run locally

```bash
npm install
npm run dev
```

Run the checks before publishing:

```bash
npm run check
```

## How study sync works

The app has a device-local study profile from the first visit. When a learner signs in with GitHub, the Netlify functions store that same profile in a secret (unlisted) GitHub Gist owned by the learner. The browser never receives the GitHub access token: the token stays encrypted inside an HTTP-only session cookie.

This keeps the requested backend inside GitHub: no database account or third-party data store is required.

## Manage shared course content

The **Manage content** button opens the non-AI course builder. It lets the administrator create and edit:

- subjects and chapters
- English and Arabic names, descriptions, notes, examples, and key points
- flashcards with rating-based review
- reusable multiple-choice questions with difficulty levels
- reusable subject tools such as the ECO101 graph/formula lab

Drafts are saved locally while they are being edited. **Export JSON** provides a recoverable backup. **Publish to GitHub** sends the validated catalogue to `public/content/subjects.json` through a protected Netlify function. A successful GitHub commit triggers the existing Netlify deployment, so the published subjects become available to everyone after the deploy completes. Learners do not need to sign in to read the published content.

The AI generator is deliberately not part of this first non-AI build. The builder is fully usable with manually entered content and is ready for a future server-side generator.

### Permission and privacy

GitHub sign-in requests `read:user`, `gist`, and repository access by default because the administrator must be able to commit the shared content file. Set `GITHUB_OAUTH_SCOPE` explicitly if your repository is public and you want to use a narrower scope such as `read:user gist public_repo`. The publishing function also checks `ADMIN_GITHUB_LOGIN`; a different GitHub account receives a 403 response. Learners can review or revoke the authorization in their GitHub settings at any time.

## Enable production GitHub sync

1. Create a GitHub OAuth App in the GitHub account that owns the project.
2. Set its Homepage URL to the Netlify site URL.
3. Set its Authorization callback URL to:

   ```text
   https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/auth?action=callback
   ```

4. In Netlify, add these environment variables from the OAuth App and a long random session value:

   ```text
   GITHUB_CLIENT_ID
   GITHUB_CLIENT_SECRET
   SESSION_SECRET
   ```

5. Add the content publishing allow-list and repository target:

   ```text
   ADMIN_GITHUB_LOGIN=your-github-username
   CONTENT_REPO_OWNER=your-github-username
   CONTENT_REPO_NAME=ag-project-studies
   CONTENT_REPO_BRANCH=main
   ```

   `CONTENT_FILE_PATH` is optional and defaults to `public/content/subjects.json`.

6. Deploy the repository. `netlify.toml` already provides the build, publish directory, and function configuration.

7. Redeploy after changing environment variables. The administrator must sign in through the **Manage content** panel before the publish request is accepted.

Do not add real values to `.env.example`, commit an `.env` file, or expose the OAuth client secret in browser code.

## Included content

- **BUC111**: the original Chapters 7–9 summary and final comparison are bundled in `public/buc111-legacy.html` and presented inside the new course workspace.
- **ECO101**: starter material for scarcity, opportunity cost, supply, demand, and equilibrium, including short examples and interactive review.

<!-- TASKPLANNER:ATTRIBUTION:START -->
This project uses [TaskPlanner](https://github.com/smekai/taskplanner) for task planning.
<!-- TASKPLANNER:ATTRIBUTION:END -->
