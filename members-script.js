// members-script.js — v17 (modal for Students + safe fallbacks)
import { createClient } from 'https://esm.sh/@sanity/client';

const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-07-21',
});

console.log('Members script v17 loaded');

// ---------- tiny DOM helpers ----------
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ---------- date helpers ----------
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtMonthYear = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d)) return '';
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};
function formatMemberPeriod(m) {
  const s = m?.period?.startDate ? fmtMonthYear(m.period.startDate) : '';
  const e = m?.period?.endDate ? fmtMonthYear(m.period.endDate) : (m.memberType === 'Student' ? 'Current' : '');
  if (m.memberType === 'Professor') return '';
  if (!s && !e) return '';
  return `${s}${s || e ? ' – ' : ''}${e || (m.memberType === 'Student' ? 'Current' : '')}`;
}

// ---------- link helpers ----------
const link = (href, text, cls = 'member-link') =>
  href ? `<a class="${cls}" href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>` : '';
const mailto = (email) =>
  email ? `<a class="member-email" href="mailto:${email}">Email</a>` : '';

// ---------- details builders ----------
function studentDetails(m) {
  const rows = [];
  if (m?.department)         rows.push(`<div class="member-dept"><span class="label">Department:</span><span class="value">${m.department}</span></div>`);
  if (m?.researchArea)       rows.push(`<div class="member-area"><span class="label">Research Area:</span><span class="value">${m.researchArea}</span></div>`);
  if (m?.currentDegree)      rows.push(`<div class="member-area"><span class="label">Pursuing Degree:</span><span class="value">${m.currentDegree}</span></div>`);
  if (m?.mastersThesisTitle) rows.push(`<p class="member-thesis"><span class="label">Master’s Thesis:</span><span class="value">${m.mastersThesisTitle}</span></p>`);
  if (m?.phdThesisTitle)     rows.push(`<p class="member-thesis"><span class="label">Ph.D. Thesis:</span><span class="value">${m.phdThesisTitle}</span></p>`);
  return rows.join('');
}
function alumniDetails(m) {
  const rows = [];
  if (m?.obtainedDegree)         rows.push(`<div class="member-obtained"><span class="label">Obtained Degree:</span><span class="value">${m.obtainedDegree}</span></div>`);
  if (m?.currentOccupation)      rows.push(`<div class="member-occupation"><span class="label">Current Occupation:</span><span class="value">${m.currentOccupation}</span></div>`);
  if (m?.alumniMastersThesisTitle) rows.push(`<p class="member-thesis"><span class="label">Master’s Thesis:</span><span class="value">${m.alumniMastersThesisTitle}</span></p>`);
  if (m?.alumniPhdThesisTitle)     rows.push(`<p class="member-thesis"><span class="label">Ph.D. Thesis:</span><span class="value">${m.alumniPhdThesisTitle}</span></p>`);
  return rows.join('');
}

