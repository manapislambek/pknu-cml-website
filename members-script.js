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
  const photoUrl = m?.photo?.asset?.url;
  const deptLine = m?.department  ? `<div class="member-dept">${m.department}</div>`   : '';
  const areaLine = m?.researchArea ? `<div class="member-area">${m.researchArea}</div>` : '';
  const dates    = formatPeriod(m?.period);
  const dateLine = dates ? `<div class="member-period">${dates}</div>` : '';

  const scholarUrl = pick(m?.profiles?.googleScholarUrl, m?.googleScholarUrl, m?.scholarUrl);
  const websiteUrl = pick(m?.profiles?.personalPageUrl, m?.personalPageUrl, m?.website, m?.websiteUrl);

  const scholar  = scholarUrl ? `<a class="member-link" href="${scholarUrl}" target="_blank" rel="noopener">Google Scholar</a>` : '';
  const personal = websiteUrl ? `<a class="member-link" href="${websiteUrl}" target="_blank" rel="noopener">Website</a>` : '';
  const email    = m?.email ? `<a class="member-email" href="mailto:${m.email}">Email</a>` : '';

  const theses       = thesisList(m?.degreeHistory);
  const legacyThesis = m?.thesisTitle ? `<div class="legacy-thesis">Thesis: ${m.thesisTitle}</div>` : '';

  // details that will be collapsible
  const detailsHTML = [deptLine, areaLine, dateLine, theses || legacyThesis].filter(Boolean).join('');
  const hasDetails  = detailsHTML.length > 0;

  return `
    <article class="member-card">
      <div class="member-photo-wrap">
        ${photoUrl ? `<img src="${photoUrl}" alt="${m.name}" class="member-photo" loading="lazy">` : ''}
      </div>

      <div class="member-info">
        <h3 class="member-name">${m.name} ${roleBadge(m.role)}</h3>
        <div class="member-links">${[scholar, personal, email].filter(Boolean).join('')}</div>

        ${hasDetails ? `
          <div class="member-details-content">
            ${detailsHTML}
          </div>
          <button type="button" class="expand-btn" aria-expanded="false">Show more</button>
        ` : ''}
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


// Expand/Collapse handling (event delegation)
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
