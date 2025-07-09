// Import the Sanity client library from a more reliable CDN
import { createClient } from 'https://esm.sh/@sanity/client';

// Configure the client with your project's details
const client = createClient({
  projectId: 'fd0kvo22', // Your Project ID from sanity.json
  dataset: 'production',    // Usually 'production'
  useCdn: true,             // `false` if you want to ensure fresh data
  apiVersion: '2024-06-27', // Use a recent date
});


// --- Function to load Research Area cards ---
async function loadResearchAreas() {
  try {
    const query = `*[_type == "researchArea"] | order(order asc)`;
    const areas = await client.fetch(query);
    console.log('Research Areas data fetched from Sanity:', areas);

    const container = document.querySelector('.pillars-container');
    if (!container) return;

    container.innerHTML = ''; // Clear static content

    areas.forEach(area => {
      const card = document.createElement('div');
      card.className = 'pillar-card';
      card.innerHTML = `
        <h3>${area.title || ''}</h3>
        <p>${area.description || ''}</p>
      `;
      container.appendChild(card);
    });

  } catch (error) {
    console.error('Error fetching research areas:', error);
  }
}


// --- Function to load Projects table ---
async function loadProjects() {
  try {
    const query = `*[_type == "project"] | order(order asc)`;
    const projects = await client.fetch(query);
    console.log('Projects data fetched from Sanity:', projects);

    const tableBody = document.querySelector('.projects-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Clear static content

    projects.forEach((project) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${project.order || ''}</td>
        <td>${project.title || ''}</td>
        <td>${project.fundingAgency || ''}</td>
        <td>${project.duration || ''}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
}

// --- Run all load functions when the page loads ---
loadResearchAreas();
loadProjects();
