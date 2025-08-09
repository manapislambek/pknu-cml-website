// publications-script.js — Full, hardened version
// - Deep-link aware: respects #journal / #conference in the URL
// - "Undefined"-proof metadata and date handling
// - Stable ESM version for @sanity/client

import { createClient } from 'https://esm.sh/@sanity/client@6.15.10';

// --- Sanity Client Setup ---
const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,              // set to false if you need the freshest data always
  apiVersion: '2024-07-21',  // keep in sync with your Studio
});

// --- Global State ---
let allPublications = [];
let activeCategory = 'international'; // Default; toggled by the category buttons if present
let currentPage = 1;

// --- Helpers ---
function safeYear(dateStr) {
  if (!dateStr) return '';
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return '';
  return new Date(t).getFullYear();
}

function buildMetaParts(pub) {
  // Three stacked lines: 1) Title (handled elsewhere) 2) Authors (Year) 3) Journal + volume/issue/pages
  // Replace BibTeX double hyphen with en dash for page ranges
  const pageClean = (pub.pages || '').trim().replace(/--/g, '–');

  const y = safeYear(pub.publicationDate);
  const yearHtml = y ? `<span class="pub-year">(${y})</span>` : '';

  const line1Parts = [];
  if (pub.authors) line1Parts.push(pub.authors);
  if (yearHtml) line1Parts.push(yearHtml);
  const line1 = line1Parts.join(' ');

  const vol = (pub.volume || '').trim();
  const iss = (pub.issue || '').trim();
  const volIss = vol || iss ? `${vol}${iss ? `(${iss})` : ''}` : '';

  const journalHtml = pub.journalName ? `<em>${pub.journalName}</em>` : '';
  const numHtml = [volIss, pageClean].filter(Boolean).join(' · '); // nice dot separator

  const line2Parts = [];
  if (journalHtml) line2Parts.push(journalHtml);
  if (numHtml) line2Parts.push(numHtml);
  const line2 = line2Parts.join(' · ');

  return { line1, line2 };
}

function createPubItem(pub) {
  const titleHtml = pub.link
    ? `<a href="${pub.link}" target="_blank" rel="noopener noreferrer" class="pub-title-link">${pub.title || ''}</a>`
    : `${pub.title || ''}`;

  const meta = buildMetaParts(pub);

  return `
    <article class="publication-item">
      <h3 class="pub-title">${titleHtml}</h3>
      ${meta.line1 ? `<div class="pub-line pub-authors">${meta.line1}</div>` : ''}
      ${meta.line2 ? `<div class="pub-line pub-journal">${meta.line2}</div>` : ''}
    </article>
  `;
}

function renderList(items, container, page, perPage) {
  if (!container) return;
  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = '<p style="padding: 1.5rem 0; color: #6c757d;">No publications match your criteria.</p>';
    return;
  }

  // Pagination slice
  const showAll = !perPage || perPage >= 10000;
  const total = items.length;
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(total / perPage));
  const curr = showAll ? 1 : Math.min(page, totalPages);
  const startIdx = showAll ? 0 : (curr - 1) * perPage;
  const endIdx = showAll ? total : Math.min(total, startIdx + perPage);
  const pageItems = items.slice(startIdx, endIdx);

  // Items
  const listHtml = pageItems.map(createPubItem).join('\n');

  // Pager (Prev / Next + range)
  const rangeText = showAll
    ? `Showing all ${total}`
    : `Showing ${startIdx + 1}–${endIdx} of ${total}`;

  const pagerHtml = totalPages > 1 && !showAll ? `
    <nav class="pub-pagination" aria-label="Publications pagination">
      <button class="pager-btn" data-page="prev" ${curr === 1 ? 'disabled' : ''}>Prev</button>
      <span class="pager-status">Page ${curr} of ${totalPages}</span>
      <button class="pager-btn" data-page="next" ${curr === totalPages ? 'disabled' : ''}>Next</button>
    </nav>
  ` : '';

  container.innerHTML = `
    <div class="pub-range">${rangeText}</div>
    <div class="pub-list">${listHtml}</div>
    ${pagerHtml}
  `;

  if (pagerHtml) {
    const prev = container.querySelector('[data-page="prev"]');
    const next = container.querySelector('[data-page="next"]');
    prev && prev.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); displayPublications(); });
    next && next.addEventListener('click', () => { currentPage = currentPage + 1; displayPublications(); });
  }
}

