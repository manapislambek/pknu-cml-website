document.addEventListener('DOMContentLoaded', () => {
    const hamburgerButton = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');

    if (hamburgerButton && mobileNav) {
        hamburgerButton.addEventListener('click', () => {
            // Toggle the 'is-active' class on both the button and the menu
            hamburgerButton.classList.toggle('is-active');
            mobileNav.classList.toggle('is-active');
        });
    }
});
