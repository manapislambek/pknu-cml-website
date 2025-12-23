// members-script.js — FULL DROP-IN for your Members page

import { createClient } from 'https://esm.sh/@sanity/client';

// ----- Sanity client -----
const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,            // if you don’t see updates immediately, temporarily set to false
  apiVersion: '2024-07-21',
});

// ----- Tiny DOM helpers -----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ----- Formatting helpers -----
function formatPeriod(period) {
  if (!period) return '';
  const toYear = (d) => (d ? new Date(d).getFullYear() : null);
  const start = toYear(period.startDate);
  const end = toYear(period.endDate);
  if (!start && !end) return '';
  return `${start ?? ''} – ${end ?? 'Present'}`;
}

function isAlumniDoc(m) {
  return Boolean(
    m?.isAlumni === true ||
    (typeof m?.role === 'string' && m.role.trim() === 'Alumni') ||
    m?.period?.endDate
  );
}

function roleBadge(role) {
  if (!role) return '';
  return `<span class="member-badge" aria-label="role">${role}</span>`;
}

function linkIcon(href, label, kind) {
  if (!href) return '';
  const icon = kind === 'scholar' ? '📚' : '↗';
  // show icon + readable label
  return `<a class="member-link" href="${href}" target="_blank" rel="noopener noreferrer">${icon} ${label}</a>`;
}

function thesisList(degreeHistory) {
  if (!Array.isArray(degreeHistory) || !degreeHistory.length) return '';
  const items = [];
  degreeHistory.forEach((deg) => {
    const head = [deg?.degree, deg?.institution, deg?.year].filter(Boolean).join(' • ');
    if (Array.isArray(deg?.theses) && deg.theses.length) {
      deg.theses.forEach((t) => {
        const url = t?.link;
        const tail = url ? ` <a class="thesis-link" href="${url}" target="_blank" rel="noopener">(Link)</a>` : '';
        items.push(
          `<li><strong>${t?.title ?? 'Thesis'}</strong>${head ? ` — <span class="thesis-meta">${head}</span>` : ''}${tail}</li>`
        );
      });
    } else if (head) {
      items.push(`<li><span class="thesis-meta">${head}</span></li>`);
    }
  });
  return items.length ? `<ul class="thesis-list">${items.join('')}</ul>` : '';
}

// ----- Card template -----
function memberCard(m) {
  const photoUrl = m?.photo?.asset?.url; // we project asset->url in GROQ
  const deptLine = m?.department ? `<div class="member-dept">${m.department}</div>` : '';
  const areaLine = m?.researchArea ? `<div class="member-area">${m.researchArea}</div>` : '';
  const dates = formatPeriod(m?.period);
  const dateLine = dates ? `<div class="member-period">${dates}</div>` : '';

  const scholar  = linkIcon(m?.profiles?.googleScholarUrl, 'Google Scholar', 'scholar');
  const personal = linkIcon(m?.profiles?.personalPageUrl, 'Website', 'link');
  const email    = m?.email ? `<a class="member-email" href="mailto:${m.email}">✉︎ Email</a>` : '';

  const theses = thesisList(m?.degreeHistory);
  const legacyThesis = m?.thesisTitle ? `<div class="legacy-thesis">Thesis: ${m.thesisTitle}</div>` : '';

  return `
    <article class="member-card">
      ${
        photoUrl
          ? `<div class="member-photo-wrap"><img src="${photoUrl}" alt="${m.name}" class="member-photo" loading="lazy"></div>`
          : `<div class="member-photo-wrap"></div>`
      }
      <div class="member-info">
        <h3 class="member-name">${m.name} ${roleBadge(m.role)}</h3>
        ${deptLine}
        ${areaLine}
        ${dateLine}
        <div class="member-links">${scholar}${personal}${email}</div>
        ${theses || legacyThesis}
      </div>
    </article>
  `;
}

function injectCards(container, list) {
  if (!container) return;
  if (!list || list.length === 0) {
    container.innerHTML = '<p class="empty-note">No members to display.</p>';
    return;
  }
  // your professor section has no .team-grid; student sections do
  const grid = container.querySelector?.('.team-grid') || container;
  grid.innerHTML = list.map(memberCard).join('');
}

// ----- Tabs -----
function setupTabs() {
  const buttons = $$('.tab-button');
  const tabs = $$('.tab-content');
  if (!buttons.length || !tabs.length) return;

  const showTab = (id) => {
    tabs.forEach((t) => t.classList.toggle('active', t.id === id));
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
  };

  buttons.forEach((btn) => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  // default / deep-link via hash
  const hash = window.location.hash?.replace('#', '') || 'professor';
  showTab(['professor', 'students', 'alumni'].includes(hash) ? hash : 'professor');

  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash?.replace('#', '') || 'professor';
    showTab(['professor', 'students', 'alumni'].includes(newHash) ? newHash : 'professor');
  });
}

// ----- Fetch + render -----
async function loadMembers() {
  const query = `*[_type == "teamMember"] | order(order asc, name asc){
    _id,
    name,
    role,
    email,
    photo{asset->{url}},
    department,
    researchArea,
    thesisTitle,
    isAlumni,
    profiles{googleScholarUrl, personalPageUrl},
    period{startDate, endDate},
    degreeHistory[]{
      degree, institution, year,
      theses[]{ title, link }
    }
  }`;

  let members = [];
  try {
    members = await client.fetch(query);
  } catch (e) {
    console.error('Sanity fetch error:', e);
    return;
  }

  const alumni   = members.filter(isAlumniDoc);
  const current  = members.filter((m) => !isAlumniDoc(m));

  const professors = current.filter((m) => /Professor/i.test(m.role));
  const postdocs   = current.filter((m) => m.role === 'Postdoctoral Researcher' || /Postdoc/i.test(m.role));
  const phd        = current.filter((m) => m.role === 'Ph.D. Student');
  const masters    = current.filter((m) => m.role === 'Master Student');
  const undergrads = current.filter((m) => m.role === 'Undergraduate Student');

  injectCards($('#professor-section'),        professors);
  injectCards($('#postdocs-section'),         postdocs);
  injectCards($('#phd-section'),              phd);
  injectCards($('#masters-section'),          masters);
  injectCards($('#undergraduate-section'),    undergrads);
  injectCards($('#alumni-section'),           alumni);

  // hide empty subsections in “Researchers”
  [$('#postdocs-section'), $('#phd-section'), $('#masters-section'), $('#undergraduate-section')].forEach((sec) => {
    const grid = sec?.querySelector('.team-grid');
    if (grid && grid.children.length === 0) sec.style.display = 'none';
  });
}

// ----- Init -----
function initMembersPage() {
  setupTabs();
  loadMembers();
}

document.addEventListener('DOMContentLoaded', initMembersPage);
