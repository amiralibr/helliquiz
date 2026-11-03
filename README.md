# HelliQuiz

An educational online quiz project with a Next.js / React / TypeScript frontend and a Strapi backend.

**Status: in development.** The application source is currently on development branches; the main branch contains documentation only. No hosted demo or production-readiness claim is made here.

## Find the implementation

- [Web application and backend — feature/frontend-setup](https://github.com/amiralibr/helliquiz/tree/feature/frontend-setup)
- [Backend development — feature/backend-setup](https://github.com/amiralibr/helliquiz/tree/feature/backend-setup)

On the frontend branch, `frontend/` contains the Next.js application and `backend/` contains Strapi. The branches are development snapshots, not release channels.

## Implemented source areas

- Quiz listing and individual quiz pages.
- A quiz runner with answer selection, countdown logic and submission handling.
- Results and per-question feedback.
- Mathematical expression rendering through KaTeX.
- Strapi content types and modules for quizzes, questions and submissions.

These observations describe the source; they do not establish that every flow has passed runtime or end-to-end validation.

## Local development orientation

Clone the branch containing the application:

```sh
git clone --branch feature/frontend-setup https://github.com/amiralibr/helliquiz.git
cd helliquiz
```

Each application has its own package manifest and lockfile. Run `npm ci` in each directory. Both manifests define `npm run dev` and `npm run build`; the frontend also defines `npm run lint`.

**Backend configuration is required before starting.** Review `backend/config/server.ts`, `admin.ts`, `plugins.ts` and `database.ts`. Generate your own local secrets for the environment keys those files consume; never reuse published values or commit a local environment file. SQLite is the default database configuration. Quiz content must be created in a local Strapi instance.

The frontend reads `NEXT_PUBLIC_STRAPI_API_URL`, defaulting to `http://localhost:1337`. Set it to the intended local backend URL. Client-visible environment variables must not contain credentials.

Check the runtime requirements in the application manifests and lockfiles before installing dependencies. These instructions are source-derived orientation, not a verified clean-install guide; no build, lint or runtime tests were run for this documentation change.

## Project context

This is a collaborative educational project. Contributions should be attributed through the repository history; this README does not imply sole authorship, a commercial launch or a deployed service.
