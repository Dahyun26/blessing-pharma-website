
document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");

    if (!searchForm || !searchInput) return;

    const pages = [
        "index.html",
        "about.html",
        "products.html",
        "services.html",
        "feedback.html",
        "contact.html"
    ];

    // Supabase public project details.
    // This is the publishable key, not a secret service-role key.
    const SUPABASE_URL = "https://pgsfcplwdruttyaggvvu.supabase.co";
    const SUPABASE_KEY = "sb_publishable_E2Fm2FHuHeLhD1IvEONP3g_I0Mno3BW";

    let websiteContent = [];
    let loadingPromise = null;
    let productsCache = null;

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/&amp;/g, "and")
            .replace(/[^\p{L}\p{N}\s-]/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function getKeywords(query) {
        return normalize(query)
            .split(" ")
            .filter(Boolean);
    }

    // Common searches should always go to their intended destination.
    const priorityDestinations = [
        {
            keywords: ["organizational chart", "organization chart", "org chart", "our team", "management team"],
            page: "about.html",
            target: "organizational-chart",
            fallback: "organization"
        },
        {
            keywords: ["mission"],
            page: "about.html",
            target: "mission"
        },
        {
            keywords: ["vision"],
            page: "about.html",
            target: "vision"
        },
        {
            keywords: ["about us", "about"],
            page: "about.html",
            target: null
        },
        {
            keywords: ["delivery", "deliveries", "delivery service", "delivery services"],
            page: "services.html",
            target: "delivery"
        },
        {
            keywords: ["google maps", "map", "location", "directions", "where are you located"],
            page: "contact.html",
            target: "google-maps",
            fallback: "our-location"
        },
        {
            keywords: ["contact us", "contact information", "contact details", "phone number", "email address", "business hours"],
            page: "contact.html",
            target: "contact-information",
            fallback: "contact-home"
        },
        {
            keywords: ["contact form", "send inquiry", "send an inquiry", "inquiry form"],
            page: "contact.html",
            target: "contact-form"
        },
        {
            keywords: ["feedback", "customer feedback", "customer reviews", "reviews"],
            page: "feedback.html",
            target: "customer-feedback",
            fallback: "feedback-home"
        },
        {
            keywords: ["submit feedback", "give feedback", "feedback form", "google form"],
            page: "feedback.html",
            target: "submit-feedback",
            fallback: "customer-feedback"
        },
        {
            keywords: ["blesscard", "bless card", "rewards program", "reward program"],
            page: "services.html",
            target: "blesscard"
        },
        {
            keywords: ["how it works"],
            page: "services.html",
            target: "how-it-works"
        }
    ];

    function findPriorityDestination(query) {
        const normalizedQuery = normalize(query);

        // Prefer the longest matching phrase.
        const matches = [];

        priorityDestinations.forEach(destination => {
            destination.keywords.forEach(keyword => {
                if (
                    normalizedQuery === keyword ||
                    normalizedQuery.includes(keyword)
                ) {
                    matches.push({
                        ...destination,
                        matchedLength: keyword.length
                    });
                }
            });
        });

        matches.sort((a, b) => b.matchedLength - a.matchedLength);

        return matches[0] || null;
    }

    async function loadWebsiteContent() {
        const results = await Promise.all(
            pages.map(async page => {
                try {
                    const response = await fetch(page, {
                        cache: "no-cache"
                    });

                    if (!response.ok) return null;

                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, "text/html");

                    const main =
                        doc.querySelector("main") ||
                        doc.querySelector(".content") ||
                        doc.body;

                    main.querySelectorAll(
                        "script, style, noscript, nav, header, footer, aside, form, iframe"
                    ).forEach(element => element.remove());

                    return {
                        page,
                        title: doc.querySelector("title")?.textContent || page,
                        main
                    };
                } catch (error) {
                    console.warn("Could not search page:", page, error);
                    return null;
                }
            })
        );

        websiteContent = results.filter(Boolean);
    }

    async function loadSupabaseProducts() {
        if (productsCache) return productsCache;

        try {
            const endpoint =
                `${SUPABASE_URL}/rest/v1/products` +
                "?select=id,product_name,category,description" +
                "&is_active=eq.true";

            const response = await fetch(endpoint, {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            });

            if (!response.ok) {
                console.warn("Could not load products for global search.");
                productsCache = [];
                return productsCache;
            }

            productsCache = await response.json();
            return productsCache;
        } catch (error) {
            console.warn("Supabase product search failed:", error);
            productsCache = [];
            return productsCache;
        }
    }

    function findMatchingProduct(products, query) {
        const normalizedQuery = normalize(query);
        const keywords = getKeywords(query);

        if (!keywords.length) return null;

        const matches = products
            .map(product => {
                const name = normalize(product.product_name);
                const category = normalize(product.category);
                const description = normalize(product.description);
                const searchable = `${name} ${category} ${description}`;

                let score = 0;

                if (name === normalizedQuery) score += 100;
                if (name.includes(normalizedQuery)) score += 60;
                if (normalizedQuery.includes(name) && name.length > 2) score += 40;

                keywords.forEach(keyword => {
                    if (name.includes(keyword)) score += 15;
                    if (category.includes(keyword)) score += 5;
                    if (description.includes(keyword)) score += 2;
                });

                const allWordsMatch = keywords.every(keyword =>
                    searchable.includes(keyword)
                );

                if (allWordsMatch) score += 20;

                return { product, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        return matches[0]?.product || null;
    }

    function getSectionText(element) {
        return normalize(element.innerText || element.textContent || "");
    }

    function findBestSection(root, query) {
        const keywords = getKeywords(query);

        if (!keywords.length) return null;

        const main =
            root.querySelector("main") ||
            root.querySelector(".content") ||
            root.body ||
            root;

        const candidates = new Set([
            ...main.querySelectorAll(
                "section, article, main > div, [id]"
            )
        ]);

        // Include the nearest section/container for each heading.
        main.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(heading => {
            const parent = heading.closest("section, article, div");

            if (parent && main.contains(parent)) {
                candidates.add(parent);
            }
        });

        let bestMatch = null;

        candidates.forEach(element => {
            const text = getSectionText(element);

            if (!text) return;

            const headingText = normalize(
                Array.from(
                    element.querySelectorAll("h1, h2, h3, h4, h5, h6")
                )
                    .map(heading => heading.textContent)
                    .join(" ")
            );

            let score = 0;

            keywords.forEach(keyword => {
                if (headingText.includes(keyword)) score += 30;
                if (text.includes(keyword)) score += 10;
            });

            if (text.includes(normalize(query))) score += 25;

            if (!score) return;

            const candidate = {
                element,
                score,
                textLength: text.length
            };

            if (
                !bestMatch ||
                candidate.score > bestMatch.score ||
                (
                    candidate.score === bestMatch.score &&
                    candidate.textLength < bestMatch.textLength
                )
            ) {
                bestMatch = candidate;
            }
        });

        return bestMatch;
    }

    function findPageForQuery(query) {
        const matches = [];

        websiteContent.forEach(page => {
            const match = findBestSection(page.main, query);

            if (match) {
                matches.push({
                    page: page.page,
                    score: match.score,
                    textLength: match.textLength
                });
            }
        });

        matches.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.textLength - b.textLength;
        });

        return matches[0] || null;
    }

    function getCurrentPage() {
        const current = window.location.pathname.split("/").pop();
        return current || "index.html";
    }

    function scrollToElement(element) {
        if (!element) {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
            return;
        }

        element.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        const oldOutline = element.style.outline;
        const oldOffset = element.style.outlineOffset;
        const oldTransition = element.style.transition;

        element.style.transition = "outline 0.2s ease";
        element.style.outline = "3px solid #ffd51e";
        element.style.outlineOffset = "6px";

        setTimeout(() => {
            element.style.outline = oldOutline;
            element.style.outlineOffset = oldOffset;
            element.style.transition = oldTransition;
        }, 3000);
    }

    function findTargetElement(targetId, fallbackId) {
        if (targetId) {
            const target = document.getElementById(targetId);
            if (target) return target;
        }

        if (fallbackId) {
            const fallback = document.getElementById(fallbackId);
            if (fallback) return fallback;
        }

        return null;
    }

    function navigateToDestination(destination) {
        const currentPage = getCurrentPage();

        if (currentPage === destination.page) {
            const target = findTargetElement(
                destination.target,
                destination.fallback
            );

            if (destination.target && !target) {
                // Fall back to searching the current page's content.
                const match = findBestSection(document, destination.target);
                scrollToElement(match?.element || null);
            } else {
                scrollToElement(target);
            }

            return;
        }

        const hash = destination.target
            ? `#site-target=${encodeURIComponent(destination.target)}`
            : "";

        window.location.href = destination.page + hash;
    }

    function navigateToProduct(product) {
        const productHash =
            `#site-product=${encodeURIComponent(product.id)}`;

        if (getCurrentPage() === "products.html") {
            locateProductCard(product.id);
        } else {
            window.location.href = "products.html" + productHash;
        }
    }

    function locateProductCard(productId) {
        let attempts = 0;

        const timer = setInterval(() => {
            attempts++;

            const cards = Array.from(
                document.querySelectorAll(".product-card[data-id]")
            );

            const card = cards.find(item =>
                item.dataset.id === productId
            );

            if (card) {
                clearInterval(timer);
                scrollToElement(card);
                return;
            }

            if (attempts >= 60) {
                clearInterval(timer);
                alert("The product could not be displayed. Please refresh the Products page and try again.");
            }
        }, 200);
    }

    function handleIncomingSearch() {
        const hash = window.location.hash;

        if (hash.startsWith("#site-target=")) {
            const targetId = decodeURIComponent(
                hash.substring("#site-target=".length)
            );

            const target = findTargetElement(
                targetId,
                targetId === "organizational-chart" ? "organization" :
                targetId === "google-maps" ? "our-location" :
                null
            );

            if (target) {
                setTimeout(() => scrollToElement(target), 250);
            }

            history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
            );
        }

        if (hash.startsWith("#site-product=")) {
            const productId = decodeURIComponent(
                hash.substring("#site-product=".length)
            );

            history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
            );

            locateProductCard(productId);
        }

        if (hash.startsWith("#site-search=")) {
            const query = decodeURIComponent(
                hash.substring("#site-search=".length)
            );

            setTimeout(() => {
                const match = findBestSection(document, query);
                scrollToElement(match?.element || null);
            }, 250);

            history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
            );
        }
    }

    async function performSearch(query) {
        const cleanQuery = query.trim();

        if (!cleanQuery) return;

        // 1. Use known destinations first to avoid incorrect page selection.
        const priorityMatch = findPriorityDestination(cleanQuery);

        if (priorityMatch) {
            navigateToDestination(priorityMatch);
            return;
        }

        // 2. Search active Supabase products.
        const products = await loadSupabaseProducts();
        const matchingProduct = findMatchingProduct(products, cleanQuery);

        if (matchingProduct) {
            navigateToProduct(matchingProduct);
            return;
        }

        // 3. Search all static website pages and sections.
        if (!loadingPromise) {
            loadingPromise = loadWebsiteContent();
        }

        await loadingPromise;

        const bestMatch = findPageForQuery(cleanQuery);

        if (!bestMatch) {
            alert("No matching content found.");
            return;
        }

        if (getCurrentPage() === bestMatch.page) {
            const match = findBestSection(document, cleanQuery);
            scrollToElement(match?.element || null);
        } else {
            window.location.href =
                bestMatch.page +
                "#site-search=" +
                encodeURIComponent(cleanQuery);
        }
    }

    // Capture the submit event so the old Products header-search listener
    // cannot run a second, conflicting search.
    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        performSearch(searchInput.value);
    }, true);


    handleIncomingSearch();

    // Load searchable page content in the background.
    loadingPromise = loadWebsiteContent();
});
