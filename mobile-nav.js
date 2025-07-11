document.addEventListener('DOMContentLoaded', () => {
    const hamburgerButton = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const closeButton = document.querySelector('.mobile-nav-close');

    if (hamburgerButton && mobileNav) {
        hamburgerButton.addEventListener('click', () => {
            // Toggle the 'is-active' class on both the button and the menu
            hamburgerButton.classList.toggle('is-active');
            mobileNav.classList.toggle('is-active');
        });
    }
    if (closeButton && hamburgerButton && mobileNav) {
        closeButton.addEventListener('click', () => {
            hamburgerButton.classList.remove('is-active');
            mobileNav.classList.remove('is-active');
        });
    }
});
