/**
 * This script handles loading reusable components (like the nav and footer)
 * into the page. It also initializes the event listeners for the mobile navigation.
 */

document.addEventListener("DOMContentLoaded", async () => {
    const headerElement = document.querySelector("header.page-header, header.hero-section");
    const footerElement = document.querySelector("footer.main-footer");

    if (headerElement) {
        await loadComponent('nav.html', headerElement);
        initializeNavListeners(); 
    }

    if (footerElement) {
        await loadComponent('footer.html', footerElement);
        const yearSpan = document.getElementById('copyright-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    }
});


async function loadComponent(url, element) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const data = await response.text();
        
        if (element.tagName === 'HEADER') {
             element.insertAdjacentHTML('afterbegin', data);
        } else {
             element.innerHTML = data;
        }
    } catch (error) {
        console.error(`Could not load component from ${url}:`, error);
        element.innerHTML = `<p style="text-align:center; color:red;">Failed to load content.</p>`;
    }
}

function initializeNavListeners() {
    const hamburgerButton = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    
    // FIX 2: The event listener for the separate close button has been removed.
    // The hamburger button now toggles the menu open and closed.
    if (hamburgerButton && mobileNav) {
        hamburgerButton.addEventListener('click', () => {
            hamburgerButton.classList.toggle('is-active');
            mobileNav.classList.toggle('is-active');
        });
    }
}