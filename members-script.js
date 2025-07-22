import { createClient } from 'https://esm.sh/@sanity/client';
import imageUrlBuilder from 'https://esm.sh/@sanity/image-url';
import { toHTML } from 'https://esm.sh/@portabletext/to-html';
import { initializeAnimations } from './animations.js';

// --- Sanity Client & Helpers ---
const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-07-21',
});
const builder = imageUrlBuilder(client);
function urlFor(source) { return builder.image(source); }

// --- Main Data Loading Function ---
async function loadTeamMembers() {
    const professorContainer = document.querySelector('#professor-section');
    const postdocsContainer = document.querySelector('#postdocs-section .team-grid');
    const phdContainer = document.querySelector('#phd-section .team-grid');
    const mastersContainer = document.querySelector('#masters-section .team-grid');
    const undergradContainer = document.querySelector('#undergraduate-section .team-grid');
    const alumniContainer = document.querySelector('#alumni-section .team-grid');

    try {
        const query = `*[_type == "teamMember"] | order(order asc)`;
        const members = await client.fetch(query);

        // Clear all containers
        [professorContainer, postdocsContainer, phdContainer, mastersContainer, undergradContainer, alumniContainer].forEach(c => {
            if (c) c.innerHTML = '';
        });

        if (members.length === 0) { return; }

        members.forEach(member => {
            const memberCard = document.createElement('div');
            memberCard.className = 'member-card';
            const imageUrl = member.photo ? urlFor(member.photo).width(200).height(200).url() : 'https://placehold.co/200x200/e9ecef/333?text=Photo';
            
            let detailsHTML = '';
            if (member.role?.toLowerCase().includes('professor') && member.details) {
                detailsHTML = toHTML(member.details);
            } else if (member.department || member.researchArea || member.thesisTitle) {
                detailsHTML = `<div class="student-details">${member.department ? `<p><strong>Department:</strong> ${member.department}</p>` : ''}${member.researchArea ? `<p><strong>Research Area:</strong> ${member.researchArea}</p>` : ''}${member.thesisTitle ? `<p><strong>Thesis:</strong> ${member.thesisTitle}</p>` : ''}</div>`;
            }

            memberCard.innerHTML = `<div class="member-summary"><img src="${imageUrl}" alt="Photo of ${member.name}" class="member-photo"><div class="member-info"><h3 class="member-name">${member.name}</h3><p class="member-role">${member.role}</p>${member.email ? `<a href="mailto:${member.email}" class="member-email">${member.email}</a>` : ''}</div></div><div class="member-details-content portable-text-content">${detailsHTML}</div><button class="expand-btn">Read More</button>`;
            
            if (member.isAlumni) {
                if(alumniContainer) alumniContainer.appendChild(memberCard);
            } else if (member.role?.toLowerCase().includes('professor')) {
                if(professorContainer) professorContainer.appendChild(memberCard);
                memberCard.classList.add('professor-card');
            } else if (member.role?.toLowerCase().includes('postdoc')) {
                if(postdocsContainer) postdocsContainer.appendChild(memberCard);
            } else if (member.role?.toLowerCase().includes('ph.d')) {
                if(phdContainer) phdContainer.appendChild(memberCard);
            } else if (member.role?.toLowerCase().includes('master')) {
                if(mastersContainer) mastersContainer.appendChild(memberCard);
            } else if (member.role?.toLowerCase().includes('undergraduate')) {
                if(undergradContainer) undergradContainer.appendChild(memberCard);
            }
        });

        // Hide any sections that are still empty
        [postdocsContainer, phdContainer, mastersContainer, undergradContainer, alumniContainer].forEach(container => {
            if (container && container.children.length === 0) {
                container.parentElement.style.display = 'none';
            }
        });

        document.querySelectorAll('.expand-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const card = e.target.closest('.member-card');
                card.classList.toggle('expanded');
                e.target.textContent = card.classList.contains('expanded') ? 'Show Less' : 'Read More';
            });
        });
    } catch (error) {
        console.error('Error fetching team members:', error);
    }
}

// --- Page Initialization & Tab Controls ---

function handleTabSwitch() {
    const hash = window.location.hash;
    let targetTab = 'professor'; // Default tab
    if (hash === '#students') {
        targetTab = 'students';
    } else if (hash === '#alumni') {
        targetTab = 'alumni';
    }
    const targetButton = document.querySelector(`.tab-button[data-tab="${targetTab}"]`);
    if (targetButton) targetButton.click();
}

async function initMembersPage() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    window.addEventListener('hashchange', handleTabSwitch);
    handleTabSwitch(); // Run on initial load

    await loadTeamMembers();
    initializeAnimations();
}

initMembersPage();