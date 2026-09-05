// D1 data-access helpers for the career-log MVP.
// Auth is not wired up yet, so every request operates against a single
// demo user record. Once real authentication (e.g. Clerk) is added,
// replace `getOrCreateDemoUser` with a lookup based on the authenticated
// session/provider subject.

const DEMO_PROVIDER_SUBJECT = 'demo-user';
const DEMO_EMAIL = 'demo@resumefoundries.com';

export interface CareerUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface CompanyRecord {
  id: string;
  name: string | null;
  employmentType: string;
  employmentTypeNote: string | null;
  businessSummary: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  isCurrent: boolean;
  sortOrder: number;
}

export interface SkillRecord {
  id: string;
  category: string;
  name: string;
  years: string | null;
  level: string | null;
  note: string | null;
}

export interface ProjectRecord {
  id: string;
  companyId: string | null;
  name: string;
  role: string | null;
  teamSize: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  isCurrent: boolean;
  description: string | null;
  responsibilities: string | null;
  achievements: string | null;
  challenges: string | null;
  sortOrder: number;
  skills: SkillRecord[];
}

export interface CompanyWithProjects extends CompanyRecord {
  projects: ProjectRecord[];
}

export interface CareerInput {
  company: string;
  employmentType: string;
  project: string;
  role: string;
  skills: string;
  achievements: string;
}

function newId(): string {
  return crypto.randomUUID();
}

export async function getOrCreateDemoUser(db: D1Database): Promise<CareerUser> {
  // `provider_subject` is UNIQUE, so INSERT OR IGNORE followed by a SELECT is
  // race-safe even if two requests try to create the demo user concurrently.
  const id = newId();
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, display_name, auth_provider, provider_subject)
       VALUES (?1, ?2, ?3, 'demo', ?4)`
    )
    .bind(id, DEMO_EMAIL, 'サンプル 太郎', DEMO_PROVIDER_SUBJECT)
    .run();

  const user = await db
    .prepare('SELECT id, email, display_name AS displayName FROM users WHERE provider_subject = ?1')
    .bind(DEMO_PROVIDER_SUBJECT)
    .first<CareerUser>();

  if (!user) {
    throw new Error('Failed to load or create the demo user.');
  }

  return user;
}

/**
 * Loads the demo user together with their career data. Shared by pages/API
 * routes that need both pieces (careers.astro, preview.astro, api/careers).
 */
export async function getCareerContext(
  db: D1Database
): Promise<{ user: CareerUser; companies: CompanyWithProjects[] }> {
  const user = await getOrCreateDemoUser(db);
  const companies = await listCareerData(db, user.id);
  return { user, companies };
}

async function findCompanyByName(
  db: D1Database,
  userId: string,
  name: string
): Promise<{ id: string } | null> {
  return db
    .prepare('SELECT id FROM companies WHERE user_id = ?1 AND name = ?2 LIMIT 1')
    .bind(userId, name)
    .first<{ id: string }>();
}

async function createCompany(
  db: D1Database,
  userId: string,
  name: string,
  employmentType: string
): Promise<string> {
  const id = newId();
  await db
    .prepare(
      `INSERT INTO companies (id, user_id, name, employment_type, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(id, userId, name, employmentType, Date.now())
    .run();
  return id;
}

