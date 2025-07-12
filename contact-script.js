// Import the Sanity client and other necessary libraries
import { createClient } from 'https://esm.sh/@sanity/client';
import imageUrlBuilder from 'https://esm.sh/@sanity/image-url';
import { toHTML } from 'https://esm.sh/@portabletext/to-html';

// --- Global State for Notice Board ---
let allAnnouncements = [];
let currentPage = 1;
let rowsPerPage = 10;
let isLoadingAnnouncements = true;

// --- Tab Switching Logic ---
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
});


// Configure the Sanity client
const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-06-28',
});

// Configure the image URL builder
const builder = imageUrlBuilder(client);
function urlFor(source) {
  return builder.image(source);
}

// --- Function to load Contact Information ---
async function loadContactInfo() {
    const addressEl = document.getElementById('contact-address');
    const emailEl = document.getElementById('contact-email');
    const phoneEl = document.getElementById('contact-phone');

    if (!addressEl || !emailEl || !phoneEl) return;

    try {
        // Fetch the single contact info document
        const query = `*[_type == "contactInfo"][0]`;
        const info = await client.fetch(query);

        if (info) {
            addressEl.textContent = info.address || 'Not available';
            emailEl.textContent = info.email || 'Not available';
            emailEl.href = `mailto:${info.email || ''}`;
            phoneEl.textContent = info.phone || 'Not available';
        } else {
            addressEl.textContent = 'Contact information has not been set up yet.';
            emailEl.textContent = '';
            phoneEl.textContent = '';
        }

    } catch (error) {
        console.error('Error fetching contact info:', error);
        document.getElementById('contact-details-container').innerHTML = 
            '<p style="color: red;">Could not load contact information.</p>';
    }
}


// --- Function to Display Announcements ---
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
        const date = new Date(item.publishedAt).toLocaleDateString('en-CA');
        announcementEl.innerHTML = `
            <div class="announcement-header">
                <span class="announcement-number">${startIndex + index + 1}</span>
                <span class="announcement-title">${item.title}</span>
                <span class="announcement-date">${date}</span>
            </div>
            <div class="announcement-body"><div class="announcement-body-content portable-text-content">${toHTML(item.body)}</div></div>
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

// --- Function to setup Pagination Controls ---
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


// --- Function to load ALL Announcements initially ---
async function initialLoadAnnouncements() {
    const container = document.querySelector('.announcements-list');
    try {
        displayAnnouncements(); 
        
        const query = `*[_type == "announcement"] | order(publishedAt desc)`;
        allAnnouncements = await client.fetch(query);
        isLoadingAnnouncements = false;
        displayAnnouncements();
    } catch (error) {
        console.error('Error fetching announcements:', error);
        isLoadingAnnouncements = false;
        if(container) container.innerHTML = '<p style="text-align: center; color: red; padding: 2rem;">Could not load announcements.</p>';
    }
}

// --- Function to load Gallery Images ---
async function loadGalleryImages() {
    const container = document.querySelector('.photo-grid');
    if(!container) return;
    
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


// --- Run all initial load functions ---
loadContactInfo();
initialLoadAnnouncements();
loadGalleryImages();
