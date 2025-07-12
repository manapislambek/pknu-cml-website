/**
 * This script handles loading reusable components (like the nav and footer)
 * into the page. It also initializes the event listeners for the mobile navigation.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Load navigation and footer components
    loadNav();
    loadFooter();
});

/**
 * Fetches nav.html, injects it into the header, and then initializes 
 * the event listeners for the mobile navigation.
 */
async function loadNav() {
    // Find the header element on the current page
    const headerElement = document.querySelector(".main-header");
    if (!headerElement) return;

    try {
        const response = await fetch('nav.html');
        if (!response.ok) {
            throw new Error(`Nav fetch failed: ${response.statusText}`);
        }
        const navHtml = await response.text();
        headerElement.insertAdjacentHTML('afterbegin', navHtml);

        // Now that the HTML is definitely in the DOM, find the elements and add listeners.
        const hamburgerButton = document.querySelector('.hamburger-menu');
        const mobileNav = document.querySelector('.mobile-nav');
        const closeButton = document.querySelector('.mobile-nav-close');

        if (hamburgerButton && mobileNav) {
            // Hamburger button opens the menu
            hamburgerButton.addEventListener('click', () => {
                hamburgerButton.classList.add('is-active');
                mobileNav.classList.add('is-active');
            });
        }
        
        if (closeButton && mobileNav) {
            // Close button closes the menu
            closeButton.addEventListener('click', () => {
                hamburgerButton.classList.remove('is-active');
                mobileNav.classList.remove('is-active');
            });
        }

    } catch (error) {
        console.error("Could not load nav component:", error);
        headerElement.insertAdjacentHTML('afterbegin', `<p style="text-align:center; color:red;">Failed to load navigation.</p>`);
    }
}

/**
 * Fetches footer.html, injects it, and updates the copyright year.
 */
async function loadFooter() {
    const footerElement = document.querySelector("footer.main-footer");
    if (!footerElement) return;

    try {
        const response = await fetch('footer.html');
        if (!response.ok) {
            throw new Error(`Footer fetch failed: ${response.statusText}`);
        }
        const footerHtml = await response.text();
        footerElement.innerHTML = footerHtml;

        // Find and update the year within the newly added footer
        const yearSpan = footerElement.querySelector('#copyright-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    } catch (error) {
        console.error("Could not load footer component:", error);
        footerElement.innerHTML = `<p style="text-align:center; color:red;">Failed to load footer.</p>`;
    }
}