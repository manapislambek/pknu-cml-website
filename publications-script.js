import { createClient } from 'https://esm.sh/@sanity/client';

const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-07-21',
});

// --- Global State ---
let allPublications = [];
let activeTab = 'international';

// --- Helper to format numbers: volume(issue), pages ---
function formatNumbers(vol, iss, pag) {
    let parts = [];
    if (vol && iss) parts.push(`${vol}(${iss})`);
    else if (vol) parts.push(vol);
    if (pag) parts.push(pag);
    return parts.join(', ');
}

// --- Helper to render a list of publications ---
function renderList(items, container) {
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<p style="padding: 1.5rem 0; color: #6c757d;">None in this category.</p>';
        return;
    }
    items.forEach((pub, index) => {
        const item = document.createElement('div');
        item.className = 'publication-item';
        const year = new Date(pub.publicationDate).getFullYear();
        const numbers = formatNumbers(pub.volume, pub.issue, pub.pages);
        const itemNumber = index + 1;

        item.innerHTML = `
          <div class="publication-number">${itemNumber}.</div>
          <div class="publication-content">
            <p class="publication-meta">${pub.journalName} (${year}) ${numbers}</p>
            <h3 class="publication-title">${pub.title}</h3>
            <p class="publication-authors">${pub.authors}</p>
            ${pub.link ? `<a href="${pub.link}" target="_blank" rel="noopener noreferrer" class="publication-link">Read Paper &rarr;</a>` : ''}
          </div>
        `;
        container.appendChild(item);
    });
}

// --- Main function to filter, sort, and display ---
function displayPublications() {
    const searchTerm = document.getElementById('pub-search-input').value.toLowerCase();
    const sortOrder = document.getElementById('pub-sort-order').value;
    const rowsPerPage = parseInt(document.getElementById('pub-rows-per-page').value, 10);
    const categoryFilter = activeTab === 'international' ? 'international' : 'korean';

    let filteredData = allPublications.filter(p => p.category === categoryFilter && p.title.toLowerCase().includes(searchTerm));

    filteredData.sort((a, b) => {
        const dateA = new Date(a.publicationDate);
        const dateB = new Date(b.publicationDate);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const journals = filteredData.filter(p => p.type === 'journal').slice(0, rowsPerPage);
    const conferences = filteredData.filter(p => p.type === 'conference').slice(0, rowsPerPage);

    renderList(journals, document.getElementById(`${activeTab}-journal-list`));
    renderList(conferences, document.getElementById(`${activeTab}-conference-list`));
}

// --- Initial data load ---
async function loadAllPublications() {
    try {
        // This query now explicitly asks for all the fields we need
        const query = `*[_type == "publication"]{title, authors, category, type, journalName, year, volume, issue, pages, link, publicationDate}`;
        allPublications = await client.fetch(query);
        displayPublications();
    } catch (error) {
        console.error("Error fetching publications:", error);
    }
}

// --- Event Listeners and Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            activeTab = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(activeTab).classList.add('active');
            displayPublications();
        });
    });

    document.getElementById('pub-search-input').addEventListener('input', displayPublications);
    document.getElementById('pub-sort-order').addEventListener('change', displayPublications);
    document.getElementById('pub-rows-per-page').addEventListener('change', displayPublications);
    
    loadAllPublications();
});