// publications-script.js
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

// --- Helper functions ---
function formatNumbers(vol, iss, pag) {
    let parts = [];
    if (vol && iss) parts.push(`${vol}(${iss})`);
    else if (vol) parts.push(vol);
    if (pag) parts.push(pag);
    return parts.join(', ');
}

function buildMetaString(pub) {
    const year = new Date(pub.publicationDate).getFullYear();
    const parts = [];
    if (pub.journalName) parts.push(pub.journalName);
    parts.push(`(${year})`);
    const nums = formatNumbers(pub.volume, pub.issue, pub.pages);
    if (nums) parts.push(nums);
    return parts.join(' ');
}

// --- Render list function ---
function renderList(items, container) {
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<p style="padding: 1.5rem 0; color: #6c757d;">No publications match your criteria.</p>';
        return;
    }
    items.forEach((pub, index) => {
        const item = document.createElement('div');
        item.className = 'publication-item';
        const metaText = buildMetaString(pub); // Use the new robust function
        const itemNumber = index + 1;

        item.innerHTML = `
          <div class="publication-number">${itemNumber}.</div>
          <div class="publication-content">
            <p class="publication-meta">${metaText}</p>
            <h3 class="publication-title">${pub.title}</h3>
            <p class="publication-authors">${pub.authors}</p>
            ${pub.link ? `<a href="${pub.link}" ...>Read Paper &rarr;</a>` : ''}
          </div>
        `;
        container.appendChild(item);
    });
}
// --- Main function to filter, sort, and display publications ---
function displayPublications() {
    // 1. Get current filter values
    const searchTerm = document.getElementById('pub-search-input').value.toLowerCase();
    const sortOrder = document.getElementById('pub-sort-order').value;
    const rowsPerPage = parseInt(document.getElementById('pub-rows-per-page').value, 10);

    // 2. Filter by the active tab (International or Domestic/Korean)
    const categoryFilter = activeTab === 'international' ? 'international' : 'korean';
    let filteredData = allPublications.filter(p => p.category === categoryFilter);

    // 3. Apply search filter
    if (searchTerm) {
        filteredData = filteredData.filter(p => p.title.toLowerCase().includes(searchTerm));
    }

    // 4. Apply sorting
    filteredData.sort((a, b) => {
        const dateA = new Date(a.publicationDate);
        const dateB = new Date(b.publicationDate);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    // 5. Separate into Journals and Conferences and apply pagination
    const journals = filteredData.filter(p => p.type === 'journal').slice(0, rowsPerPage);
    const conferences = filteredData.filter(p => p.type === 'conference').slice(0, rowsPerPage);

    // 6. Render the lists into the correct containers for the active tab
    renderList(journals, document.getElementById(`${activeTab}-journal-list`));
    renderList(conferences, document.getElementById(`${activeTab}-conference-list`));
}

// --- Function to initially load all data from Sanity ---
async function loadAllPublications() {
    try {
        // Query must be specific to fetch all required fields
        const query = `*[_type == "publication"]{title, authors, category, type, journalName, publicationDate, volume, issue, pages, link}`;
        allPublications = await client.fetch(query);
        displayPublications();
    } catch (error) {
        console.error("Error fetching publications:", error);
    }
}

// --- Event Listeners and Page Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching logic
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

    // Filter control listeners
    document.getElementById('pub-search-input').addEventListener('input', displayPublications);
    document.getElementById('pub-sort-order').addEventListener('change', displayPublications);
    document.getElementById('pub-rows-per-page').addEventListener('change', displayPublications);
    
    // Initial load
    loadAllPublications();
});