async function createProject(
  db: D1Database,
  userId: string,
  companyId: string | null,
  input: Pick<CareerInput, 'project' | 'role' | 'achievements'>
): Promise<string> {
  const id = newId();
  await db
    .prepare(
      `INSERT INTO projects (id, user_id, company_id, name, role, achievements, sort_order)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(id, userId, companyId, input.project, input.role || null, input.achievements || null, Date.now())
    .run();
  return id;
}

async function findOrCreateSkill(
  db: D1Database,
  userId: string,
  name: string
): Promise<string> {
  const existing = await db
    .prepare(
      "SELECT id FROM skills WHERE user_id = ?1 AND category = 'general' AND name = ?2 LIMIT 1"
    )
    .bind(userId, name)
    .first<{ id: string }>();

  if (existing) {
    return existing.id;
  }

  const id = newId();
  await db
    .prepare(`INSERT INTO skills (id, user_id, category, name) VALUES (?1, ?2, 'general', ?3)`)
    .bind(id, userId, name)
    .run();
  return id;
}

function parseSkillNames(raw: string): string[] {
  return raw
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Persist one career-log entry (company + project + skills) for the demo user.
 */
export async function createCareerEntry(
  db: D1Database,
  userId: string,
  input: CareerInput
): Promise<{ companyId: string | null; projectId: string }> {
  let companyId: string | null = null;
  const companyName = input.company.trim();
  if (companyName) {
    const existingCompany = await findCompanyByName(db, userId, companyName);
    companyId = existingCompany
      ? existingCompany.id
      : await createCompany(db, userId, companyName, input.employmentType);
  }

  const projectId = await createProject(db, userId, companyId, input);

  const skillNames = parseSkillNames(input.skills);
  for (const skillName of skillNames) {
    const skillId = await findOrCreateSkill(db, userId, skillName);
    await db
      .prepare(
        'INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?1, ?2)'
      )
      .bind(projectId, skillId)
      .run();
  }

  return { companyId, projectId };
}

/**
 * Load all companies, projects and linked skills for a user, ordered for
 * resume rendering (most recent / highest sort_order first).
 */
export async function listCareerData(
  db: D1Database,
  userId: string
): Promise<CompanyWithProjects[]> {
  const companiesResult = await db
    .prepare(
      `SELECT id, name, employment_type AS employmentType, employment_type_note AS employmentTypeNote,
              business_summary AS businessSummary, period_from AS periodFrom, period_to AS periodTo,
              is_current AS isCurrent, sort_order AS sortOrder
       FROM companies WHERE user_id = ?1 ORDER BY sort_order DESC`
    )
    .bind(userId)
    .all<Record<string, unknown>>();

  const projectsResult = await db
    .prepare(
      `SELECT id, company_id AS companyId, name, role, team_size AS teamSize,
              period_from AS periodFrom, period_to AS periodTo, is_current AS isCurrent,
              description, responsibilities, achievements, challenges, sort_order AS sortOrder
       FROM projects WHERE user_id = ?1 ORDER BY sort_order DESC`
    )
    .bind(userId)
    .all<Record<string, unknown>>();

  const skillsResult = await db
    .prepare(
      `SELECT ps.project_id AS projectId, s.id, s.category, s.name, s.years, s.level, s.note
       FROM project_skills ps
       JOIN skills s ON s.id = ps.skill_id
       JOIN projects p ON p.id = ps.project_id
       WHERE p.user_id = ?1`
    )
    .bind(userId)
    .all<Record<string, unknown>>();

  const skillsByProject = new Map<string, SkillRecord[]>();
  for (const row of skillsResult.results ?? []) {
    const projectId = String(row.projectId);
    const list = skillsByProject.get(projectId) ?? [];
    list.push({
      id: String(row.id),
      category: String(row.category),
      name: String(row.name),
      years: (row.years as string) ?? null,
      level: (row.level as string) ?? null,
      note: (row.note as string) ?? null,
    });
    skillsByProject.set(projectId, list);
  }

  const projectsByCompany = new Map<string | null, ProjectRecord[]>();
  const unassignedProjects: ProjectRecord[] = [];
  for (const row of projectsResult.results ?? []) {
    const project: ProjectRecord = {
      id: String(row.id),
      companyId: (row.companyId as string) ?? null,
      name: String(row.name),
      role: (row.role as string) ?? null,
      teamSize: (row.teamSize as string) ?? null,
      periodFrom: (row.periodFrom as string) ?? null,
      periodTo: (row.periodTo as string) ?? null,
      isCurrent: Boolean(row.isCurrent),
      description: (row.description as string) ?? null,
      responsibilities: (row.responsibilities as string) ?? null,
      achievements: (row.achievements as string) ?? null,
      challenges: (row.challenges as string) ?? null,
      sortOrder: Number(row.sortOrder),
      skills: skillsByProject.get(String(row.id)) ?? [],
    };

    if (project.companyId) {
      const list = projectsByCompany.get(project.companyId) ?? [];
      list.push(project);
      projectsByCompany.set(project.companyId, list);
    } else {
      unassignedProjects.push(project);
    }
  }

  const companies: CompanyWithProjects[] = (companiesResult.results ?? []).map((row) => ({
    id: String(row.id),
    name: (row.name as string) ?? null,
    employmentType: String(row.employmentType),
    employmentTypeNote: (row.employmentTypeNote as string) ?? null,
    businessSummary: (row.businessSummary as string) ?? null,
    periodFrom: (row.periodFrom as string) ?? null,
    periodTo: (row.periodTo as string) ?? null,
    isCurrent: Boolean(row.isCurrent),
    sortOrder: Number(row.sortOrder),
    projects: projectsByCompany.get(String(row.id)) ?? [],
  }));

  if (unassignedProjects.length > 0) {
    companies.push({
      id: 'unassigned',
      name: 'フリーランス案件 / その他',
      employmentType: 'その他',
      employmentTypeNote: null,
      businessSummary: null,
      periodFrom: null,
      periodTo: null,
      isCurrent: false,
      sortOrder: -1,
      projects: unassignedProjects,
    });
  }

  return companies;
}
