// facilities-script.js — render "Facility" sections with inline equipment lists

// 1) Imports & Sanity client
import { createClient } from 'https://esm.sh/@sanity/client';
import imageUrlBuilder from 'https://esm.sh/@sanity/image-url';

const client = createClient({
  projectId: 'fd0kvo22',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-07-21',
});

const builder = imageUrlBuilder(client);
const urlFor = (src) => builder.image(src);

// 2) Small helpers
const el = (sel) =>
  document.querySelector(sel) ||
  document.querySelector('.facility-grid'); // fallback if your HTML still uses old class

const esc = (s) =>
  (s ?? '').toString().replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[m]));

const anchorId = (title, slug) =>
  (slug?.current ??
    (title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-'))
  || 'facility';

// 3) Render one equipment item
function equipmentItemHTML(it) {
  const name = esc(it?.name) || 'Untitled equipment';
  const desc = esc(it?.description) || '';
  const imgUrl = it?.image
    ? urlFor(it.image).width(720).auto('format').url()
    : 'https://placehold.co/720x480/e9ecef/667085?text=No+Image';

  return `
    <figure class="equipment-item">
      <img class="equipment-photo" src="${imgUrl}" alt="${name}">
      <figcaption class="equipment-meta">
        <h4 class="equipment-name">${name}</h4>
        ${desc ? `<p class="equipment-desc">${desc}</p>` : ''}
      </figcaption>
    </figure>
  `;
}

// 4) Main load function
async function loadFacilities() {
  const container =
    el('.facilities-container') || el('.facilities'); // any of these is fine
  if (!container) return;

  container.innerHTML =
    '<p style="text-align:center;padding:2rem;">Loading facilities…</p>';

  try {
    // Pull all facilities with their equipment
    const query = `*[_type == "facility"]|order(order asc, title asc){
      _id, title, slug, intro, order,
      equipment[]{name, description, image, order}
    }`;
    const facilities = await client.fetch(query);

    if (!facilities?.length) {
      container.innerHTML =
        '<p style="text-align:center;padding:2rem;">No facilities added yet.</p>';
      return;
    }

    // Build the page: one section per facility
    const html = facilities
      .map((f) => {
        const title = esc(f?.title) || 'Untitled Facility';
        const intro = esc(f?.intro || '');
        const id = anchorId(f?.title, f?.slug);

        const items = (f?.equipment || [])
          .slice()
          .sort((a, b) => {
            const ao = a?.order ?? Number.MAX_SAFE_INTEGER;
            const bo = b?.order ?? Number.MAX_SAFE_INTEGER;
            if (ao !== bo) return ao - bo;
            return (a?.name || '').localeCompare(b?.name || '');
          });

        const itemsHTML =
          items.length > 0
            ? items.map(equipmentItemHTML).join('')
            : '<p class="facility-empty">No equipment listed yet.</p>';

        return `
          <section class="facility-section" id="${id}">
            <header class="facility-header">
              <h2 class="facility-title">${title}</h2>
              ${intro ? `<p class="facility-intro">${intro}</p>` : ''}
            </header>
            <div class="equipment-grid">
              ${itemsHTML}
            </div>
          </section>
        `;
      })
      .join('');

    container.innerHTML = html;
  } catch (err) {
    console.error('Error loading facilities:', err);
    container.innerHTML =
      '<p style="text-align:center;color:red;padding:2rem;">Could not load facilities. Please try again later.</p>';
  }
}

// 5) Kickoff
document.addEventListener('DOMContentLoaded', loadFacilities);
