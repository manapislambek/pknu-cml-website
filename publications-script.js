import { createClient } from 'https://esm.sh/@sanity/client';

// --- Sanity Client Setup ---
const client = createClient({
  projectId: 'fd0kvo22', // Replace with your actual project ID
  dataset: 'production',
  useCdn: true, // `false` if you want to ensure fresh data
  apiVersion: '2024-07-21',
});

// --- Global State ---
let allPublications = [];
let activeCategory = 'international'; // Default category

// --- Helper: Format Volume, Issue, and Pages ---
function formatNumbers(vol, iss, pag) {
    let parts = [];
    if (vol && iss) parts.push(`${vol}(${iss})`);
    else if (vol) parts.push(vol);
    if (pag) parts.push(pag);
    return parts.join(', ');
}

// --- Helper: Build the metadata string, guarding against missing fields ---
function buildMetaString(pub) {
    const year = new Date(pub.publicationDate).getFullYear();
    const parts = [];
    // This check prevents "undefined" from showing
    if (pub.journalName) {
        parts.push(pub.journalName);
    }
    parts.push(`(${year})`);
    const nums = formatNumbers(pub.volume, pub.issue, pub.pages);
    if (nums) {
        parts.push(nums);
    }
    return parts.join(' ');
}

// --- Helper: Render a list of items into a container ---
function renderList(items, container) {
    container.innerHTML = ''; // Clear previous results
    if (items.length === 0) {
        container.innerHTML = '<p style="padding: 1.5rem 0; color: #6c757d;">No publications match your criteria.</p>';
        return;
    }
    items.forEach((pub, index) => {
        const item = document.createElement('div');
        item.className = 'publication-item';
        const metaText = buildMetaString(pub);
        const itemNumber = index + 1;

        item.innerHTML = `
          <div class="publication-number">${itemNumber}.</div>
          <div class="publication-content">
            <p class="publication-meta">${metaText}</p>
            <h3 class="publication-title">${pub.title}</h3>
            <p class="publication-authors">${pub.authors}</p>
            ${pub.link ? `<a href="${pub.link}" target="_blank" rel="noopener noreferrer" class="read-paper-link">Read Paper &rarr;</a>` : ''}
          </div>
        `;
        container.appendChild(item);
    });
}

// --- Main function to filter, sort, and display publications ---
function displayPublications() {
    // 1. Get current values from all UI controls
    const activeType = document.getElementById('pub-type-select').value;
    const searchTerm = document.getElementById('pub-search-input').value.toLowerCase();
    const sortOrder = document.getElementById('pub-sort-order').value;
    const rowsPerPage = parseInt(document.getElementById('pub-rows-per-page').value, 10);

    // 2. Filter the data in sequence
    let filteredData = allPublications
        .filter(p => p.category === activeCategory) // Filter by active tab (International/Domestic)
        .filter(p => p.type === activeType);      // Filter by dropdown (Journal/Conference)

    // Apply search term if it exists
    if (searchTerm) {
        filteredData = filteredData.filter(p => p.title.toLowerCase().includes(searchTerm));
    }

    // 3. Apply sorting
    filteredData.sort((a, b) => {
        const dateA = new Date(a.publicationDate);
        const dateB = new Date(b.publicationDate);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    // 4. Apply pagination
    const paginatedData = filteredData.slice(0, rowsPerPage);

    // 5. Render the final list to the single container
    const container = document.getElementById('publications-list-container');
    renderList(paginatedData, container);
}

// --- Function to initially load all data from Sanity ---
async function loadAllPublications() {
    try {
        // GROQ query to fetch all necessary fields
        const query = `*[_type == "publication"]{title, authors, category, type, journalName, publicationDate, volume, issue, pages, link}`;
        allPublications = await client.fetch(query);
        displayPublications(); // Perform the initial render
    } catch (error) {
        console.error("Error fetching publications:", error);
        const container = document.getElementById('publications-list-container');
        container.innerHTML = '<p style="color: red;">Failed to load publications. Please try again later.</p>';
    }
}

// --- Event Listeners and Page Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Listener for Category Tabs (International/Domestic)
    const categoryButtons = document.querySelectorAll('.category-button');
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            activeCategory = button.dataset.category; // Update state
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            displayPublications(); // Re-render the list with the new category
        });
    });

    // Add listeners that trigger a re-render for all other controls
    document.getElementById('pub-type-select').addEventListener('change', displayPublications);
    document.getElementById('pub-search-input').addEventListener('input', displayPublications);
    document.getElementById('pub-sort-order').addEventListener('change', displayPublications);
    document.getElementById('pub-rows-per-page').addEventListener('change', displayPublications);
    
    // Initial data load when the page is ready
    loadAllPublications();
});