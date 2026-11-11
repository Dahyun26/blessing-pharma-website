// MOBILE NAVIGATION
const menuToggle = document.getElementById("menuToggle");
const navlinks = document.getElementById("navlinks");

menuToggle.addEventListener("click", () => {
    navlinks.classList.toggle("open");
});

// Close the menu after clicking a navigation link
document.querySelectorAll(".navlinks a").forEach(link => {
    link.addEventListener("click", () => {
        navlinks.classList.remove("open");
    });
});

// PRODUCT SEARCH
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const productCards = document.querySelectorAll(".product-card");
const noResults = document.getElementById("noResults");

searchForm.addEventListener("submit", event => {
    event.preventDefault();

    const term = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    productCards.forEach(card => {
        const keywords = card.dataset.search.toLowerCase();
        const content = card.innerText.toLowerCase();

        const matches =
            term === "" ||
            keywords.includes(term) ||
            content.includes(term);

        card.style.display = matches ? "" : "none";

        if (matches) {
            visibleCount++;
        }
    });

    noResults.style.display =
        visibleCount === 0 ? "block" : "none";

    document.getElementById("products").scrollIntoView({
        behavior: "smooth"
    });
});

// Reset the product list when the search field is cleared
searchInput.addEventListener("input", () => {
    if (searchInput.value.trim() === "") {
        productCards.forEach(card => {
            card.style.display = "";
        });

        noResults.style.display = "none";
    }
});

// SHOPPING CART DEMO
const cartButton = document.getElementById("cartButton");

if (cartButton) {
    cartButton.addEventListener("click", () => {
        alert("Your shopping cart is currently empty.");
    });
}

// CUSTOMER STAR RATINGS
const SUPABASE_URL = "https://pgsfcplwdruttyaggvvu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_E2Fm2FHuHeLhD1IvEONP3g_I0Mno3BW";

async function loadCustomerRatings() {
    const averageStars = document.getElementById("averageStars");
    const averageRating = document.getElementById("averageRating");
    const totalFeedback = document.getElementById("totalFeedback");
    const ratingBreakdown = document.getElementById("ratingBreakdown");

    if (!averageStars || !averageRating || !totalFeedback || !ratingBreakdown) {
        return;
    }

    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/get_customer_rating_summary`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({})
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load customer ratings.");
        }

        const result = await response.json();
        const summary = Array.isArray(result) ? result[0] : result;

        if (!summary) {
            throw new Error("No rating summary received.");
        }

        const average = Number(summary.average_rating) || 0;
        const total = Number(summary.total_ratings) || 0;

        const fullStars = Math.round(average);

        averageStars.textContent =
            "★".repeat(fullStars) + "☆".repeat(5 - fullStars);

        averageRating.textContent = average.toFixed(1) + " / 5";
        totalFeedback.textContent =
            `${total} customer rating${total === 1 ? "" : "s"}`;

        const ratings = [
            { label: "5", count: Number(summary.five_star) || 0 },
            { label: "4", count: Number(summary.four_star) || 0 },
            { label: "3", count: Number(summary.three_star) || 0 },
            { label: "2", count: Number(summary.two_star) || 0 },
            { label: "1", count: Number(summary.one_star) || 0 }
        ];

        ratingBreakdown.innerHTML = ratings.map(item => {
            const percentage = total > 0
                ? (item.count / total) * 100
                : 0;

            return `
                <div class="rating-row">
                    <span class="rating-label">${item.label} ★</span>

                    <div class="rating-bar-track">
                        <div class="rating-bar-fill"
                             style="width: ${percentage}%">
                        </div>
                    </div>

                    <span class="rating-count">${item.count}</span>
                </div>
            `;
        }).join("");

    } catch (error) {
        console.error("Customer rating error:", error);

        averageStars.textContent = "☆☆☆☆☆";
        averageRating.textContent = "Unavailable";
        totalFeedback.textContent = "Ratings could not be loaded.";

        ratingBreakdown.innerHTML =
            '<p class="feedback-empty">Unable to load rating breakdown.</p>';
    }
}

loadCustomerRatings();

// =========================================
// WEBSITE PAGE AND SCROLL TRANSITIONS
// =========================================

document.addEventListener("DOMContentLoaded", () => {

    // Stop animations for visitors who prefer reduced motion
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    // -------------------------------------
    // PAGE TRANSITION
    // -------------------------------------

    document.querySelectorAll("a[href]").forEach(link => {

        link.addEventListener("click", event => {

            const url = new URL(link.href, window.location.href);

            const isSamePage =
                url.origin === window.location.origin &&
                url.pathname === window.location.pathname;

            const isExternal =
                url.origin !== window.location.origin;

            if (
                isExternal ||
                isSamePage ||
                link.target === "_blank" ||
                link.hasAttribute("download") ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
            ) {
                return;
            }

            event.preventDefault();

            document.body.classList.add("page-leaving");

            setTimeout(() => {
                window.location.href = url.href;
            }, 250);

        });

    });

    // -------------------------------------
    // SCROLL REVEAL ANIMATION
    // -------------------------------------

    const revealElements = document.querySelectorAll(
        "main > section:not(.hero), " +
        ".service-card, " +
        ".feature-card, " +
        ".product-card, " +
        ".about-card"
    );

    const observer = new IntersectionObserver((entries, observer) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("is-visible");

                observer.unobserve(entry.target);

            }

        });

    }, {
        threshold: 0.12
    });

    revealElements.forEach(element => {

        element.classList.add("scroll-reveal");

        observer.observe(element);

    });

});