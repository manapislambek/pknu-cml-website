// script.js (Complete Version)

import { createClient } from 'https://esm.sh/@sanity/client';
import { toHTML } from 'https://esm.sh/@portabletext/to-html';
import { initializeAnimations } from './animations.js';

const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-07-21',
});

// Creates the main section containers and titles
async function loadHomepageContent() {
    const welcomeContainer = document.querySelector('#welcome-section');
    const researchContainer = document.querySelector('#research-highlights');
    const publicationsContainer = document.querySelector('#recent-publications');
    const newsContainer = document.querySelector('#latest-news');

    try {
        const query = `*[_type == "homepage"][0]`;
        const content = await client.fetch(query);

        if (welcomeContainer) {
            const welcomeText = (content && content.welcomeText) ? toHTML(content.welcomeText) : '';
            welcomeContainer.innerHTML = `<h2 class="fade-in-element">Welcome to Our Laboratory</h2><div class="welcome-text-home fade-in-element">${welcomeText}</div>`;
        }
        if (researchContainer) {
            researchContainer.innerHTML = `<h2 class="fade-in-element">Research Highlights</h2><div class="research-grid"></div>`;
        }
        if (publicationsContainer) {
            publicationsContainer.innerHTML = `<h2 class="fade-in-element">Recent Publications</h2><div class="publications-list"></div><div class="view-all-link fade-in-element"><a href="publications.html">View all publications &rarr;</a></div>`;
        }
        if (newsContainer) {
            newsContainer.innerHTML = `<h2 class="fade-in-element">Latest News</h2><div class="news-grid"></div><div class="view-all-link fade-in-element"><a href="contact.html">View all news &rarr;</a></div>`;
        }
    } catch (error) { 
        console.error("Homepage content ERROR:", error); 
    }
}

// Fetches and displays the Research Highlights
async function loadResearchHighlights() {
    const sectionContainer = document.querySelector('#research-highlights');
    const gridContainer = document.querySelector('#research-highlights .research-grid');
    if (!gridContainer || !sectionContainer) return;

    try {
        // The query now includes 'order'
        const query = `*[_type == "researchArea"] { title, order } | order(order asc)`;
        const areas = await client.fetch(query);
        if (!areas || areas.length === 0) return;
        
        gridContainer.innerHTML = ''; 

        areas.forEach(area => {
            const card = document.createElement('div');
            card.className = 'research-item-card fade-in-element';
            card.innerHTML = `<h3>${area.title}</h3>`;
            gridContainer.appendChild(card);
        });

        const oldLink = sectionContainer.querySelector('.view-all-link');
        if (oldLink) oldLink.remove();

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'view-all-link fade-in-element';
        buttonContainer.innerHTML = `<a href="research.html">View research details &rarr;</a>`;
        sectionContainer.appendChild(buttonContainer);
    } catch (error) { 
        console.error("Error fetching research highlights:", error); 
    }
}

// Fetches and displays the 3 most recent publications
async function loadRecentPublications() {
    const container = document.querySelector('#recent-publications .publications-list');
    if (!container) return;
    try {
        const query = `*[_type == "publication"]{title, authors, publicationDate, journalName, volume, issue, pages, link} | order(publicationDate desc) [0...3]`;
        const publications = await client.fetch(query);

        if (!publications || publications.length === 0) {
            container.innerHTML = '<p>No recent publications to show.</p>';
            return;
        };

        const formatNumbers = (vol, iss, pag) => {
            let parts = [];
            if (vol && iss) parts.push(`${vol}(${iss})`);
            else if (vol) parts.push(vol);
            if (pag) parts.push(pag);
            return parts.join(', ');
        };
        
        publications.forEach(pub => {
            const item = document.createElement('div');
            item.className = 'publication-item hp-publication-item fade-in-element';
            const year = new Date(pub.publicationDate).getFullYear();
            const numbers = formatNumbers(pub.volume, pub.issue, pub.pages);
            
            item.innerHTML = `
              <p class="publication-meta">${pub.journalName || ''} (${year}) ${numbers}</p>
              <h3 class="publication-title">${pub.title}</h3>
              <p class="publication-authors">${pub.authors}</p>
              <div class="hp-pub-link">
                  ${pub.link ? `<a href="${pub.link}" target="_blank" rel="noopener noreferrer" class="publication-link">Read Paper &rarr;</a>` : ''}
              </div>
            `;
            container.appendChild(item);
        });
    } catch (error) { 
        console.error("Error fetching recent publications:", error);
        container.innerHTML = '<p>Could not load recent publications.</p>';
    }
}

// Fetches and displays the 3 most recent news announcements
async function loadLatestNews() {
    const container = document.querySelector('#latest-news .news-grid');
    if (!container) return;
    try {
        // Fetch the _id along with other fields
        const query = `*[_type == "announcement"] { _id, title, publishedAt } | order(publishedAt desc) [0...3]`;
        const announcements = await client.fetch(query);
        if (!announcements || announcements.length === 0) return;

        announcements.forEach(item => {
            // Create a link that wraps the card
            const cardLink = document.createElement('a');
            cardLink.href = `contact.html?announcement=${item._id}`;
            cardLink.className = 'news-card-link';

            const date = new Date(item.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            
            // The card itself is now inside the link
            cardLink.innerHTML = `
                <div class="news-card fade-in-element">
                    <p class="news-date">${date}</p>
                    <h3 class="news-title">${item.title}</h3>
                </div>
            `;
            container.appendChild(cardLink);
        });
    } catch (error) { console.error('Error fetching latest news:', error); }
}

// Main initialization function
async function initializeHomepage() {
    // 1. Create the section containers
    await loadHomepageContent();
    
    // 2. Load the content for the sections we just created
    await Promise.all([
        loadResearchHighlights(),
        loadRecentPublications(),
        loadLatestNews()
    ]);

    // 3. Initialize the animations AFTER all content is on the page
    initializeAnimations(); 
}

initializeHomepage();