
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // MOBILE NAVIGATION
    // ==========================================

    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navlinks");

    if (menuToggle && navLinks) {

        menuToggle.setAttribute("aria-controls", "navlinks");
        menuToggle.setAttribute("aria-expanded", "false");

        menuToggle.addEventListener("click", () => {

            const isOpen = navLinks.classList.toggle("open");

            menuToggle.setAttribute("aria-expanded", String(isOpen));

            menuToggle.innerHTML = isOpen
                ? '<i class="fa-solid fa-xmark"></i> Close'
                : '<i class="fa-solid fa-bars"></i> Menu';

        });

        // Close menu after clicking a navigation link
        navLinks.querySelectorAll("a").forEach(link => {

            link.addEventListener("click", () => {

                navLinks.classList.remove("open");

                menuToggle.setAttribute("aria-expanded", "false");

                menuToggle.innerHTML =
                    '<i class="fa-solid fa-bars"></i> Menu';

            });

        });

        // Close menu when returning to desktop size
        window.addEventListener("resize", () => {

            if (window.innerWidth > 760) {

                navLinks.classList.remove("open");

                menuToggle.setAttribute("aria-expanded", "false");

                menuToggle.innerHTML =
                    '<i class="fa-solid fa-bars"></i> Menu';

            }

        });

    }


    // ==========================================
    // CURRENT YEAR
    // ==========================================

    const currentYear = document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }


    // ==========================================
    // BACK TO TOP
    // ==========================================

    const backToTop = document.getElementById("backToTop");

    function updateBackToTop() {

        if (backToTop) {
            backToTop.classList.toggle(
                "visible",
                window.scrollY > 400
            );
        }

    }

    window.addEventListener("scroll", updateBackToTop, {
        passive: true
    });

    if (backToTop) {

        backToTop.addEventListener("click", () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        });

    }

    updateBackToTop();


    // ==========================================
    // SCROLL REVEAL ANIMATIONS
    // SERVICES PAGE
    // ==========================================

    if ("IntersectionObserver" in window) {

        const revealSections = document.querySelectorAll(
            ".services-section, .how-section"
        );

        const blesscardContent = document.querySelector(
            ".blesscard-content"
        );

        const blesscardVisual = document.querySelector(
            ".blesscard-visual"
        );

        const revealCards = document.querySelectorAll(
            ".service-card, .step-card"
        );

        const ctaContent = document.querySelector(
            ".cta-content"
        );

        revealSections.forEach(section => {
            section.classList.add("services-reveal");
        });

        if (blesscardContent) {
            blesscardContent.classList.add(
                "blesscard-content-reveal"
            );
        }

        if (blesscardVisual) {
            blesscardVisual.classList.add(
                "blesscard-visual-reveal"
            );
        }

        revealCards.forEach(card => {
            card.classList.add("services-card-reveal");
        });

        if (ctaContent) {
            ctaContent.classList.add("cta-reveal");
        }


        // ABOUT PAGE ANIMATIONS

        const aboutSections = document.querySelectorAll(
            ".story, .mission-section, .organization, " +
            ".values-section, .about-cta"
        );

        const aboutCards = document.querySelectorAll(
            ".purpose-card, .org-card, .value-card"
        );

        aboutSections.forEach(section => {
            section.classList.add("about-reveal");
        });

        aboutCards.forEach(card => {
            card.classList.add("about-card-reveal");
        });


        // OBSERVER

        const revealObserver = new IntersectionObserver(
            (entries, observer) => {

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


        // OBSERVE ALL ELEMENTS

        document.querySelectorAll(
            ".services-reveal, " +
            ".blesscard-content-reveal, " +
            ".blesscard-visual-reveal, " +
            ".services-card-reveal, " +
            ".cta-reveal, " +
            ".about-reveal, " +
            ".about-card-reveal"
        ).forEach(element => {

            revealObserver.observe(element);

        });

    }


    // ==========================================
    // DELIVERY PROOF GALLERY
    // ==========================================

    const viewButton = document.getElementById(
        "viewDeliveryProof"
    );

    const deliveryModal = document.getElementById(
        "deliveryModal"
    );

    const closeButton = document.getElementById(
        "closeDeliveryModal"
    );

    if (viewButton && deliveryModal && closeButton) {

        // OPEN GALLERY

        viewButton.addEventListener("click", () => {

            deliveryModal.classList.add("active");

            document.body.style.overflow = "hidden";

        });


        // CLOSE GALLERY

        function closeGallery() {

            deliveryModal.classList.remove("active");

            document.body.style.overflow = "";

        }

        closeButton.addEventListener("click", closeGallery);


        // CLICK OUTSIDE GALLERY

        deliveryModal.addEventListener("click", event => {

            if (event.target === deliveryModal) {
                closeGallery();
            }

        });


        // ESCAPE KEY

        document.addEventListener("keydown", event => {

            if (event.key === "Escape") {
                closeGallery();
            }

        });

    }

});
