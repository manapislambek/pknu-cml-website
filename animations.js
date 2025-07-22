// animations.js

// We've wrapped the logic in an exported function.
export function initializeAnimations() {
    const animatedElements = document.querySelectorAll('.fade-in-element');

    if (animatedElements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
    });

    animatedElements.forEach(element => {
        observer.observe(element);
    });
}