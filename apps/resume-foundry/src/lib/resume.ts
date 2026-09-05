// Builds a self-contained resume HTML document from stored career data.
// Used both by the preview page (SSR) and by the export API (downloadable file).

import type { CareerUser, CompanyWithProjects } from './db';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function collectAllSkillNames(companies: CompanyWithProjects[]): string[] {
  const names = new Set<string>();
  for (const company of companies) {
    for (const project of company.projects) {
      for (const skill of project.skills) {
        names.add(skill.name);
      }
    }
  }
  return Array.from(names);
}

export function renderResumeHtml(user: CareerUser, companies: CompanyWithProjects[]): string {
  const skillNames = collectAllSkillNames(companies);

  const companiesHtml = companies
    .map((company) => {
      const projectsHtml = company.projects
        .map((project) => {
          const period = [project.periodFrom, project.periodTo]
            .filter(Boolean)
            .join(' 〜 ');
          return `
        <h3>${escapeHtml(project.name)}</h3>
        ${period ? `<p class="period">${escapeHtml(period)}</p>` : ''}
        ${project.role ? `<p>担当: ${escapeHtml(project.role)}</p>` : ''}
        ${project.achievements ? `<p>${escapeHtml(project.achievements)}</p>` : ''}
        ${
          project.skills.length > 0
            ? `<p class="skills">使用技術: ${project.skills.map((s) => escapeHtml(s.name)).join(' / ')}</p>`
            : ''
        }`;
        })
        .join('\n');

      return `
      <section class="company">
        <h2>${escapeHtml(company.name ?? '会社名未登録')}</h2>
        ${projectsHtml}
      </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>職務経歴書 - ${escapeHtml(user.displayName ?? user.email)}</title>
  </head>
  <body>
    <article class="preview-paper">
      <h1>職務経歴書</h1>
      <p>氏名: ${escapeHtml(user.displayName ?? user.email)}</p>
      ${companiesHtml || '<p>登録された職歴データがありません。</p>'}
      ${
        skillNames.length > 0
          ? `<h2>スキル</h2><p>${skillNames.map(escapeHtml).join(' / ')}</p>`
          : ''
      }
    </article>
  </body>
</html>`;
}
