import { createClient } from 'https://esm.sh/@sanity/client@6.15.10';
import { toHTML } from 'https://esm.sh/@portabletext/to-html@2.0.13';
import { initializeAnimations } from './animations.js';

const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-07-21',
});

// ---------- Utilities ----------
function safeYear(dateStr) {
  if (!dateStr) return '';
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? '' : new Date(t).getFullYear();
}

function renderHomePubCard(pub) {
  const year = safeYear(pub.publicationDate);
  const pages = (pub.pages || '').replace(/--/g, '–');
  const volIss = [pub.volume || '', pub.issue ? `(${pub.issue})` : ''].join('').trim();
  const journalBits = [
    pub.journalName ? `<em>${pub.journalName}</em>` : '',
    volIss,
    pages,
  ].filter(Boolean).join(' · ');

  const title = pub.link
    ? `<a href="${pub.link}" target="_blank" rel="noopener noreferrer">${pub.title || ''}</a>`
    : (pub.title || '');

  return `
    <article class="home-pub-card fade-in-element">
      <!-- Line 1: Title -->
      <h4 class="home-pub-title">${title}</h4>

      <!-- Line 2: Authors (Year) -->
      <div class="home-pub-authors">${pub.authors || ''} ${year ? `<span class="home-pub-year">(${year})</span>` : ''}</div>

      <!-- Line 3: Journal · Volume(Issue) · Pages + CTA on the right -->
      <div class="home-pub-journal-row">
        <div class="home-pub-journal">${journalBits}</div>
        ${pub.link ? `<div class="home-pub-cta"><a href="${pub.link}" target="_blank" rel="noopener noreferrer">Read Paper →</a></div>` : ''}
      </div>
    </article>
  `;
}

// ---------- Section shells ----------
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
      // NOTE: added .home-pubs class so the 3-line CSS applies
      publicationsContainer.innerHTML = `<h2 class="fade-in-element">Recent Publications</h2><div class="publications-list home-pubs"></div><div class="view-all-link fade-in-element"><a href="publications.html">View all publications &rarr;</a></div>`;
    }
    if (newsContainer) {
      newsContainer.innerHTML = `<h2 class="fade-in-element">Latest News</h2><div class="news-grid"></div><div class="view-all-link fade-in-element"><a href="contact.html">View all news &rarr;</a></div>`;
    }
  } catch (error) {
    console.error('Homepage content ERROR:', error);
  }
}

// ---------- Research Highlights ----------
async function loadResearchHighlights() {
  const sectionContainer = document.querySelector('#research-highlights');
  const gridContainer = document.querySelector('#research-highlights .research-grid');
  if (!gridContainer || !sectionContainer) return;

  try {
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
    console.error('Error fetching research highlights:', error);
  }
}

// ---------- Recent Publications (3-line stacked) ----------
async function loadRecentPublications() {
  const container = document.querySelector('#recent-publications .publications-list');
  if (!container) return;

  try {
    const query = `*[_type == "publication"]{title, authors, publicationDate, journalName, volume, issue, pages, link} | order(publicationDate desc) [0...3]`;
    const publications = await client.fetch(query);

    if (!publications || publications.length === 0) {
      container.innerHTML = '<p>No recent publications to show.</p>';
      return;
    }

    container.innerHTML = publications.map(renderHomePubCard).join('');
  } catch (error) {
    console.error('Error fetching recent publications:', error);
    container.innerHTML = '<p>Could not load recent publications.</p>';
  }
}

// ---------- Latest News ----------
async function loadLatestNews() {
  const container = document.querySelector('#latest-news .news-grid');
  if (!container) return;
  try {
    const query = `*[_type == "announcement"] { _id, title, publishedAt } | order(publishedAt desc) [0...3]`;
    const announcements = await client.fetch(query);
    if (!announcements || announcements.length === 0) return;

    announcements.forEach(item => {
      const cardLink = document.createElement('a');
      cardLink.href = `contact.html?announcement=${item._id}`;
      cardLink.className = 'news-card-link';

      const date = new Date(item.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      cardLink.innerHTML = `
        <div class="news-card fade-in-element">
          <p class="news-date">${date}</p>
          <h3 class="news-title">${item.title}</h3>
        </div>
      `;
      container.appendChild(cardLink);
    });
  } catch (error) {
    console.error('Error fetching latest news:', error);
  }
}

// ---------- Init ----------
async function initializeHomepage() {
  await loadHomepageContent();
  await Promise.all([
    loadResearchHighlights(),
    loadRecentPublications(),
    loadLatestNews(),
  ]);
  initializeAnimations();
}

initializeHomepage();