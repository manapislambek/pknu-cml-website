// members-script.js — FULL DROP-IN for updated schema (v15)
import { createClient } from 'https://esm.sh/@sanity/client';
import { toHTML } from 'https://esm.sh/@portabletext/to-html';

// --- Sanity client ---
const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: false,           // keep false while testing; switch to true after you confirm updates
  apiVersion: '2024-07-21',
});

console.log('Members script v15 loaded');

// --- DOM helpers ---
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// --- Helpers ---
const year = (d) => (d ? String(new Date(d).getFullYear()) : '');

function formatPeriod(m) {
  if (m.memberType === 'Student') {
    const s = year(m?.period?.startDate);
    return s ? `${s} – Present` : '';
  }
  if (m.memberType === 'Alumni') {
    const s = year(m?.period?.startDate);
    const e = year(m?.period?.endDate);
    if (!s && !e) return '';
    return `${s || ''} – ${e || ''}`;
  }
  return ''; // Professors: none
}

function safe(x) {
  return (x ?? '').toString().trim();
}

function linkIf(href, label) {
  if (!href) return '';
  return `<a class="member-link" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

// --- Card template ---
function memberCard(m) {
  const photoUrl = m?.photo?.asset?.url || '';
  const periodLine = formatPeriod(m);

  const scholarLink = linkIf(m?.profiles?.googleScholarUrl, 'Google Scholar');
  const emailLink   = m?.email ? `<a class="member-link" href="mailto:${m.email}">Email</a>` : '';

  // Title line: role only for professors
  const titleLine = `
    <h3 class="member-name">
      ${safe(m.name)}
      ${m.memberType === 'Professor' && safe(m.role) ? `<span class="member-badge">${safe(m.role)}</span>` : ''}
    </h3>
  `;

  let middle = '';

  if (m.memberType === 'Professor') {
    if (Array.isArray(m.details) && m.details.length) {
      middle += `<div class="member-details portable-text-content">${toHTML(m.details)}</div>`;
    }
  }

  if (m.memberType === 'Student') {
    if (safe(m.department))      middle += `<div class="member-dept">${safe(m.department)}</div>`;
    if (safe(m.researchArea))    middle += `<div class="member-area">${safe(m.researchArea)}</div>`;
    if (safe(m.currentDegree))   middle += `<div class="member-degree">Current degree: ${safe(m.currentDegree)}</div>`;
    if (safe(m.mastersThesisTitle)) middle += `<div class="member-thesis"><strong>Master’s thesis:</strong> ${safe(m.mastersThesisTitle)}</div>`;
    if (safe(m.phdThesisTitle))     middle += `<div class="member-thesis"><strong>PhD thesis:</strong> ${safe(m.phdThesisTitle)}</div>`;
  }

  if (m.memberType === 'Alumni') {
    if (safe(m.obtainedDegree))      middle += `<div class="member-degree">Degree obtained in lab: ${safe(m.obtainedDegree)}</div>`;
    if (safe(m.currentOccupation))   middle += `<div class="member-occupation">${safe(m.currentOccupation)}</div>`;
    if (safe(m.alumniMastersThesisTitle)) middle += `<div class="member-thesis"><strong>Master’s thesis:</strong> ${safe(m.alumniMastersThesisTitle)}</div>`;
    if (safe(m.alumniPhdThesisTitle))     middle += `<div class="member-thesis"><strong>PhD thesis:</strong> ${safe(m.alumniPhdThesisTitle)}</div>`;
  }

  const periodBlock = periodLine ? `<div class="member-period">${periodLine}</div>` : '';
  const linksRow = (scholarLink || emailLink) ? `<div class="member-links">${scholarLink}${emailLink}</div>` : '';

  return `
    <article class="member-card">
      ${photoUrl ? `<div class="member-photo-wrap"><img src="${photoUrl}" alt="${safe(m.name)}" class="member-photo" loading="lazy"></div>` : `<div class="member-photo-wrap"></div>`}
      <div class="member-info">
        ${titleLine}
        ${periodBlock}
        ${middle}
        ${linksRow}
      </div>
    </article>
  `;
}

function injectCards(sectionEl, list) {
  if (!sectionEl) return;
  const grid = sectionEl.querySelector?.('.team-grid') || sectionEl;
  grid.innerHTML = (list && list.length) ? list.map(memberCard).join('') : '<p class="empty-note">No members to display.</p>';
}

// --- Tabs ---
function setupTabs() {
  const buttons = $$('.tab-button');
  const tabs = $$('.tab-content');
  if (!buttons.length || !tabs.length) return;

  const showTab = (id) => {
    tabs.forEach((t) => t.classList.toggle('active', t.id === id));
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
  };

  buttons.forEach((btn) => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  const hash = (window.location.hash || '#professor').replace('#', '');
  showTab(['professor', 'students', 'alumni'].includes(hash) ? hash : 'professor');

  window.addEventListener('hashchange', () => {
    const hh = (window.location.hash || '#professor').replace('#', '');
    showTab(['professor', 'students', 'alumni'].includes(hh) ? hh : 'professor');
  });
}

// --- Fetch + render ---
async function loadMembers() {
  const query = `*[_type == "teamMember"] | order(order asc, name asc){
    _id,
    name,
    memberType,
    role,
    email,
    photo{asset->{url}},
    profiles{ googleScholarUrl },
    period{ startDate, endDate },
    // student
    department,
    researchArea,
    currentDegree,
    mastersThesisTitle,
    phdThesisTitle,
    // professor
    details,
    // alumni
    obtainedDegree,
    currentOccupation,
    alumniMastersThesisTitle,
    alumniPhdThesisTitle
  }`;

  let members = [];
  try {
    members = await client.fetch(query);
  } catch (e) {
    console.error('Sanity fetch error:', e);
    return;
  }

  // Buckets by memberType
  const professors = members.filter((m) => m.memberType === 'Professor');
  const students   = members.filter((m) => m.memberType === 'Student');
  const alumni     = members.filter((m) => m.memberType === 'Alumni');

  // Split students by currentDegree keywords to match your sections
  const postdocs   = students.filter((m) => /postdoc/i.test(m.currentDegree || ''));
  const phd        = students.filter((m) => /ph\.?d|doctoral/i.test(m.currentDegree || ''));
  const masters    = students.filter((m) => /master/i.test(m.currentDegree || ''));
  const undergrads = students.filter((m) => /undergrad|b\.?s|bachelor/i.test(m.currentDegree || ''));

  injectCards($('#professor-section'), professors);
  injectCards($('#postdocs-section'), postdocs);
  injectCards($('#phd-section'),      phd);
  injectCards($('#masters-section'),  masters);
  injectCards($('#undergraduate-section'), undergrads);
  injectCards($('#alumni-section'),   alumni);

  // Hide empty student subsections
  [$('#postdocs-section'), $('#phd-section'), $('#masters-section'), $('#undergraduate-section')].forEach((sec) => {
    const grid = sec?.querySelector('.team-grid');
    if (sec && grid && grid.children.length === 0) sec.style.display = 'none';
  });
}

// --- Init ---
function initMembersPage() {
  setupTabs();
  loadMembers();
}

document.addEventListener('DOMContentLoaded', initMembersPage);
