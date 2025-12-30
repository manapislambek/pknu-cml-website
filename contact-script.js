// 1. IMPORTS
// All imports must come first.
import { createClient } from 'https://esm.sh/@sanity/client';
import imageUrlBuilder from 'https://esm.sh/@sanity/image-url';
import { toHTML } from 'https://esm.sh/@portabletext/to-html';

// 2. SANITY CLIENT SETUP
// The client must be created right after imports.
const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-07-21',
});

// 3. HELPER FUNCTIONS & COMPONENTS
// These can be defined now because they depend on the 'client'.
const builder = imageUrlBuilder(client);
function urlFor(source) {
  return builder.image(source);
}

const portableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) return '';
      return `
        <img
          class="portable-text-image"
          alt="${value.alt || ' '}"
          loading="lazy"
          src="${urlFor(value).width(800).auto('format').url()}"
        />
      `;
    }
  }
};

// small util for safe text
const esc = (s) => (s ?? '').toString()
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#39;');

// 4. GLOBAL STATE & EVENT LISTENERS
let allAnnouncements = [];
let currentPage = 1;
let rowsPerPage = 10;
let isLoadingAnnouncements = true;

// In contact-script.js
function handleTabSwitch() {
  const hash = window.location.hash;
  let targetTab;
  if (hash === '#gallery') {
    targetTab = 'gallery';
  } else if (hash === '#contact-info-section' || hash === '#contact') {
    targetTab = 'contact';
  } else {
    targetTab = 'announcements';
  }
  const targetButton = document.querySelector(`.tab-button[data-tab="${targetTab}"]`);
  if (targetButton) targetButton.click();
}

document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      button.classList.add('active');
      const tabId = button.dataset.tab;
      document.getElementById(tabId).classList.add('active');
    });
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 1; 
      displayAnnouncements();
    });
  }

  const rowsPerPageSelect = document.getElementById('rows-per-page');
  if (rowsPerPageSelect) {
    rowsPerPageSelect.addEventListener('change', (e) => {
      rowsPerPage = parseInt(e.target.value, 10);
      currentPage = 1;
      displayAnnouncements();
    });
  }

  window.addEventListener('hashchange', handleTabSwitch);
  handleTabSwitch(); // Run on initial load
});

// 5. PAGE-SPECIFIC FUNCTIONS

