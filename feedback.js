
document.addEventListener("DOMContentLoaded", function () {

    // =====================================
    // MAIN ELEMENTS
    // =====================================

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    const menuToggle = $("#menuToggle");
    const navlinks = $("#navlinks");

    // =====================================
// MOBILE BURGER MENU
// =====================================

if (menuToggle && navlinks) {

    menuToggle.setAttribute("type", "button");
    menuToggle.setAttribute("aria-expanded", "false");

    menuToggle.addEventListener("click", function () {

        const isOpen = navlinks.classList.toggle("show");

        menuToggle.setAttribute("aria-expanded", isOpen);

        // Change burger icon to close icon
        menuToggle.innerHTML = isOpen
            ? '<i class="fas fa-times"></i> Close'
            : '<i class="fas fa-bars"></i> Menu';

    });

    // Close menu after clicking a navigation link
    navlinks.querySelectorAll("a").forEach(function (link) {

        link.addEventListener("click", function () {

            navlinks.classList.remove("show");

            menuToggle.setAttribute("aria-expanded", "false");

            menuToggle.innerHTML =
                '<i class="fas fa-bars"></i> Menu';

        });

    });

    // Close menu when clicking outside
    document.addEventListener("click", function (event) {

        if (
            !menuToggle.contains(event.target) &&
            !navlinks.contains(event.target)
        ) {

            navlinks.classList.remove("show");

            menuToggle.setAttribute("aria-expanded", "false");

            menuToggle.innerHTML =
                '<i class="fas fa-bars"></i> Menu';

        }

    });

}

    const feedbackGrid = $("#feedbackGrid");
    const feedbackCount = $("#feedbackCount");
    const emptyFeedback = $("#emptyFeedback");

    const lightbox = $("#feedbackLightbox");
    const lightboxImage = $("#lightboxImage");
    const lightboxCaption = $("#lightboxCaption");

    const lightboxClose = $("#lightboxClose");
    const lightboxPrev = $("#lightboxPrev");
    const lightboxNext = $("#lightboxNext");

    let currentImageIndex = 0;

    // =====================================
    // CURRENT YEAR
    // =====================================

    const currentYear = $("#currentYear");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }


    // =====================================
    // FEEDBACK GALLERY
    // =====================================

    const feedbackImages = $$(".feedback-image");

    if (feedbackCount) {
        feedbackCount.textContent =
            `${feedbackImages.length} Feedback${feedbackImages.length === 1 ? "" : "s"}`;
    }

    if (feedbackImages.length === 0) {

        if (feedbackGrid) {
            feedbackGrid.hidden = true;
        }

        if (emptyFeedback) {
            emptyFeedback.hidden = false;
        }

    }

    // =====================================
    // IMAGE LIGHTBOX
    // =====================================

    function showImage(index) {

        if (!feedbackImages.length || !lightboxImage || !lightboxCaption) {
            return;
        }

        currentImageIndex =
            (index + feedbackImages.length) % feedbackImages.length;

        const selectedImage = feedbackImages[currentImageIndex];

        lightboxImage.src = selectedImage.src;
        lightboxImage.alt = selectedImage.alt;

        lightboxCaption.textContent =
            selectedImage.dataset.caption || "Customer Feedback";

    }

    function openLightbox(index) {

        if (!lightbox) return;

        showImage(index);

        lightbox.classList.add("active");
        lightbox.setAttribute("aria-hidden", "false");

        document.body.style.overflow = "hidden";

        if (lightboxClose) {
            lightboxClose.focus();
        }

    }

    function closeLightbox() {

        if (!lightbox) return;

        lightbox.classList.remove("active");
        lightbox.setAttribute("aria-hidden", "true");

        document.body.style.overflow = "";

    }

    // Open image when clicked

    feedbackImages.forEach((image, index) => {

        image.addEventListener("click", function () {
            openLightbox(index);
        });

    });

    // Open using expand button

    $$(".view-image-btn").forEach((button, index) => {

        button.addEventListener("click", function () {
            openLightbox(index);
        });

    });

    // Close button

    if (lightboxClose) {
        lightboxClose.addEventListener("click", closeLightbox);
    }

    // Previous image

    if (lightboxPrev) {

        lightboxPrev.addEventListener("click", function () {
            showImage(currentImageIndex - 1);
        });

    }

    // Next image

    if (lightboxNext) {

        lightboxNext.addEventListener("click", function () {
            showImage(currentImageIndex + 1);
        });

    }

    // Close when clicking outside the image

    if (lightbox) {

        lightbox.addEventListener("click", function (event) {

            if (event.target === lightbox) {
                closeLightbox();
            }

        });

    }

    // Keyboard controls

    document.addEventListener("keydown", function (event) {

        if (!lightbox || !lightbox.classList.contains("active")) {
            return;
        }

        if (event.key === "Escape") {
            closeLightbox();
        }

        if (event.key === "ArrowLeft") {
            showImage(currentImageIndex - 1);
        }

        if (event.key === "ArrowRight") {
            showImage(currentImageIndex + 1);
        }

    });

    // =====================================
    // SCROLL REVEAL ANIMATIONS
    // =====================================

    if ("IntersectionObserver" in window) {

        const revealSections = [
            ".feedback-intro",
            ".gallery-heading",
            ".feedback-cta-content",
            ".feedback-closing"
        ];

        const revealCards = [
            ".feedback-card"
        ];

        const observer = new IntersectionObserver(
            function (entries, observer) {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("show");

                        observer.unobserve(entry.target);

                    }

                });

            },
            {
                threshold: 0.12
            }
        );

        revealSections.forEach(selector => {

            $$(selector).forEach(element => {

                element.classList.add("feedback-reveal");

                observer.observe(element);

            });

        });

        revealCards.forEach(selector => {

            $$(selector).forEach((element, index) => {

                element.classList.add("feedback-card-reveal");

                element.style.transitionDelay =
                    `${(index % 3) * 0.12}s`;

                observer.observe(element);

            });

        });

    }

});
