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
  const container = document.querySelector('.pillars-container');
  if (!container) return;

  try {
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading research areas...</p>';

    const query = `*[_type == "researchArea"] | order(order asc)`;
    const areas = await client.fetch(query);
    
    container.innerHTML = '';

    if (areas.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">No research areas have been added yet.</p>';
        return;
    }

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
    container.innerHTML = '<p style="text-align: center; color: red; padding: 2rem;">Could not load research areas. Please try again later.</p>';
  }
}


// --- Function to load Projects table ---
async function loadProjects() {
  const tableBody = document.querySelector('.projects-table tbody');
  if (!tableBody) return;

  try {
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Loading projects...</td></tr>';

    const query = `*[_type == "project"] | order(order asc)`;
    const projects = await client.fetch(query);

    tableBody.innerHTML = '';

    if (projects.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No projects have been added yet.</td></tr>';
        return;
    }

    projects.forEach((project) => {
      const row = document.createElement('tr');
      // MOBILE FIX: Add data-label attributes to table cells for responsive CSS
      row.innerHTML = `
        <td data-label="No.">${project.order || ''}</td>
        <td data-label="Project Title">${project.title || ''}</td>
        <td data-label="Funding Agency">${project.fundingAgency || ''}</td>
        <td data-label="Duration">${project.duration || ''}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error)
{
    console.error('Error fetching projects:', error);
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red; padding: 2rem;">Could not load projects. Please try again later.</td></tr>';
  }
}

// --- Run all load functions when the page loads ---
loadResearchAreas();
loadProjects();