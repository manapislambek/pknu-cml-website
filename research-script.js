import { createClient } from 'https://esm.sh/@sanity/client';
import { toHTML } from 'https://esm.sh/@portabletext/to-html';
import imageUrlBuilder from 'https://esm.sh/@sanity/image-url';
import { initializeAnimations } from './animations.js';

// --- Sanity Client & Helpers ---
const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-07-21',
});

const builder = imageUrlBuilder(client);
function urlFor(source) {
  return builder.image(source);
}

const portableTextComponents = {
  types: {
    image: ({ value }) => `<img class="portable-text-image" alt="${value.alt || ' '}" loading="lazy" src="${urlFor(value).width(800).auto('format').url()}"/>`,
  },
};

// --- Modal Control Functions ---
function setupModalControls() {
    const modal = document.getElementById('research-modal');
    if (!modal) return;
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const closeModal = () => modal.classList.remove('is-active');
    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
}

function openResearchModal(areaData) {
    const modal = document.getElementById('research-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = areaData.title;
    const detailsHtml = areaData.detailedDescription 
        ? toHTML(areaData.detailedDescription, { components: portableTextComponents }) 
        : '<p>No further details available.</p>';
    modalBody.innerHTML = detailsHtml;
    
    modal.classList.add('is-active');
}


// --- Main Data Loading Functions ---
async function loadResearchAreas() {
    const container = document.querySelector('#areas .pillars-container');
    if (!container) return;
    const parentContentEl = container.closest('.tab-content');
    container.innerHTML = '<p>Loading research areas...</p>';
    try {
        const query = `*[_type == "researchArea"] { _id, title, description, detailedDescription } | order(order asc)`;
        const areas = await client.fetch(query);
        parentContentEl.dataset.loaded = 'true';

        if (areas && areas.length > 0) {
            container.innerHTML = ''; 
            areas.forEach(area => {
                const card = document.createElement('div');
                card.className = 'pillar-card';
                card.innerHTML = `<h3>${area.title}</h3><p>${area.description || ''}</p><button class="expand-btn">Read More</button>`;
                container.appendChild(card);
                
                card.querySelector('.expand-btn').addEventListener('click', () => openResearchModal(area));
            });
        } else {
            container.innerHTML = '<p>No research areas have been defined yet.</p>';
        }
    } catch (error) {
        console.error('Error fetching research areas:', error);
        container.innerHTML = '<p style="color: red;">Failed to load research areas.</p>';
    }
    initializeAnimations();
}

async function loadProjects() {
    const tableBody = document.querySelector('#projects .projects-table tbody');
    if (!tableBody) return;
    const parentContentEl = tableBody.closest('.tab-content');
    tableBody.innerHTML = '<tr><td colspan="4">Loading projects...</td></tr>';
    try {
        const query = `*[_type == "project"] | order(order asc)`;
        const projects = await client.fetch(query);
        parentContentEl.dataset.loaded = 'true';

        if (projects && projects.length > 0) {
            tableBody.innerHTML = '';
            projects.forEach((project, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td data-label="No.">${index + 1}</td><td data-label="Project Title">${project.title}</td><td data-label="Funding Agency">${project.fundingAgency}</td><td data-label="Duration of Project">${project.duration}</td>`;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4">No projects have been added yet.</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching projects:', error);
        tableBody.innerHTML = '<tr><td colspan="4" style="color: red;">Failed to load projects.</td></tr>';
    }
    initializeAnimations();
}


// --- Page Initialization ---

function initResearchPage() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const switchTab = (tabId) => {
        const button = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        const contentEl = document.getElementById(tabId);
        if (!button || !contentEl) return;

        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        button.classList.add('active');
        contentEl.classList.add('active');

        if (contentEl.dataset.loaded !== 'true') {
            if (tabId === 'areas') loadResearchAreas();
            else if (tabId === 'projects') loadProjects();
        }
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    const handleHash = () => {
        const hash = window.location.hash;
        const targetTab = (hash === '#projects-section') ? 'projects' : 'areas';
        switchTab(targetTab);
    };

    window.addEventListener('hashchange', handleHash);
    handleHash(); // Initial load
    
    setupModalControls();
}

initResearchPage();