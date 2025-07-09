document.addEventListener('DOMContentLoaded', () => {
    // Find all links with the 'smooth-scroll' class
    const scrollLinks = document.querySelectorAll('.smooth-scroll');

    scrollLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Prevent the default jump-link behavior
            e.preventDefault();

            // Get the target element's ID from the link's href attribute
            const id = link.getAttribute('href');
            const targetElement = document.querySelector(id);

            // If the target element exists, scroll to it smoothly
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
