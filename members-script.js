// members-script.js — stable build for Members page (no badges)
import { createClient } from 'https://esm.sh/@sanity/client';

// --- Sanity client ---
const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: false,               // set to true after you confirm
  apiVersion: '2024-07-21',
});

console.log('Members script v16.2 loaded (no role badge)');

// ---------- DOM helpers ----------
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ---------- Format helpers ----------
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtMonthYear = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

function formatMemberPeriod(m) {
  const s = m?.period?.startDate ? fmtMonthYear(m.period.startDate) : '';
  const e = m?.period?.endDate ? fmtMonthYear(m.period.endDate)
    : (m.memberType === 'Student' ? 'Current' : (m.memberType === 'Alumni' ? '' : ''));
  if (!s && !e) return '';
  if (m.memberType === 'Professor') return ''; // no period for professors
  return `${s}${s || e ? ' – ' : ''}${e || (m.memberType === 'Student' ? 'Current' : '')}`;
}

const link = (href, text, cls = 'member-link') =>
  href ? `<a class="${cls}" href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>` : '';

const mailto = (email) =>
  email ? `<a class="member-email" href="mailto:${email}">Email</a>` : '';

// ---------- Details blocks ----------
function studentDetails(m) {
  const dept   = m?.department
    ? `<div class="member-dept"><span class="label">Department:</span><span class="value">${m.department}</span></div>` : '';
  const area   = m?.researchArea
    ? `<div class="member-area"><span class="label">Research Area:</span><span class="value">${m.researchArea}</span></div>` : '';
  const degree = m?.currentDegree
    ? `<div class="member-area"><span class="label">Pursuing Degree:</span><span class="value">${m.currentDegree}</span></div>` : '';
  const mthesis = m?.mastersThesisTitle
    ? `<p class="member-thesis"><span class="label">Master’s Thesis:</span><span class="value">${m.mastersThesisTitle}</span></p>` : '';
  const phdthesis = m?.phdThesisTitle
    ? `<p class="member-thesis"><span class="label">Ph.D. Thesis:</span><span class="value">${m.phdThesisTitle}</span></p>` : '';

  const body = [dept, area, degree, mthesis, phdthesis].filter(Boolean).join('');
  return body ? `<div class="member-details-content">${body}</div>` : '';
}

function alumniDetails(m) {
  const obtained = m?.obtainedDegree
    ? `<div class="member-obtained"><span class="label">Obtained Degree:</span><span class="value">${m.obtainedDegree}</span></div>` : '';
  const occupation = m?.currentOccupation
    ? `<div class="member-occupation"><span class="label">Current Occupation:</span><span class="value">${m.currentOccupation}</span></div>` : '';
  const mthesis = m?.alumniMastersThesisTitle
    ? `<p class="member-thesis"><span class="label">Master’s Thesis:</span><span class="value">${m.alumniMastersThesisTitle}</span></p>` : '';
  const phdthesis = m?.alumniPhdThesisTitle
    ? `<p class="member-thesis"><span class="label">Ph.D. Thesis:</span><span class="value">${m.alumniPhdThesisTitle}</span></p>` : '';

  const body = [obtained, occupation, mthesis, phdthesis].filter(Boolean).join('');
  return body ? `<div class="member-details-content">${body}</div>` : '';
}

// ---------- Card ----------
function memberCard(m) {
  const photoUrl   = m?.photo?.asset?.url || '';
  const period     = formatMemberPeriod(m);
  const periodLine = period ? `<div class="member-period">${period}</div>` : '';
  const scholarUrl = m?.profiles?.googleScholarUrl;

  // details by type
  let detailsHTML = '';
  if (m.memberType === 'Student') detailsHTML = studentDetails(m);
  else if (m.memberType === 'Alumni') detailsHTML = alumniDetails(m);

  const links = [
    link(scholarUrl, 'Google Scholar'),
    mailto(m.email),
  ].filter(Boolean).join('');

  const hasDetails = Boolean(detailsHTML);

  return `
    <article class="member-card">
      <div class="member-photo-wrap">
        ${photoUrl ? `<img src="${photoUrl}" alt="${m.name}" class="member-photo" loading="lazy">` : ''}
      </div>
      <div class="member-info">
        <h3 class="member-name">${m.name}</h3>
        ${periodLine}
        <div class="member-links">${links}</div>
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
  const grid = sectionEl.querySelector('.team-grid') || sectionEl;
  grid.innerHTML = (list && list.length)
    ? list.map(memberCard).join('')
    : '<p class="empty-note">No members to display.</p>';
}

// ---------- Tabs ----------
function setupTabs() {
  const buttons = $$('.tab-button');
  const tabs = $$('.tab-content');
  if (!buttons.length || !tabs.length) return;

  const show = (id) => {
    tabs.forEach(t => t.classList.toggle('active', t.id === id));
    buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  };

  buttons.forEach(btn => btn.addEventListener('click', () => show(btn.dataset.tab)));

  const initial = (window.location.hash || '#professor').slice(1);
  show(['professor','students','alumni'].includes(initial) ? initial : 'professor');

  window.addEventListener('hashchange', () => {
    const h = (window.location.hash || '#professor').slice(1);
    show(['professor','students','alumni'].includes(h) ? h : 'professor');
  });
}

// ---------- Fetch & render ----------
async function loadMembers() {
  const query = `*[_type == "teamMember"] | order(order asc, name asc){
    _id,
    name,
    memberType,
    role, // still fetched but unused
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
  } catch (err) {
    console.error('Sanity fetch error:', err);
    return;
  }

  const professors = members.filter(m => m.memberType === 'Professor');
  const students   = members.filter(m => m.memberType === 'Student');
  const alumni     = members.filter(m => m.memberType === 'Alumni');

  // Student buckets (by free-text currentDegree)
  const postdocs   = students.filter(m => /postdoc/i.test(m.currentDegree || ''));
  const phd        = students.filter(m => /ph\.?d|doctoral/i.test(m.currentDegree || ''));
  const masters    = students.filter(m => /master/i.test(m.currentDegree || ''));
  const undergrads = students.filter(m => /undergrad|b\.?s|bachelor/i.test(m.currentDegree || ''));

  injectCards($('#professor-section'), professors);
  injectCards($('#postdocs-section'), postdocs);
  injectCards($('#phd-section'), phd);
  injectCards($('#masters-section'), masters);
  injectCards($('#undergraduate-section'), undergrads);
  injectCards($('#alumni-section'), alumni);

  // Hide empty student subsections
  [$('#postdocs-section'), $('#phd-section'), $('#masters-section'), $('#undergraduate-section')].forEach(sec => {
    const grid = sec?.querySelector('.team-grid');
    if (sec && grid && grid.children.length === 0) sec.style.display = 'none';
  });
}

// ---------- Expand/Collapse ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.expand-btn');
  if (!btn) return;
  const card = btn.closest('.member-card');
  if (!card) return;
  const expanded = card.classList.toggle('expanded');
  btn.textContent = expanded ? 'Show less' : 'Show more';
  btn.setAttribute('aria-expanded', String(expanded));
});

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadMembers();
});
