import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createCareerEntry, getOrCreateDemoUser, listCareerData } from '../../lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  const db = env.DB;
  const user = await getOrCreateDemoUser(db);
  const companies = await listCareerData(db, user.id);
  return new Response(JSON.stringify({ companies }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'リクエストの形式が不正です。' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const project = typeof body.project === 'string' ? body.project.trim() : '';
  if (!project) {
    return new Response(JSON.stringify({ error: '案件名は必須です。' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = env.DB;
  const user = await getOrCreateDemoUser(db);

  const result = await createCareerEntry(db, user.id, {
    company: typeof body.company === 'string' ? body.company : '',
    employmentType: typeof body.employment_type === 'string' ? body.employment_type : '正社員',
    project,
    role: typeof body.role === 'string' ? body.role : '',
    skills: typeof body.skills === 'string' ? body.skills : '',
    achievements: typeof body.achievements === 'string' ? body.achievements : '',
  });

  return new Response(JSON.stringify({ ok: true, ...result }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