function normalizedIncludes(haystack, needle) {
  return (haystack || '').toLowerCase().includes((needle || '').toLowerCase());
}

function sortByDate(a, b, order) {
  const da = a.publicationDate ? Date.parse(a.publicationDate) : 0;
  const db = b.publicationDate ? Date.parse(b.publicationDate) : 0;
  return order === 'asc' ? da - db : db - da;
}

// --- Core render ---
function displayPublications() {
  const listEl = document.getElementById('publications-list-container');
  const typeSel = document.getElementById('pub-type-select');
  const searchInput = document.getElementById('pub-search-input');
  const sortSel = document.getElementById('pub-sort-order');
  const perPageSel = document.getElementById('pub-rows-per-page');

  const type = typeSel ? typeSel.value : 'journal';
  const q = searchInput ? searchInput.value.trim() : '';
  const order = sortSel ? sortSel.value : 'desc';
  const perPage = perPageSel ? parseInt(perPageSel.value, 10) : 10;

  // Keep hash synced with type select
  const hash = `#${type}`;
  if (window.location.hash !== hash) {
    // Avoid pushing a new entry for every keystroke; only set on type change
    // (This function can be called a lot; this minor check is enough.)
    history.replaceState(null, '', hash);
  }

  // Filter
  let data = allPublications.filter(p => p.category === activeCategory && p.type === type);
  if (q) data = data.filter(p => normalizedIncludes(p.title, q));

  // Sort
  data.sort((a, b) => sortByDate(a, b, order));

  // Reset page if filters changed drastically (basic heuristic)
  if (currentPage > 1) {
    const totalPages = perPage >= 10000 ? 1 : Math.max(1, Math.ceil(data.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;
  }

  renderList(data, listEl, currentPage, perPage);
}

// --- Data load ---
async function loadAllPublications() {
  // Fetch *all* publications once; UI does the filtering/paging client-side
  const query = `*[_type == "publication"] | order(publicationDate desc) {
    _id,
    title,
    authors,
    category,
    type,
    publicationDate,
    journalName,
    volume,
    issue,
    pages,
    link
  }`;

  try {
    const data = await client.fetch(query);
    allPublications = Array.isArray(data) ? data : [];
    displayPublications();
  } catch (err) {
    const listEl = document.getElementById('publications-list-container');
    console.error('Failed to load publications', err);
    if (listEl) listEl.innerHTML = '<p style="color:red; padding:1rem 0;">Failed to load publications.</p>';
  }
}

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  // 1) Category buttons (International / Korean), optional in DOM
  const categoryButtons = document.querySelectorAll('[data-category]');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-category');
      if (next && (next === 'international' || next === 'korean')) {
        activeCategory = next;
        // Visual state (if you use an .active class)
        categoryButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPage = 1;
        displayPublications();
      }
    });
  });

  // 2) Initialize type from URL hash (#journal / #conference)
  const initialHash = (window.location.hash || '').toLowerCase();
  if (initialHash === '#journal' || initialHash === '#conference') {
    const typeSel = document.getElementById('pub-type-select');
    if (typeSel) typeSel.value = initialHash.slice(1);
  }

  // 3) Keep in sync on manual hash changes
  window.addEventListener('hashchange', () => {
    const h = (window.location.hash || '').toLowerCase();
    if (h === '#journal' || h === '#conference') {
      const typeSel = document.getElementById('pub-type-select');
      if (typeSel && typeSel.value !== h.slice(1)) {
        typeSel.value = h.slice(1);
        currentPage = 1;
        displayPublications();
      }
    }
  });

  // 4) UI listeners
  const typeSel = document.getElementById('pub-type-select');
  const searchInput = document.getElementById('pub-search-input');
  const sortSel = document.getElementById('pub-sort-order');
  const perPageSel = document.getElementById('pub-rows-per-page');

  typeSel && typeSel.addEventListener('change', () => { currentPage = 1; displayPublications(); });
  searchInput && searchInput.addEventListener('input', () => { currentPage = 1; displayPublications(); });
  sortSel && sortSel.addEventListener('change', () => { currentPage = 1; displayPublications(); });
  perPageSel && perPageSel.addEventListener('change', () => { currentPage = 1; displayPublications(); });

  // 5) Initial load
  loadAllPublications();
});