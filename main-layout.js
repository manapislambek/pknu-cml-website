/**
 * This script handles loading reusable components (like the nav and footer)
 * into the page. It also initializes the event listeners for the mobile navigation.
 * This replaces the need for mobile-nav.js.
 */

// --- Main execution logic runs after the initial HTML document has been loaded ---
document.addEventListener("DOMContentLoaded", async () => {
    // Find the header and footer elements on the current page
    const headerElement = document.querySelector("header.page-header, header.hero-section");
    const footerElement = document.querySelector("footer.main-footer");

    // Load the navigation if a header element exists
    if (headerElement) {
        await loadComponent('nav.html', headerElement);
        // After the nav HTML is loaded, initialize its interactive elements
        initializeNavListeners(); 
    }

    // Load the footer if a footer element exists
    if (footerElement) {
        await loadComponent('footer.html', footerElement);
        // After the footer HTML is loaded, set the copyright year
        const yearSpan = document.getElementById('copyright-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    }
});


/**
 * Fetches HTML content from a URL and injects it into a specified element.
 * @param {string} url The URL of the HTML component to load (e.g., 'nav.html').
 * @param {HTMLElement} element The container element to inject the HTML into.
 */
async function loadComponent(url, element) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const data = await response.text();
        
        // For the header, we insert the nav as the first child.
        // For the footer, we replace its entire content.
        if (element.tagName === 'HEADER') {
             element.insertAdjacentHTML('afterbegin', data);
        } else {
             element.innerHTML = data;
        }
    } catch (error) {
        console.error(`Could not load component from ${url}:`, error);
        // Display an error message inside the element if loading fails
        element.innerHTML = `<p style="text-align:center; color:red;">Failed to load content.</p>`;
    }
}

/**
 * Initializes the event listeners for the mobile hamburger menu.
 * This function should be called only after the nav.html has been loaded.
 */
function initializeNavListeners() {
    const hamburgerButton = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const closeButton = document.querySelector('.mobile-nav-close');

    if (hamburgerButton && mobileNav) {
        hamburgerButton.addEventListener('click', () => {
            hamburgerButton.classList.toggle('is-active');
            mobileNav.classList.toggle('is-active');
        });
    }
    // The close button is inside the mobile nav, so we can check for it here too
    if (closeButton && mobileNav) {
        closeButton.addEventListener('click', () => {
            // Ensure the hamburger also de-activates
            if(hamburgerButton) hamburgerButton.classList.remove('is-active');
            mobileNav.classList.remove('is-active');
        });
    }
}
