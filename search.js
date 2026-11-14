
document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");

    if (!searchForm || !searchInput || !searchResults) return;

    // Add all website pages here
    const pages = [
        "index.html",
        "about.html",
        "products.html",
        "services.html",
        "contact.html"
    ];

    let websiteContent = [];

    // Load text content from every website page
    async function loadWebsiteContent() {
        const results = await Promise.all(
            pages.map(async (page) => {
                try {
                    const response = await fetch(page);

                    if (!response.ok) return null;

                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, "text/html");

                    const content =
                        doc.querySelector("main") ||
                        doc.querySelector(".content") ||
                        doc.body;

                    // Remove elements that should not be searched
                    content.querySelectorAll(
                        "script, style, noscript, nav, header, footer"
                    ).forEach(element => element.remove());

                    const title =
                        doc.querySelector("title")?.textContent ||
                        page.replace(".html", "");

                    return {
                        page,
                        title: title.trim(),
                        text: content.innerText || content.textContent || ""
                    };

                } catch (error) {
                    console.error("Could not load:", page, error);
                    return null;
                }
            })
        );

        websiteContent = results.filter(Boolean);
    }

    // Search all loaded website pages
    function searchWebsite(query) {
        const keywords = query.toLowerCase()
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!keywords.length) return [];

        return websiteContent
            .map(item => {
                const searchableText =
                    (item.title + " " + item.text).toLowerCase();

                const matchedWords = keywords.filter(word =>
                    searchableText.includes(word)
                );

                return {
                    ...item,
                    score: matchedWords.length,
                    snippet: getSnippet(item.text, keywords)
                };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);
    }

    // Generate a short preview around the matching keyword
    function getSnippet(text, keywords) {
        const cleanText = text.replace(/\s+/g, " ").trim();
        const lowerText = cleanText.toLowerCase();

        let position = -1;

        for (const word of keywords) {
            position = lowerText.indexOf(word);
            if (position !== -1) break;
        }

        if (position === -1) {
            return cleanText.substring(0, 120) + "...";
        }

        const start = Math.max(0, position - 45);
        const end = Math.min(cleanText.length, position + 100);

        return (start > 0 ? "..." : "") +
            cleanText.substring(start, end) +
            (end < cleanText.length ? "..." : "");
    }

    // Display search results
    function displayResults(results) {
        searchResults.innerHTML = "";

        if (!results.length) {
            searchResults.innerHTML =
                '<div class="no-results">No matching content found.</div>';

            searchResults.classList.add("active");
            return;
        }

        results.forEach(item => {
            const link = document.createElement("a");
            link.className = "search-result-item";
            link.href = item.page;

            const title = document.createElement("strong");
            title.textContent = item.title;

            const snippet = document.createElement("span");
            snippet.textContent = item.snippet;

            link.appendChild(title);
            link.appendChild(snippet);

            searchResults.appendChild(link);
        });

        searchResults.classList.add("active");
    }

    // Search while typing
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();

        if (!query) {
            searchResults.classList.remove("active");
            searchResults.innerHTML = "";
            return;
        }

        if (!websiteContent.length) return;

        displayResults(searchWebsite(query));
    });

    // Handle form submission
    searchForm.addEventListener("submit", event => {
        event.preventDefault();

        const query = searchInput.value.trim();

        if (!query) return;

        if (!websiteContent.length) {
            searchResults.innerHTML =
                '<div class="no-results">Please wait. Loading website content...</div>';
            searchResults.classList.add("active");
            return;
        }

        displayResults(searchWebsite(query));
    });

    // Close results when clicking outside
    document.addEventListener("click", event => {
        if (
            !searchForm.contains(event.target) &&
            !searchResults.contains(event.target)
        ) {
            searchResults.classList.remove("active");
        }
    });

    // Load all pages when the website opens
    loadWebsiteContent();
});