// NEW: multi-professor Contact Info renderer (no photos)
async function loadContactInfo() {
  const box = document.getElementById('contact-details-container');
  if (!box) return;

  try {
    const query = `
      *[_type == "contactInfo"][0]{
        address,
        // new multi-professor structure
        contacts[]{
          person->{ name, email },
          email,
          phone
        },
        // legacy fields (fallback only)
        email,
        phone
      }
    `;
    const info = await client.fetch(query);

    if (!info) {
      box.innerHTML = `<p style="text-align:center; padding:1rem;">Contact information has not been set up yet.</p>`;
      return;
    }

    const address = esc(info.address || '');
    const contactsArr = Array.isArray(info.contacts) ? info.contacts : [];

    // Build professor contacts list (Name, Email, Phone)
    const profCards = contactsArr.map((c) => {
      const name  = esc(c?.person?.name || 'Professor');
      const email = (c?.email || c?.person?.email || '').trim();
      const phone = (c?.phone || '').trim();

      const emailHtml = email
        ? `<a class="contact-email-link" href="mailto:${email}">${esc(email)}</a>`
        : '—';

      const phoneHtml = phone ? esc(phone) : '—';

      return `
        <div class="prof-contact">
          <div class="prof-name">${name}</div>
          <div class="prof-line"><span class="label">Email:</span> ${emailHtml}</div>
          <div class="prof-line"><span class="label">Phone:</span> ${phoneHtml}</div>
        </div>
      `;
    }).join('');

    // Fallback to legacy single email/phone if no contacts[] provided
    const legacyBlock = (!profCards && (info.email || info.phone)) ? `
      <div class="prof-contact">
        <div class="prof-name">Contact</div>
        ${info.email ? `<div class="prof-line"><span class="label">Email:</span> <a class="contact-email-link" href="mailto:${esc(info.email)}">${esc(info.email)}</a></div>` : ''}
        ${info.phone ? `<div class="prof-line"><span class="label">Phone:</span> ${esc(info.phone)}</div>` : ''}
      </div>
    ` : '';

    box.innerHTML = `
      <div class="contact-box">
        <div class="contact-row address-row">
          <span class="label">Address:</span>
          <span class="value">${address || '—'}</span>
        </div>

        ${contactsArr.length ? `<div class="contact-section-title">Professor Contacts</div>` : ''}
        <div class="prof-contacts">
          ${profCards || legacyBlock || '<em>No professor contacts added yet.</em>'}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error fetching contact info:', error);
    box.innerHTML = '<p style="color: red; text-align:center;">Could not load contact information.</p>';
  }
}

function displayAnnouncements() {
  const container = document.querySelector('.announcements-list');
  const searchInput = document.getElementById('search-input');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

  if (!container) return;
  if (isLoadingAnnouncements) {
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading announcements...</p>';
    return;
  }
  container.innerHTML = '';
  const filteredAnnouncements = allAnnouncements.filter(item => 
    item.title.toLowerCase().includes(searchTerm)
  );
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedItems = filteredAnnouncements.slice(startIndex, endIndex);

  if (paginatedItems.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">No announcements found.</p>';
    setupPagination(0);
    return;
  }

  paginatedItems.forEach((item, index) => {
    const announcementEl = document.createElement('div');
    announcementEl.className = 'announcement-item';
    announcementEl.id = item._id;
    const date = new Date(item.publishedAt).toLocaleDateString('en-CA');
    announcementEl.innerHTML = `
      <div class="announcement-header">
        <span class="announcement-number">${startIndex + index + 1}</span>
        <span class="announcement-title">${item.title}</span>
        <span class="announcement-date">${date}</span>
      </div>
      <div class="announcement-body">
        <div class="announcement-body-content portable-text-content">
          ${toHTML(item.body, { components: portableTextComponents })}
        </div>
      </div>
    `;
    container.appendChild(announcementEl);
  });

  document.querySelectorAll('.announcement-header').forEach(header => {
    header.addEventListener('click', (e) => {
      e.currentTarget.closest('.announcement-item').classList.toggle('expanded');
    });
  });
  setupPagination(filteredAnnouncements.length);
}

function checkUrlForAnnouncement() {
  const params = new URLSearchParams(window.location.search);
  const announcementId = params.get('announcement');
  if (announcementId) {
    const target = document.getElementById(announcementId);
    if (target) {
      target.classList.add('expanded');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function setupPagination(totalItems) {
  const paginationContainer = document.querySelector('.pagination-controls');
  if (!paginationContainer) return;
  paginationContainer.innerHTML = '';
  const pageCount = Math.ceil(totalItems / rowsPerPage);

  for (let i = 1; i <= pageCount; i++) {
    const button = document.createElement('button');
    button.className = 'pagination-button';
    button.innerText = i;
    if (i === currentPage) button.classList.add('active');
    button.addEventListener('click', () => {
      currentPage = i;
      displayAnnouncements();
    });
    paginationContainer.appendChild(button);
  }
}

async function initialLoadAnnouncements() {
  const container = document.querySelector('.announcements-list');
  try {
    displayAnnouncements(); 
    const query = `*[_type == "announcement"] { _id, title, publishedAt, body }`;
    allAnnouncements = await client.fetch(query);
    isLoadingAnnouncements = false;
    displayAnnouncements();
    checkUrlForAnnouncement();
  } catch (error) {
    console.error('Error fetching announcements:', error);
    isLoadingAnnouncements = false;
    if (container) container.innerHTML = '<p style="text-align: center; color: red;">Could not load announcements.</p>';
  }
}

async function loadGalleryImages() {
  const container = document.querySelector('.photo-grid');
  if (!container) return;
  
  try {
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading gallery...</p>';
    const query = `*[_type == "galleryImage"] | order(date desc)`;
    const images = await client.fetch(query);
    container.innerHTML = '';

    if (images.length === 0) {
      container.innerHTML = '<p style="text-align: center; padding: 2rem;">No gallery images have been added yet.</p>';
      return;
    }

    images.forEach(item => {
      const photoCard = document.createElement('div');
      photoCard.className = 'photo-card';
      const imageUrl = item.photo ? urlFor(item.photo).width(500).url() : 'https://placehold.co/500x350/e9ecef/333?text=Image';
      const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      photoCard.innerHTML = `
        <img src="${imageUrl}" alt="${item.title}" class="gallery-photo">
        <div class="photo-caption">
          <span class="photo-title">${item.title}</span>
          ${date ? `<span class="photo-date">${date}</span>` : ''}
        </div>
      `;
      container.appendChild(photoCard);
    });
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    container.innerHTML = '<p style="text-align: center; color: red; padding: 2rem;">Could not load gallery images.</p>';
  }
}

// --- 6. RUN ALL INITIAL LOAD FUNCTIONS ---
loadContactInfo();
initialLoadAnnouncements();
loadGalleryImages();
