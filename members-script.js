// Import the Sanity client and other necessary libraries
import { createClient } from 'https://esm.sh/@sanity/client';
import imageUrlBuilder from 'https://esm.sh/@sanity/image-url';
import { toHTML } from 'https://esm.sh/@portabletext/to-html';

// Configure the Sanity client
const client = createClient({
  projectId: 'fd0kvo22', // Your Project ID
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-06-28',
});

// Configure the image URL builder
const builder = imageUrlBuilder(client);
function urlFor(source) {
  return builder.image(source);
}

// --- Function to load ALL Team Members ---
async function loadTeamMembers() {
    try {
        // Fetch all team members and sort by the 'order' field
        const query = `*[_type == "teamMember"] | order(order asc)`;
        const members = await client.fetch(query);

        // Get the containers for each section
        const professorContainer = document.querySelector('#professor-section');
        const phdContainer = document.querySelector('#phd-section .team-grid');
        const mastersContainer = document.querySelector('#masters-section .team-grid');
        const alumniContainer = document.querySelector('#alumni-section .team-grid');

        // Clear any existing content
        if(professorContainer) professorContainer.innerHTML = '';
        if(phdContainer) phdContainer.innerHTML = '';
        if(mastersContainer) mastersContainer.innerHTML = '';
        if(alumniContainer) alumniContainer.innerHTML = '';

        // Sort members into their respective roles
        members.forEach(member => {
            const memberCard = document.createElement('div');
            memberCard.className = 'member-card';
            
            const imageUrl = member.photo ? urlFor(member.photo).width(200).height(200).url() : 'https://placehold.co/200x200/e9ecef/333?text=Photo';

            let detailsHTML = '';
            // Generate details for professors (rich text)
            if (member.role && member.role.toLowerCase().includes('professor') && member.details) {
                detailsHTML = toHTML(member.details);
            } 
            // Generate details for students
            else if (member.department || member.researchArea || member.thesisTitle) {
                detailsHTML = `
                    <div class="student-details">
                        ${member.department ? `<p><strong>Department:</strong> ${member.department}</p>` : ''}
                        ${member.researchArea ? `<p><strong>Research Area:</strong> ${member.researchArea}</p>` : ''}
                        ${member.thesisTitle ? `<p><strong>Thesis:</strong> ${member.thesisTitle}</p>` : ''}
                    </div>
                `;
            }

            // Create the card's inner HTML with a details container
            memberCard.innerHTML = `
                <div class="member-summary">
                    <img src="${imageUrl}" alt="Photo of ${member.name}" class="member-photo">
                    <div class="member-info">
                        <h3 class="member-name">${member.name}</h3>
                        <p class="member-role">${member.role}</p>
                        ${member.email ? `<a href="mailto:${member.email}" class="member-email">${member.email}</a>` : ''}
                    </div>
                </div>
                <div class="member-details-content">
                    ${detailsHTML}
                </div>
                <button class="expand-btn">Read More</button>
            `;
            
            // Place the card in the correct container
            if (member.isAlumni) {
                alumniContainer.appendChild(memberCard);
            } else if (member.role && member.role.toLowerCase().includes('professor')) {
                professorContainer.appendChild(memberCard); // Professors get a special, larger card
                memberCard.classList.add('professor-card');
            } else if (member.role && member.role.toLowerCase().includes('ph.d')) {
                phdContainer.appendChild(memberCard);
            } else if (member.role && member.role.toLowerCase().includes('master')) {
                mastersContainer.appendChild(memberCard);
            } 
        });

        // Add event listeners to all the new "Read More" buttons
        document.querySelectorAll('.expand-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const card = e.target.closest('.member-card');
                card.classList.toggle('expanded');
                if (card.classList.contains('expanded')) {
                    e.target.textContent = 'Show Less';
                } else {
                    e.target.textContent = 'Read More';
                }
            });
        });

    } catch (error) {
        console.error('Error fetching team members:', error);
    }
}

// --- Run the load function when the page loads ---
loadTeamMembers();