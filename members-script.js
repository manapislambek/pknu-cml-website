// members-script.js — v18: Student cards open a modal (details + pubs/presentations)
import { createClient } from 'https://esm.sh/@sanity/client';
import { toHTML } from 'https://esm.sh/@portabletext/to-html';

const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-07-21',
});

console.log('Members script v18 loaded');

// ---------- tiny DOM helpers ----------
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ---------- date helpers ----------
const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const mY = (iso) => {
  if (!iso) return '';
  const d = new Date(iso); return `${M[d.getMonth()]} ${d.getFullYear()}`;
};
function periodLine(m) {
  if (m.memberType === 'Professor') return '';
  const s = m?.period?.startDate ? mY(m.period.startDate) : '';
  const e = m?.period?.endDate ? mY(m.period.endDate) : (m.memberType === 'Student' ? 'Current' : '');
  if (!s && !e) return '';
  return `<div class="member-period">${s}${s||e?' – ':''}${e}</div>`;
}

// ---------- detail builders ----------
function studentInlineDetails(m){ // not used in modal mode anymore, kept for fallback
  const rows = [];
  if (m?.department) rows.push(row('Department:', m.department, 'member-dept'));
  if (m?.researchArea) rows.push(row('Research Area:', m.researchArea, 'member-area'));
  if (m?.currentDegree) rows.push(row('Pursuing Degree:', m.currentDegree, 'member-area'));
  if (m?.mastersThesisTitle) rows.push(row('Master’s Thesis:', m.mastersThesisTitle, 'member-thesis'));
  if (m?.phdThesisTitle) rows.push(row('Ph.D. Thesis:', m.phdThesisTitle, 'member-thesis'));
  return rows.length ? `<div class="member-details-content">${rows.join('')}</div>` : '';
}
function alumniDetails(m){
  const rows = [];
  if (m?.obtainedDegree) rows.push(row('Obtained Degree:', m.obtainedDegree, 'member-obtained'));
  if (m?.currentOccupation) rows.push(row('Current Occupation:', m.currentOccupation, 'member-occupation'));
  if (m?.alumniMastersThesisTitle) rows.push(row('Master’s Thesis:', m.alumniMastersThesisTitle, 'member-thesis'));
  if (m?.alumniPhdThesisTitle) rows.push(row('Ph.D. Thesis:', m.alumniPhdThesisTitle, 'member-thesis'));
  return rows.length ? `<div class="member-details-content">${rows.join('')}</div>` : '';
}
function professorDetails(m){
  if (!m?.details) return '';
  return `<div class="member-details-content portable-text-content">${toHTML(m.details)}</div>`;
}
function row(label, value, cls){
  return `<div class="${cls}"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}
const a = (href, text) => href ? `<a class="member-link" href="${href}" target="_blank" rel="noopener">${text}</a>` : '';
const mail = (email) => email ? `<a class="member-email" href="mailto:${email}">Email</a>` : '';

// ---------- Card ----------
function memberCard(m){
  const photo = m?.photo?.asset?.url || '';
  const links = [ a(m?.profiles?.googleScholarUrl, 'Google Scholar'), mail(m.email) ].filter(Boolean).join('');

  // Students: NO inline details → open modal
  let detailsHTML = '';
  let expandBtn = '';
  if (m.memberType === 'Student'){
    expandBtn = `<button type="button" class="expand-btn" data-open-modal="${m._id}">Show more</button>`;
  } else if (m.memberType === 'Alumni') {
    detailsHTML = alumniDetails(m);
    expandBtn = detailsHTML ? `<button type="button" class="expand-btn" aria-expanded="false">Show more</button>` : '';
  } else if (m.memberType === 'Professor') {
    detailsHTML = professorDetails(m);
    expandBtn = detailsHTML ? `<button type="button" class="expand-btn" aria-expanded="false">Show more</button>` : '';
  }

  return `
    <article class="member-card" data-id="${m._id}" data-type="${m.memberType}">
      <div class="member-photo-wrap">
        ${photo ? `<img src="${photo}" alt="${m.name}" class="member-photo" loading="lazy">` : ''}
      </div>
      <div class="member-info">
        <h3 class="member-name">${m.name}</h3>
        ${periodLine(m)}
        <div class="member-links">${links}</div>
        ${detailsHTML || ''}
        ${expandBtn}
      </div>
    </article>
  `;
}

function injectCards(sectionEl, list){
  if (!sectionEl) return;
  const grid = sectionEl.querySelector('.team-grid') || sectionEl;
  grid.innerHTML = (list && list.length) ? list.map(memberCard).join('') : '<p class="empty-note">No members to display.</p>';
}

// ---------- Modal (create once, reuse) ----------
function ensureModal(){
  let modal = $('#member-modal');
  if (modal) return modal;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="member-modal" class="modal" aria-hidden="true" role="dialog" aria-modal="true">
      <div class="modal-overlay" data-close-modal></div>
      <div class="modal-content">
        <button class="modal-close" title="Close" aria-label="Close" data-close-modal>&times;</button>
        <h2 id="modal-title"></h2>
        <div id="modal-body"></div>
      </div>
    </div>
  `);
  modal = $('#member-modal');

  modal.addEventListener('click', (e)=>{
    if (e.target.matches('[data-close-modal]')) closeModal();
  });
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape') closeModal();
  });
  return modal;
}
function openModal(title, html){
  const m = ensureModal();
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = html;
  m.classList.add('is-active');
  m.setAttribute('aria-hidden','false');
}
function closeModal(){
  const m = $('#member-modal');
  if (!m) return;
  m.classList.remove('is-active');
  m.setAttribute('aria-hidden','true');
}

