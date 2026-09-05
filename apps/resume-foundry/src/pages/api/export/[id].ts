import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return new Response('Not found', { status: 404 });
  }

  const db = env.DB;
  const exportRow = await db
    .prepare('SELECT r2_key AS r2Key FROM exports WHERE id = ?1')
    .bind(id)
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
