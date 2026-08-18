# AG Project

A focused study platform for BUC111 and ECO101. It gives learners complete BUC111 material, structured ECO101 notes, flashcards, quick quizzes, notes, bookmarks, progress tracking, a light/dark view, and cross-device study sync.

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

### Permission and privacy

GitHub sign-in requests `read:user` and `gist`. The first scope identifies the learner in the interface. The `gist` scope is necessary for the app to list, create, read, and update the learner's secret study-profile Gist. GitHub scopes do not offer a one-Gist-only permission, so anyone enabling sync should understand that the authorization can read and write their public and secret Gists. The app itself only looks for and maintains `ag-project-study-profile.json`; it does not request repository access. [Secret Gists are unlisted, not truly private](https://docs.github.com/en/get-started/writing-on-github/working-with-gists/creating-gists), so learners should never put sensitive personal information in their notes. Learners can review or revoke the authorization in their GitHub settings at any time.

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

5. Deploy the repository. `netlify.toml` already provides the build, publish directory, and function configuration.

Do not add real values to `.env.example`, commit an `.env` file, or expose the OAuth client secret in browser code.

## Included content

- **BUC111**: the original Chapters 7–9 summary and final comparison are bundled in `public/buc111-legacy.html` and presented inside the new course workspace.
- **ECO101**: starter material for scarcity, opportunity cost, supply, demand, and equilibrium, including short examples and interactive review.

<!-- TASKPLANNER:ATTRIBUTION:START -->
This project uses [TaskPlanner](https://github.com/smekai/taskplanner) for task planning.
<!-- TASKPLANNER:ATTRIBUTION:END -->