// ---------- Tabs ----------
function setupTabs(){
  const btns = $$('.tab-button');
  const tabs = $$('.tab-content');
  if (!btns.length || !tabs.length) return;

  const show = (id)=>{
    tabs.forEach(t=>t.classList.toggle('active', t.id===id));
    btns.forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  };

  btns.forEach(b=>b.addEventListener('click', ()=>show(b.dataset.tab)));
  const initial = (window.location.hash || '#professor').slice(1);
  show(['professor','students','alumni'].includes(initial) ? initial : 'professor');
  window.addEventListener('hashchange', ()=>{
    const h = (window.location.hash || '#professor').slice(1);
    show(['professor','students','alumni'].includes(h) ? h : 'professor');
  });
}

// ---------- Fetch & render ----------
async function loadMembers(){
  const query = `*[_type == "teamMember"] | order(order asc, name asc){
    _id, name, memberType, role, email,
    photo{asset->{url}},
    profiles{ googleScholarUrl },
    period{ startDate, endDate },

    // student
    department, researchArea, currentDegree,
    mastersThesisTitle, phdThesisTitle,

    // professor
    details,

    // alumni
    obtainedDegree, currentOccupation,
    alumniMastersThesisTitle, alumniPhdThesisTitle
  }`;

  let members=[];
  try { members = await client.fetch(query); }
  catch (e){ console.error('Sanity fetch error:', e); return; }

  // store map for quick modal lookup
  window.__TEAM_BY_ID__ = Object.fromEntries(members.map(m => [m._id, m]));

  const professors = members.filter(m=>m.memberType==='Professor');
  const students   = members.filter(m=>m.memberType==='Student');
  const alumni     = members.filter(m=>m.memberType==='Alumni');

  const postdocs   = students.filter(m=>/postdoc/i.test(m.currentDegree||''));
  const phd        = students.filter(m=>/ph\.?d|doctoral/i.test(m.currentDegree||''));
  const masters    = students.filter(m=>/master/i.test(m.currentDegree||''));
  const undergrads = students.filter(m=>/undergrad|b\.?s|bachelor/i.test(m.currentDegree||''));

  injectCards($('#professor-section'), professors);
  injectCards($('#postdocs-section'), postdocs);
  injectCards($('#phd-section'), phd);
  injectCards($('#masters-section'), masters);
  injectCards($('#undergraduate-section'), undergrads);
  injectCards($('#alumni-section'), alumni);

  [$('#postdocs-section'), $('#phd-section'), $('#masters-section'), $('#undergraduate-section')].forEach(sec=>{
    const grid = sec?.querySelector('.team-grid');
    if (sec && grid && grid.children.length === 0) sec.style.display = 'none';
  });
}

// ---------- Events ----------
// 1) Inline expand for Alumni/Professor
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.expand-btn');
  if (!btn) return;

  // Students: open modal instead
  const card = btn.closest('.member-card');
  const type = card?.dataset?.type;
  if (btn.dataset.openModal && type === 'Student'){
    openStudentModal(btn.dataset.openModal);
    return;
  }

  // Alumni/Professor inline toggle
  const expanded = card.classList.toggle('expanded');
  btn.textContent = expanded ? 'Show less' : 'Show more';
  btn.setAttribute('aria-expanded', String(expanded));
});

