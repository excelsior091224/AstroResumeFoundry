# AstroResumeFoundry

This directory contains the source intended to become the standalone `excelsior091224/AstroResumeFoundry` repository.

## Stack

- Astro running on Cloudflare Workers
- Cloudflare D1 for reusable career data
- Cloudflare R2 for temporary or paid export files
- Optional Cloudflare Workers AI or external AI APIs for summaries and reviews
- Clerk is the first authentication candidate for MVP validation

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run db:migrate:local
```

Before remote deployment, create the D1 database and R2 bucket in Cloudflare, then replace `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID` in `wrangler.jsonc`.

## Repository split

This app should be moved to the root of a new GitHub repository named `AstroResumeFoundry`.

```text
excelsior091224/AstroResumeFoundry
  ├─ astro.config.mjs
  ├─ wrangler.jsonc
  ├─ db/
  ├─ src/
  ├─ package.json
  └─ README.md
```

After the new repository is created, copy the contents of this directory into the new repository root and run `npm install` there.

## Migration principle

The existing Laravel app can remain as a one-shot resume generator while this app validates the saved career-log SaaS model. The MVP should store reusable career facts and generate resumes from those facts, rather than storing generated documents as the primary data source.
