# AstroResumeFoundry repository setup

This file describes how to split the Astro + Cloudflare Workers prototype into a new repository.

## Target repository

```text
excelsior091224/AstroResumeFoundry
```

## Source directory in this repository

```text
apps/resume-foundry
```

## Manual split steps

1. Create a new empty GitHub repository named `AstroResumeFoundry`.
2. Copy every file from `apps/resume-foundry` into the new repository root.
3. Run `npm install` in the new repository.
4. Create Cloudflare resources:
   - D1 database: `astro-resume-foundry`
   - R2 bucket: `astro-resume-foundry-exports`
5. Replace `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID` in `wrangler.jsonc`.
6. Run `npm run build`.
7. Run `npm run db:migrate:remote` after Cloudflare credentials are configured.
8. Deploy with `npm run deploy`.

## After split

Keep this Laravel repository focused on the one-shot resume generator. Continue saved career-log SaaS development in `AstroResumeFoundry`.
