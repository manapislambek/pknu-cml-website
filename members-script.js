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
    // Get the containers for each section
    const professorContainer = document.querySelector('#professor-section');
    const phdContainer = document.querySelector('#phd-section .team-grid');
    const mastersContainer = document.querySelector('#masters-section .team-grid');
    const undergradContainer = document.querySelector('#undergraduate-section .team-grid');
    const alumniContainer = document.querySelector('#alumni-section .team-grid');

    // A helper function to set the loading/error state for a container
    const setContainerState = (container, message) => {
        if (container) container.innerHTML = `<p style="text-align: center; padding: 2rem;">${message}</p>`;
    };
    
    // A helper function to set the error state for a container
    const setContainerError = (container, message) => {
        if (container) container.innerHTML = `<p style="text-align: center; color: red; padding: 2rem;">${message}</p>`;
    };

    try {
        // 1. Show loading messages in all relevant containers
        setContainerState(professorContainer, 'Loading professor...');
        setContainerState(phdContainer, 'Loading Ph.D. students...');
        setContainerState(mastersContainer, 'Loading Master\'s students...');
        setContainerState(undergradContainer, 'Loading undergraduate students...');
        setContainerState(alumniContainer, 'Loading alumni...');

        // Fetch all team members and sort by the 'order' field
        const query = `*[_type == "teamMember"] | order(order asc)`;
        const members = await client.fetch(query);

        // 2. Clear all containers before populating
        if(professorContainer) professorContainer.innerHTML = '';
        if(phdContainer) phdContainer.innerHTML = '';
        if(mastersContainer) mastersContainer.innerHTML = '';
        if(undergradContainer) undergradContainer.innerHTML = '';
        if(alumniContainer) alumniContainer.innerHTML = '';

        if (members.length === 0) {
            setContainerState(professorContainer, 'No team members have been added yet.');
            // Hide the other section titles if there are no members
            document.querySelector('#phd-section h2').style.display = 'none';
            document.querySelector('#masters-section h2').style.display = 'none';
            document.querySelector('#undergraduate-section h2').style.display = 'none';
            document.querySelector('#alumni-section h2').style.display = 'none';
            return;
        }

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
                if(alumniContainer) alumniContainer.appendChild(memberCard);
            } else if (member.role && member.role.toLowerCase().includes('professor')) {
                if(professorContainer) professorContainer.appendChild(memberCard);
                memberCard.classList.add('professor-card');
            } else if (member.role && member.role.toLowerCase().includes('ph.d')) {
                if(phdContainer) phdContainer.appendChild(memberCard);
            } else if (member.role && member.role.toLowerCase().includes('master')) {
                if(mastersContainer) mastersContainer.appendChild(memberCard);
            } else if (member.role && member.role.toLowerCase().includes('undergraduate')) {
                if(undergradContainer) undergradContainer.appendChild(memberCard);
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
        // 3. Show a user-friendly error message if something goes wrong
        setContainerError(professorContainer, 'Could not load team members. Please try again later.');
        // Hide other sections on error
        if (phdContainer) phdContainer.parentElement.style.display = 'none';
        if (mastersContainer) mastersContainer.parentElement.style.display = 'none';
        if (undergradContainer) undergradContainer.parentElement.style.display = 'none';
        if (alumniContainer) alumniContainer.parentElement.style.display = 'none';
    }
}

// --- Run the load function when the page loads ---
loadTeamMembers();