// ---------- card template ----------
function memberCard(m) {
  const photoUrl = m?.photo?.asset?.url || '';
  const period   = formatMemberPeriod(m);
  const periodLine = period ? `<div class="member-period">${period}</div>` : '';

  const links = [
    m?.profiles?.googleScholarUrl ? link(m.profiles.googleScholarUrl, 'Google Scholar') : '',
    mailto(m.email),
  ].filter(Boolean).join('');

  // decide details presence (Students shown in modal, others inline)
  let detailsBlock = '';
  let showMoreBtn  = '';
  if (m.memberType === 'Student') {
    // modal will render details; button carries dataset attributes
    const hasAny = (m.department || m.researchArea || m.currentDegree || m.mastersThesisTitle || m.phdThesisTitle);
    if (hasAny) showMoreBtn = `<button type="button" class="expand-btn" data-member-id="${m._id}" data-member-type="Student" aria-expanded="false">Show more</button>`;
  } else if (m.memberType === 'Alumni') {
    const body = alumniDetails(m);
    if (body) {
      detailsBlock = `<div class="member-details-content">${body}</div>`;
      showMoreBtn  = `<button type="button" class="expand-btn" data-member-type="Other" aria-expanded="false">Show more</button>`;
    }
  } // Professors currently no extra content

  return `
    <article class="member-card">
      <div class="member-photo-wrap">
        ${photoUrl ? `<img src="${photoUrl}" alt="${m.name}" class="member-photo" loading="lazy">` : ''}
      </div>
      <div class="member-info">
        <h3 class="member-name">${m.name}</h3>
        ${periodLine}
        <div class="member-links">${links}</div>
        ${detailsBlock}
        ${showMoreBtn}
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

// ---------- tabs ----------
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

// ---------- modal helpers (self-contained) ----------
function ensureModalRoot() {
  let root = $('#member-modal-root');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'member-modal-root';
  root.innerHTML = `
    <div class="modal" id="member-modal">
      <div class="modal-overlay" data-close="1"></div>
      <div class="modal-content member-modal">
        <button class="modal-close" type="button" aria-label="Close" data-close="1">&times;</button>
        <h2 id="modal-title" class="modal-title"></h2>
        <div id="modal-body"></div>
      </div>
    </div>`;
  document.body.appendChild(root);
  root.addEventListener('click', (e) => {
    if (e.target.dataset.close) closeModal();
  });
  return root;
}
function openModal(title, html) {
  ensureModalRoot();
  $('#modal-title').textContent = title || '';
  $('#modal-body').innerHTML = html || '';
  $('#member-modal').classList.add('is-active');
}
function closeModal() {
  $('#member-modal')?.classList.remove('is-active');
}

// helper for rows inside modal
function modalRow(label, value, cls='') {
  if (!value) return '';
  return `<div class="row ${cls}"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function openStudentModal(memberId) {
  const m = window.__TEAM_BY_ID__?.[memberId];
  if (!m) return;
  const photo = m?.photo?.asset?.url
    ? `<img class="modal-photo" src="${m.photo.asset.url}" alt="${m.name}">`
    : `<div class="modal-photo"></div>`;

  const header = `
    <div class="member-modal">
      <div class="modal-identity">
        ${photo}
        <div>
          <div class="modal-name">${m.name}</div>
          <div class="modal-period">${formatMemberPeriod(m) || ''}</div>
          <div class="modal-links">
            ${m.email ? `<a href="mailto:${m.email}">Email</a>` : ''}
            ${m?.profiles?.googleScholarUrl ? (m.email ? ' · ' : '') + `<a href="${m.profiles.googleScholarUrl}" target="_blank" rel="noopener">Google Scholar</a>` : ''}
          </div>
        </div>
      </div>
      <div class="modal-divider"></div>
    </div>`;

  const body = [
    modalRow('Department:', m.department, 'member-dept'),
    modalRow('Research Area:', m.researchArea, 'member-area'),
    modalRow('Pursuing Degree:', m.currentDegree, 'member-area'),
    modalRow('Master’s Thesis:', m.mastersThesisTitle, 'member-thesis'),
    modalRow('Ph.D. Thesis:', m.phdThesisTitle, 'member-thesis'),
  ].filter(Boolean).join('');

  const details = `<div class="member-modal"><div class="modal-details">${body || '<em>No additional details.</em>'}</div></div>`;
  openModal(m.name, header + details);
}

// ---------- fetch & render ----------
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
  } catch (err) {
    console.error('Sanity fetch error:', err);
    return;
  }

  // make a quick map for modal lookup
  window.__TEAM_BY_ID__ = Object.fromEntries(members.map(m => [m._id, m]));

  const professors = members.filter(m => m.memberType === 'Professor');
  const students   = members.filter(m => m.memberType === 'Student');
  const alumni     = members.filter(m => m.memberType === 'Alumni');

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

  // hide empty buckets
  [$('#postdocs-section'), $('#phd-section'), $('#masters-section'), $('#undergraduate-section')].forEach(sec => {
    const grid = sec?.querySelector('.team-grid');
    if (sec && grid && grid.children.length === 0) sec.style.display = 'none';
  });
}

// ---------- click delegation ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.expand-btn');
  if (!btn) return;

  const type = btn.dataset.memberType;
  if (type === 'Student') {
    const id = btn.dataset.memberId;
    if (id) openStudentModal(id);
    return;
  }

  // fallback: inline expand for alumni/others
  const card = btn.closest('.member-card');
  if (!card) return;
  const expanded = card.classList.toggle('expanded');
  btn.textContent = expanded ? 'Show less' : 'Show more';
  btn.setAttribute('aria-expanded', String(expanded));
});

// ---------- boot ----------
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadMembers();
});
