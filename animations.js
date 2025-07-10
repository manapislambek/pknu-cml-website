// This script handles the on-scroll fade-in animations

document.addEventListener('DOMContentLoaded', () => {
    // Select all elements that we want to animate
    const animatedElements = document.querySelectorAll('.fade-in-element');

    // Set up the Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // If the element is on screen (intersecting)
            if (entry.isIntersecting) {
                // Add the 'is-visible' class to trigger the animation
                entry.target.classList.add('is-visible');
                // We only want the animation to play once, so we can unobserve it
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15, // UPDATED: Trigger when 15% of the element is visible
        rootMargin: "0px 0px -50px 0px" // Start loading when element is 50px from bottom of viewport
    });

    // Tell the observer to watch each of our animated elements
    animatedElements.forEach(element => {
        observer.observe(element);
    });
});
