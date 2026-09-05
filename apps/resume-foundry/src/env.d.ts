/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface Env {
  DB: D1Database;
  EXPORTS: R2Bucket;
  AI?: Ai;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
}

// Merges our bindings into the ambient `Cloudflare.Env` used by
// `import { env } from 'cloudflare:workers'` (Astro v6 / @astrojs/cloudflare v14+).
declare namespace Cloudflare {
  interface Env extends globalThis.Env {}
}
