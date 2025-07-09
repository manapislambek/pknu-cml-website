// Import the Sanity client and other necessary libraries
import { createClient } from 'https://esm.sh/@sanity/client';
import imageUrlBuilder from 'https://esm.sh/@sanity/image-url';

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

// --- Function to load ALL Facility Items ---
async function loadFacilityItems() {
    try {
        const query = `*[_type == "facilityItem"] | order(order asc)`;
        const items = await client.fetch(query);

        const container = document.querySelector('.facility-grid');
        if(!container) return;

        container.innerHTML = ''; // Clear any placeholders

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'facility-card';
            
            const imageUrl = item.image ? urlFor(item.image).width(400).url() : 'https://placehold.co/400x250/e9ecef/333?text=Image';

            card.innerHTML = `
                <img src="${imageUrl}" alt="Image of ${item.name}" class="facility-photo">
                <div class="facility-info">
                    <h3 class="facility-name">${item.name}</h3>
                    <p class="facility-description">${item.description}</p>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching facility items:', error);
    }
}

// --- Run the load function when the page loads ---
loadFacilityItems();
