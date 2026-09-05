import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getOrCreateDemoUser } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return new Response('Not found', { status: 404 });
  }

  const db = env.DB;
  // Even though auth isn't implemented yet, scope the lookup to the current
  // user so this check is meaningful once real accounts exist.
  const user = await getOrCreateDemoUser(db);
  const exportRow = await db
    .prepare('SELECT r2_key AS r2Key FROM exports WHERE id = ?1 AND user_id = ?2')
    .bind(id, user.id)
    .first<{ r2Key: string | null }>();

  if (!exportRow?.r2Key) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.EXPORTS.get(exportRow.r2Key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="resume-${id}.html"`,
    },
  });
};
