// members-script.js — v17 (period under name, Month YYYY formatting)
import { createClient } from 'https://esm.sh/@sanity/client';
import { toHTML } from 'https://esm.sh/@portabletext/to-html';

// --- Sanity client ---
const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: false,            // keep false while testing; flip to true later
  apiVersion: '2024-07-21',
});

console.log('Members script v17 loaded');

// --- DOM helpers ---
const $ = (sel) => document.querySelector(sel);

// --- Date helpers ---
function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  // English month names, e.g., January 2024
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function formatPeriod(member) {
  if (!member) return '';
  if (member.memberType === 'Student') {
    const s = formatMonthYear(member?.period?.startDate);
    return s ? `${s} – Current` : '';
  }
  if (member.memberType === 'Alumni') {
    const s = formatMonthYear(member?.period?.startDate);
    const e = formatMonthYear(member?.period?.endDate);
    if (!s && !e) return '';
    return `${s || ''} – ${e || ''}`;
  }
  // Professors: no period
  return '';
}

function roleBadgeIfProfessor(member) {
  if (member?.memberType === 'Professor' && member?.role) {
    return `<span class="member-badge" aria-label="role">${member.role}</span>`;
  }
  return '';
}

function scholarLink(url) {
  if (!url) return '';
  return `<a class="member-link" href="${url}" target="_blank" rel="noopener">Google Scholar</a>`;
}

function emailLink(email) {
  if (!email) return '';
  return `<a class="member-email" href="mailto:${email}">Email</a>`;
}

// Build the expandable details (no period here anymore)
function buildDetailsHTML(m) {
  if (m.memberType === 'Professor') {
    const detailsHtml = Array.isArray(m.details) ? toHTML(m.details) : '';
    return detailsHtml
      ? `<div class="member-details-content portable-text-content">${detailsHtml}</div>`
      : '';
  }

  if (m.memberType === 'Student') {
    const deptLine   = m?.department   ? `<div class="member-dept"><strong>Department:</strong> ${m.department}</div>` : '';
    const areaLine   = m?.researchArea ? `<div class="member-area"><strong>Research Area:</strong> ${m.researchArea}</div>` : '';
    const degreeLine = m?.currentDegree ? `<div class="member-area"><strong>Pursuing Degree:</strong> ${m.currentDegree}</div>` : '';
    const mastersThesis = m?.mastersThesisTitle ? `<p><strong>Master’s Thesis:</strong> ${m.mastersThesisTitle}</p>` : '';
    const phdThesis     = m?.phdThesisTitle     ? `<p><strong>Ph.D. Thesis:</strong> ${m.phdThesisTitle}</p>` : '';

    const body = [deptLine, areaLine, degreeLine, mastersThesis, phdThesis]
      .filter(Boolean)
      .join('');

    return body ? `<div class="member-details-content">${body}</div>` : '';
  }

  if (m.memberType === 'Alumni') {
    const obtained   = m?.obtainedDegree ? `<div class="member-area"><strong>Obtained Degree:</strong> ${m.obtainedDegree}</div>` : '';
    const occupation = m?.currentOccupation ? `<div class="member-area"><strong>Current Occupation:</strong> ${m.currentOccupation}</div>` : '';
    const mastersThesis = m?.alumniMastersThesisTitle ? `<p><strong>Master’s Thesis:</strong> ${m.alumniMastersThesisTitle}</p>` : '';
    const phdThesis     = m?.alumniPhdThesisTitle     ? `<p><strong>Ph.D. Thesis:</strong> ${m.alumniPhdThesisTitle}</p>` : '';

    const body = [obtained, occupation, mastersThesis, phdThesis]
      .filter(Boolean)
      .join('');

    return body ? `<div class="member-details-content">${body}</div>` : '';
  }

  return '';
}

// --- Card template ---
function memberCard(m) {
  const photoUrl = m?.photo?.asset?.url;
  const headerPeriod = formatPeriod(m); // show this under the name (students & alumni only)
  const linksRow = [scholarLink(m?.profiles?.googleScholarUrl), emailLink(m?.email)]
    .filter(Boolean)
    .join('');

  const detailsHTML = buildDetailsHTML(m);
  const hasDetails  = detailsHTML.length > 0;

  return `
    <article class="member-card">
      <div class="member-photo-wrap">
        ${photoUrl ? `<img src="${photoUrl}" alt="${m.name}" class="member-photo" loading="lazy">` : ''}
      </div>

      <div class="member-info">
        <h3 class="member-name">${m.name} ${roleBadgeIfProfessor(m)}</h3>
        ${headerPeriod ? `<div class="member-period">${headerPeriod}</div>` : ''}
        ${linksRow ? `<div class="member-links">${linksRow}</div>` : ''}

        ${hasDetails ? `
          ${detailsHTML}
          <button type="button" class="expand-btn" aria-expanded="false">Show more</button>
        ` : ''}
      </div>
    </article>
  `;
}

function injectCards(sectionEl, list) {
  if (!sectionEl) return;
  const grid = sectionEl.querySelector?.('.team-grid') || sectionEl;
  grid.innerHTML = (list && list.length)
    ? list.map(memberCard).join('')
    : '<p class="empty-note">No members to display.</p>';
}

// --- Tabs ---
function setupTabs() {
  const buttons = Array.from(document.querySelectorAll('.tab-button'));
  const tabs = Array.from(document.querySelectorAll('.tab-content'));
  if (!buttons.length || !tabs.length) return;

  const showTab = (id) => {
    tabs.forEach((t) => t.classList.toggle('active', t.id === id));
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
  };

  buttons.forEach((btn) => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  const initial = (window.location.hash || '#professor').replace('#', '');
  showTab(['professor', 'students', 'alumni'].includes(initial) ? initial : 'professor');

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
    department,
    researchArea,
    currentDegree,
    mastersThesisTitle,
    phdThesisTitle,
    details,
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

  const professors = members.filter((m) => m.memberType === 'Professor');
  const students   = members.filter((m) => m.memberType === 'Student');
  const alumni     = members.filter((m) => m.memberType === 'Alumni');

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

  // hide empty student subsections
  [$('#postdocs-section'), $('#phd-section'), $('#masters-section'), $('#undergraduate-section')].forEach((sec) => {
    const grid = sec?.querySelector('.team-grid');
    if (sec && grid && grid.children.length === 0) sec.style.display = 'none';
  });
}

// Expand/Collapse (event delegation)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.expand-btn');
  if (!btn) return;
  const card = btn.closest('.member-card');
  if (!card) return;
  const expanded = card.classList.toggle('expanded');
  btn.textContent = expanded ? 'Show less' : 'Show more';
  btn.setAttribute('aria-expanded', String(expanded));
});

// --- Init ---
function initMembersPage() {
  setupTabs();
  loadMembers();
}

document.addEventListener('DOMContentLoaded', initMembersPage);
