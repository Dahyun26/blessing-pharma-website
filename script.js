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

cartButton.addEventListener("click", () => {
    alert("Your shopping cart is currently empty.");
});