// 2) Build + open student modal
async function openStudentModal(memberId){
  const m = window.__TEAM_BY_ID__?.[memberId];
  if (!m) return;

  // details (same content as before but displayed inside modal)
  const detailParts = [];
  if (m?.department) detailParts.push(row('Department:', m.department, 'member-dept'));
  if (m?.researchArea) detailParts.push(row('Research Area:', m.researchArea, 'member-area'));
  if (m?.currentDegree) detailParts.push(row('Pursuing Degree:', m.currentDegree, 'member-area'));
  if (m?.mastersThesisTitle) detailParts.push(row('Master’s Thesis:', m.mastersThesisTitle, 'member-thesis'));
  if (m?.phdThesisTitle) detailParts.push(row('Ph.D. Thesis:', m.phdThesisTitle, 'member-thesis'));

  // fetch publications/presentations best-effort (schema-agnostic heuristics)
  const pubs = await fetchStudentPubs(m.name);
  const pres = await fetchStudentPresentations(m.name);

  const pubsHTML = pubs.length
    ? `<h3>Publications</h3><ul>${pubs.map(p=>`<li>${p}</li>`).join('')}</ul>`
    : '';
  const presHTML = pres.length
    ? `<h3>Presentations</h3><ul>${pres.map(p=>`<li>${p}</li>`).join('')}</ul>`
    : '';

  const header = `
    <div style="display:flex; gap:16px; align-items:center; margin-bottom:1rem;">
      ${m?.photo?.asset?.url ? `<img src="${m.photo.asset.url}" alt="${m.name}" style="width:84px;height:108px;object-fit:cover;border-radius:8px;">` : ''}
      <div>
        <div style="font-weight:700; font-size:1.1rem;">${m.name}</div>
        ${periodLine(m)}
        ${m.email ? `<div><a class="member-email" href="mailto:${m.email}">Email</a></div>` : ''}
        ${m?.profiles?.googleScholarUrl ? `<div><a class="member-link" href="${m.profiles.googleScholarUrl}" target="_blank" rel="noopener">Google Scholar</a></div>` : ''}
      </div>
    </div>
  `;

  const html = `
    ${header}
    <div class="member-details-content">
      ${detailParts.join('') || '<em>No additional details.</em>'}
    </div>
    ${pubsHTML}
    ${presHTML}
  `;
  openModal(`${m.name}`, html);
}

// Heuristic fetchers — adjust to your schemas if needed
async function fetchStudentPubs(name){
  try {
    // tries common fields: authors (string), authorList (array of strings), and reference link fields
    const q = `
      *[_type match "publication*" && (
        authors match $needle || author match $needle ||
        ($authorList != null && $needle in authorList)
      )] | order(date desc)[0..19]{
        title, journal, year, url, link, pdf, authors, authorList
      }
    `;
    const needle = `*${name}*`;
    const res = await client.fetch(q, { needle });
    return (res||[]).map(p=>{
      const link = p.url || p.link || p.pdf?.asset?.url;
      const meta = [p.journal, p.year].filter(Boolean).join(', ');
      const t = p.title || 'Untitled';
      return link ? `<a href="${link}" target="_blank" rel="noopener">${t}</a>${meta ? ` — <span class="thesis-meta">${meta}</span>`:''}`
                  : `${t}${meta ? ` — <span class="thesis-meta">${meta}</span>`:''}`;
    });
  } catch { return []; }
}
async function fetchStudentPresentations(name){
  try {
    const q = `
      *[_type match "presentation*" && (
        presenters match $needle || presenter match $needle ||
        ($presenterList != null && $needle in presenterList)
      )] | order(date desc)[0..19]{
        title, event, year, url, link, presenters, presenterList
      }
    `;
    const needle = `*${name}*`;
    const res = await client.fetch(q, { needle });
    return (res||[]).map(p=>{
      const link = p.url || p.link;
      const meta = [p.event, p.year].filter(Boolean).join(', ');
      const t = p.title || 'Untitled';
      return link ? `<a href="${link}" target="_blank" rel="noopener">${t}</a>${meta ? ` — <span class="thesis-meta">${meta}</span>`:''}`
                  : `${t}${meta ? ` — <span class="thesis-meta">${meta}</span>`:''}`;
    });
  } catch { return []; }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', ()=>{
  setupTabs();
  loadMembers();
});
