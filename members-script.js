// members-script.js — debug build (CDN off + console log)

import { createClient } from 'https://esm.sh/@sanity/client';

// --- Sanity client ---
// Keep useCdn:false while testing; switch back to true after you see updates on the site.
const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: false, // <— DEBUG: avoid cache
  apiVersion: '2024-07-21',
});

// --- Tiny DOM helpers ---
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// --- Formatting helpers ---
function formatPeriod(period) {
  if (!period) return '';
  const toYear = (d) => (d ? new Date(d).getFullYear() : null);
  const start = toYear(period.startDate);
  const end   = toYear(period.endDate);
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
  return role ? `<span class="member-badge" aria-label="role">${role}</span>` : '';
}

// pick first defined value
function pick(...vals) {
  for (const v of vals) if (v != null && v !== '') return v;
  return undefined;
}

function linkIcon(href, label, kind) {
  if (!href) return '';
  const icon = kind === 'scholar' ? '📚' : '↗';
  return `<a class="member-link" href="${href}" target="_blank" rel="noopener noreferrer">${icon} ${label}</a>`;
}

function thesisList(degreeHistory) {
  if (!Array.isArray(degreeHistory) || !degreeHistory.length) return '';
  const items = [];
  degreeHistory.forEach((deg) => {
    const head = [deg?.degree, deg?.institution, deg?.year].filter(Boolean).join(' • ');
    if (Array.isArray(deg?.theses) && deg.theses.length) {
      deg.theses.forEach((t) => {
        const tail = t?.link ? ` <a class="thesis-link" href="${t.link}" target="_blank" rel="noopener">(Link)</a>` : '';
        items.push(`<li><strong>${t?.title ?? 'Thesis'}</strong>${head ? ` — <span class="thesis-meta">${head}</span>` : ''}${tail}</li>`);
      });
    } else if (head) {
      items.push(`<li><span class="thesis-meta">${head}</span></li>`);
    }
  });
  return items.length ? `<ul class="thesis-list">${items.join('')}</ul>` : '';
}

// --- Card template ---
function memberCard(m) {
  const photoUrl = m?.photo?.asset?.url;
  const deptLine = m?.department  ? `<div class="member-dept">${m.department}</div>`   : '';
  const areaLine = m?.researchArea ? `<div class="member-area">${m.researchArea}</div>` : '';
  const dates    = formatPeriod(m?.period);
  const dateLine = dates ? `<div class="member-period">${dates}</div>` : '';

  // robust fallbacks in case field names differ
  const scholarUrl = pick(m?.profiles?.googleScholarUrl, m?.googleScholarUrl, m?.scholarUrl);
  const websiteUrl = pick(m?.profiles?.personalPageUrl, m?.personalPageUrl, m?.website, m?.websiteUrl);

  const scholar  = linkIcon(scholarUrl, 'Google Scholar', 'scholar');
  const personal = linkIcon(websiteUrl, 'Website', 'link');
  const email    = m?.email ? `<a class="member-email" href="mailto:${m.email}">✉︎ Email</a>` : '';

  const theses       = thesisList(m?.degreeHistory);
  const legacyThesis = m?.thesisTitle ? `<div class="legacy-thesis">Thesis: ${m.thesisTitle}</div>` : '';

  return `
    <article class="member-card">
      ${photoUrl ? `<div class="member-photo-wrap"><img src="${photoUrl}" alt="${m.name}" class="member-photo" loading="lazy"></div>` : `<div class="member-photo-wrap"></div>`}
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
  const grid = container.querySelector?.('.team-grid') || container; // professor has no .team-grid
  grid.innerHTML = list.map(memberCard).join('');
}

// --- Tabs ---
function setupTabs() {
  const buttons = $$('.tab-button');
  const tabs    = $$('.tab-content');
  if (!buttons.length || !tabs.length) return;

  const showTab = (id) => {
    tabs.forEach((t) => t.classList.toggle('active', t.id === id));
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
  };

  buttons.forEach((btn) => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  const hash = window.location.hash?.replace('#', '') || 'professor';
  showTab(['professor', 'students', 'alumni'].includes(hash) ? hash : 'professor');

  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash?.replace('#', '') || 'professor';
    showTab(['professor', 'students', 'alumni'].includes(newHash) ? newHash : 'professor');
  });
}

// --- Fetch + render ---
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

  // Debug log so you can verify fields in the browser console
  const sample = members.find(x => x?.profiles || x?.period || x?.degreeHistory) || members[0];
  console.log('Members sample (debug):', sample);

  const alumni  = members.filter(isAlumniDoc);
  const current = members.filter((m) => !isAlumniDoc(m));

  const professors = current.filter((m) => /Professor/i.test(m.role));
  const postdocs   = current.filter((m) => m.role === 'Postdoctoral Researcher' || /Postdoc/i.test(m.role));
  const phd        = current.filter((m) => m.role === 'Ph.D. Student');
  const masters    = current.filter((m) => m.role === 'Master Student');
  const undergrads = current.filter((m) => m.role === 'Undergraduate Student');

  injectCards($('#professor-section'),     professors);
  injectCards($('#postdocs-section'),      postdocs);
  injectCards($('#phd-section'),           phd);
  injectCards($('#masters-section'),       masters);
  injectCards($('#undergraduate-section'), undergrads);
  injectCards($('#alumni-section'),        alumni);

  // hide empty researcher subsections
  [$('#postdocs-section'), $('#phd-section'), $('#masters-section'), $('#undergraduate-section')].forEach((sec) => {
    const grid = sec?.querySelector('.team-grid');
    if (grid && grid.children.length === 0) sec.style.display = 'none';
  });
}

// --- Init ---
function initMembersPage() {
  setupTabs();
  loadMembers();
}

document.addEventListener('DOMContentLoaded', initMembersPage);
