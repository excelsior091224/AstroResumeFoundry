import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getCareerContext } from '../../lib/db';
import { renderResumeHtml } from '../../lib/resume';

export const prerender = false;

export const POST: APIRoute = async () => {
  const db = env.DB;
  const { user, companies } = await getCareerContext(db);
  const html = renderResumeHtml(user, companies);

  const id = crypto.randomUUID();
  const r2Key = `exports/${user.id}/${id}.html`;

  await env.EXPORTS.put(r2Key, html, {
    httpMetadata: { contentType: 'text/html; charset=utf-8' },
  });

  await db
    .prepare(
      `INSERT INTO exports (id, user_id, format, template_key, r2_key)
       VALUES (?1, ?2, 'html', 'standard', ?3)`
    )
    .bind(id, user.id, r2Key)
    .run();

  return new Response(JSON.stringify({ ok: true, id, downloadUrl: `/api/export/${id}` }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
