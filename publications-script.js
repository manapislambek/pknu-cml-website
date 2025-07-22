import { createClient } from 'https://esm.sh/@sanity/client';

const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-07-21',
});

// --- Global State ---
let journalPapers = [];
let conferencePapers = [];
let currentPage = 1;
let rowsPerPage = 10;
let activeTab = 'journal';

// --- Main Render Function ---
function displayPublications() {
    const dataSource = activeTab === 'journal' ? journalPapers : conferencePapers;
    const container = document.querySelector(`#${activeTab} .publications-list`);
    const paginationContainer = document.querySelector(`#${activeTab} .pagination-controls`);
    if (!container || !paginationContainer) return;

    // 1. Apply Sorting
    const sortOrder = document.getElementById('pub-sort-order').value;
    dataSource.sort((a, b) => {
        const dateA = new Date(a.publicationDate);
        const dateB = new Date(b.publicationDate);
        return sortOrder === 'asc' ? dateA - dateB : dateB - a;
    });

    // 2. Apply Search Filter
    const searchTerm = document.getElementById('pub-search-input').value.toLowerCase();
    const filteredData = dataSource.filter(pub => pub.title.toLowerCase().includes(searchTerm));

    // 3. Apply Pagination
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedItems = filteredData.slice(startIndex, endIndex);
    
    container.innerHTML = '';
    if (paginatedItems.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No publications match your criteria.</p>';
    } else {
        paginatedItems.forEach((pub, index) => {
            const item = document.createElement('div');
            item.className = 'publication-item';
            const year = new Date(pub.publicationDate).getFullYear();
            const itemNumber = startIndex + index + 1;

            item.innerHTML = `
              <div class="publication-number">${itemNumber}.</div>
              <div class="publication-content">
                <p class="publication-meta">${pub.publicationDetails} (${year})</p>
                <h3 class="publication-title">${pub.title}</h3>
                <p class="publication-authors">${pub.authors}</p>
                ${pub.link ? `<a href="${pub.link}" target="_blank" rel="noopener noreferrer" class="publication-link">Read Paper &rarr;</a>` : ''}
              </div>
            `;
            container.appendChild(item);
        });
    }
    setupPagination(filteredData.length, paginationContainer);
}

function setupPagination(totalItems, container) {
    container.innerHTML = '';
    const pageCount = Math.ceil(totalItems / rowsPerPage);
    if (pageCount <= 1) return;

    for (let i = 1; i <= pageCount; i++) {
        const button = document.createElement('button');
        button.className = 'pagination-button';
        button.innerText = i;
        if (i === currentPage) button.classList.add('active');
        button.addEventListener('click', () => {
            currentPage = i;
            displayPublications();
            container.scrollIntoView({ behavior: 'smooth' });
        });
        container.appendChild(button);
    }
}

// --- Initial Data Load ---
async function loadAllPublications() {
    try {
        const query = `*[_type == "publication"]`; // Fetch unsorted
        const allPublications = await client.fetch(query);

        journalPapers = allPublications.filter(p => p.type === 'journal');
        conferencePapers = allPublications.filter(p => p.type === 'conference');
        
        displayPublications(); // Initial render will use default sort
    } catch (error) {
        console.error("Error fetching publications:", error);
    }
}

// --- Event Listeners and Initialization ---
function handleTabSwitch() {
    const hash = window.location.hash;
    activeTab = (hash === '#conference') ? 'conference' : 'journal';
    const targetButton = document.querySelector(`.tab-button[data-tab="${activeTab}"]`);
    if (targetButton) targetButton.click();
}

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            activeTab = button.dataset.tab;
            currentPage = 1;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(activeTab).classList.add('active');
            displayPublications();
        });
    });

    document.getElementById('pub-search-input').addEventListener('input', () => { currentPage = 1; displayPublications(); });
    document.getElementById('pub-sort-order').addEventListener('change', () => { currentPage = 1; displayPublications(); });
    document.getElementById('pub-rows-per-page').addEventListener('change', (e) => {
        rowsPerPage = parseInt(e.target.value, 10);
        currentPage = 1;
        displayPublications();
    });

    window.addEventListener('hashchange', handleTabSwitch);
    handleTabSwitch();
    loadAllPublications();
});