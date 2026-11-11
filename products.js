
document.addEventListener("DOMContentLoaded", async () => {
  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  // --------------------------------------------------
  // SUPABASE CONFIGURATION
  // --------------------------------------------------

  const SUPABASE_URL = "https://pgsfcplwdruttyaggvvu.supabase.co";
  const SUPABASE_KEY = "sb_publishable_E2Fm2FHuHeLhD1IvEONP3g_I0Mno3BW";

  if (!window.supabase || !SUPABASE_KEY || SUPABASE_KEY.includes("YOUR_")) {
    console.error("Supabase configuration is missing.");
    showCatalogMessage("Unable to connect to the product catalog.");
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  // --------------------------------------------------
  // HTML ELEMENTS
  // --------------------------------------------------

  const productGrid = $("#productGrid");
  const searchInput = $("#productSearch");
  const clearSearch = $("#clearSearch");
  const sortSelect = $("#sortProducts");
  const filters = $("#categoryFilters");
  const productCount = $("#productCount");
  const noResults = $("#noResults");
  const resetFilters = $("#resetFilters");

  const branchSelector = $("#branchSelector");
  const branchStatusMessage = $("#branchStatusMessage");

  const modal = $("#productModal");
  const modalTitle = $("#modalTitle");
  const modalDescription = $("#modalDescription");
  const modalQuote = $("#modalQuote");

  const menuToggle = $("#menuToggle");
  const navLinks = $("#navlinks");
  const backToTop = $("#backToTop");

  const headerSearchForm = $("#searchForm");
  const headerSearchInput = $("#searchInput");

  // QUOTATION ELEMENTS
const quotationItemsContainer = $("#quotationItems");
const quotationItemCount = $("#quotationItemCount");
const clearQuotationButton = $("#clearQuotation");
const quotationForm = $("#quotationForm");
const quotationStatus = $("#quotationStatus");

// Selected products for the quotation
let selectedQuotationItems = [];

  if (!productGrid) {
    console.error("Product grid not found.");
    return;
  }

  // --------------------------------------------------
  // PRODUCT DATA
  // --------------------------------------------------

  let products = [];
  let branches = [];
  let branchAvailability = [];

  let activeBranch = branchSelector
    ? branchSelector.value
    : "main";

  let activeCategory = "all";
  let previousFocus = null;

    // --------------------------------------------------
  // PRODUCT PAGE SCROLL TRANSITIONS
  // --------------------------------------------------

  let productCardObserver = null;

  if ("IntersectionObserver" in window) {

    // CATALOG SECTION REVEAL
    const catalogSection = $(".catalog");

    if (catalogSection) {
      catalogSection.classList.add("catalog-reveal");

      const catalogObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("show");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );

      catalogObserver.observe(catalogSection);
    }

    // PRODUCT CARD REVEAL
    productCardObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.10 }
    );
  }

  function observeProductCards() {
    if (!productCardObserver) return;

    $$(".product-card", productGrid).forEach((card) => {
      card.classList.add("product-card-reveal");
      productCardObserver.observe(card);
    });
  }

  function showCatalogMessage(message) {
    productGrid.innerHTML = `
      <div class="catalog-message">
        <p>${message}</p>
      </div>
    `;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    });
  }

  function categorySlug(category) {
  const value = String(category || "")
    .toLowerCase()
    .trim();

  if (
    value.includes("medical equipment") ||
    value.includes("diagnostic")
  ) {
    return "medical-equipment";
  }

  if (
    value.includes("pharma") ||
    value.includes("medicine")
  ) {
    return "pharmaceuticals";
  }

  if (
    value === "ppe" ||
    value.includes("personal protective equipment") ||
    value.includes("personal care")
  ) {
    return "personal-care";
  }

  return "medical-supplies";
}

  // --------------------------------------------------
  // BRANCH AVAILABILITY
  // --------------------------------------------------

  function getBranchStatus(productId) {
    const branch = branches.find(
      (item) => item.branch_code === activeBranch
    );

    if (!branch) return "coming_soon";

    const record = branchAvailability.find(
      (item) =>
        item.product_id === productId &&
        item.branch_id === branch.id
    );

    // Do not assume a product is available
    // when no branch availability record exists.
    return record
      ? record.availability_status
      : "coming_soon";
  }

  function getStatusLabel(status) {
    const labels = {
      available: "AVAILABLE",
      out_of_stock: "OUT OF STOCK",
      coming_soon: "COMING SOON"
    };

    return labels[status] || "COMING SOON";
  }

  // --------------------------------------------------
  // LOAD DATA FROM SUPABASE
  // --------------------------------------------------

  async function loadCatalog() {
    showCatalogMessage("Loading products...");

    try {
      const [
        productsResult,
        branchesResult,
        availabilityResult
      ] = await Promise.all([
        db
          .from("products")
          .select(`
            id,
            product_name,
            category,
            description,
            image_url,
            created_at
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),

        db
          .from("branches")
          .select("id, branch_name, branch_code")
          .eq("is_active", true),

        db
          .from("branch_product_availability")
          .select(`
            id,
            product_id,
            branch_id,
            stock_quantity,
            low_stock_threshold,
            availability_status
          `)
      ]);

      if (productsResult.error) throw productsResult.error;
      if (branchesResult.error) throw branchesResult.error;
      if (availabilityResult.error) throw availabilityResult.error;

      products = productsResult.data || [];
      branches = branchesResult.data || [];
      branchAvailability = availabilityResult.data || [];

      if (!products.length) {
        showCatalogMessage("No products are currently available.");

        if (productCount) {
          productCount.textContent = "0";
        }

        return;
      }

      populateBranchSelector();
renderProductCards();
updateBranchMessage();

// Read the category selected from the Home page URL
applyCategoryFromURL();

// Display products using the selected category
renderProducts();

    } catch (error) {
      console.error("Catalog loading error:", error);

      showCatalogMessage(
        "We couldn't load the product catalog. Please try again later."
      );
    }
  }

  // --------------------------------------------------
  // BRANCH SELECTOR
  // --------------------------------------------------

  function populateBranchSelector() {
    if (!branchSelector) return;

    const previousValue = activeBranch;

    branchSelector.innerHTML = "";

    branches.forEach((branch) => {
      const option = document.createElement("option");

      option.value = branch.branch_code;
      option.textContent = branch.branch_name;

      branchSelector.appendChild(option);
    });

    const selectedBranch = branches.find(
      (branch) => branch.branch_code === previousValue
    );

    activeBranch = selectedBranch
      ? previousValue
      : branches[0]?.branch_code || "";

    branchSelector.value = activeBranch;
  }

  function updateBranchMessage() {
    if (!branchStatusMessage) return;

    const message = $("span", branchStatusMessage);
    const statusIcon = $("i", branchStatusMessage);

    const selectedBranch = branches.find(
      (branch) => branch.branch_code === activeBranch
    );

    const isComingSoon = activeBranch === "coming-soon";

    branchStatusMessage.classList.toggle(
      "coming-soon",
      isComingSoon
    );

    if (statusIcon) {
      statusIcon.className = isComingSoon
        ? "fa-solid fa-clock"
        : "fa-solid fa-circle-check";
    }

    if (message) {
      message.textContent = selectedBranch
        ? `Viewing product availability for ${selectedBranch.branch_name}.`
        : "Branch information is currently unavailable.";
    }
  }

  if (branchSelector) {
    branchSelector.addEventListener("change", () => {
      activeBranch = branchSelector.value;

      updateBranchMessage();
      renderProductCards();
      renderProducts();
    });
  }

  // --------------------------------------------------
  // CREATE PRODUCT CARDS
  // --------------------------------------------------

  function renderProductCards() {
    productGrid.innerHTML = "";

    products.forEach((product) => {
      const name = escapeHTML(product.product_name);
      const category = escapeHTML(product.category);
      const description = escapeHTML(product.description || "");
      const imageURL = escapeHTML(product.image_url || "");
      const slug = categorySlug(product.category);

      const card = document.createElement("article");

      card.className = "product-card";

      card.dataset.id = product.id;
      card.dataset.name = product.product_name;
      card.dataset.category = slug;
      card.dataset.description = product.description || "";

      card.innerHTML = `
        <div class="product-image">
          <span class="product-tag">${category}</span>

          ${
            imageURL
              ? `<img src="${imageURL}" alt="${name}" loading="lazy">`
              : `<div class="product-placeholder">
                   <i class="fa-solid fa-box-open"></i>
                 </div>`
          }

          <span class="stock-status"></span>

          <button
            class="quick-view"
            type="button"
            aria-label="View ${name} details">
            <i class="fa-regular fa-eye"></i>
          </button>
        </div>

        <div class="product-info">
          <span class="product-category">${category}</span>

          <h3>${name}</h3>

          <p>${description || "Contact us for more product information."}</p>
        </div>
      `;

      productGrid.appendChild(card);

      const image = $("img", card);

      if (image) {
        image.addEventListener("error", () => {
          image.style.display = "none";
        });
      }
    });

    applyProductAvailability();
  }

  // --------------------------------------------------
  // APPLY BRANCH AVAILABILITY
  // --------------------------------------------------

  function applyProductAvailability() {
    const cards = $$(".product-card", productGrid);

    cards.forEach((card) => {
      const productName = card.dataset.name;
      const status = getBranchStatus(card.dataset.id);

      const badge = $(".stock-status", card);
      const quoteButton = $(".quote-btn", card);

      const isAvailable = status === "available";
      const isOutOfStock = status === "out_of_stock";

      card.dataset.available = String(isAvailable);

      card.classList.toggle("out-of-stock", isOutOfStock);

      if (badge) {
        badge.textContent = getStatusLabel(status);

        badge.classList.toggle("is-available", isAvailable);
        badge.classList.toggle("is-out", isOutOfStock);
        badge.classList.toggle(
          "is-coming-soon",
          status === "coming_soon"
        );
      }

      if (quoteButton) {
        quoteButton.disabled = !isAvailable;

        quoteButton.textContent = isAvailable
          ? "Available Now"
          : getStatusLabel(status);

        quoteButton.setAttribute(
          "aria-label",
          isAvailable
            ? `Request a quote for ${productName}`
            : `${productName}: ${getStatusLabel(status)}`
        );
      }
    });
  }

    // --------------------------------------------------
  // MULTI-ITEM QUOTATION LIST
  // --------------------------------------------------

  function addProductToQuotation(productId) {
    const product = products.find(
      (item) => String(item.id) === String(productId)
    );

    if (!product) return;

    // Only products available at the selected branch
    if (getBranchStatus(product.id) !== "available") return;

    const existingItem = selectedQuotationItems.find(
      (item) => String(item.productId) === String(product.id)
    );

    if (existingItem) {
      showQuotationMessage(
        `${product.product_name} is already in your quotation list.`
      );
    } else {
      selectedQuotationItems.push({
        productId: product.id,
        productName: product.product_name,
        brand: "",
        quantity: 1,
        uom: ""
      });

      showQuotationMessage("");
    }

    renderQuotationItems();

    closeModal();

    $("#quotation")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function showQuotationMessage(message) {
    if (!quotationStatus) return;

    quotationStatus.textContent = message;
    quotationStatus.style.color = message ? "#b45309" : "";
  }

  function renderQuotationItems() {
    if (!quotationItemsContainer) return;

    if (selectedQuotationItems.length === 0) {
      quotationItemsContainer.innerHTML = `
        <div class="quotation-empty">
          <i class="fa-solid fa-cart-shopping"></i>
          <p>No products added yet.</p>
        </div>
      `;
    } else {
      quotationItemsContainer.innerHTML =
        selectedQuotationItems.map((item, index) => `
          <div class="quotation-item" data-index="${index}">
            <div class="quotation-item-header">
              <strong>${escapeHTML(item.productName)}</strong>

              <button
                type="button"
                class="remove-quotation-item"
                data-index="${index}"
                aria-label="Remove ${escapeHTML(item.productName)}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>

            <div class="quotation-item-fields">
              <label>
                Brand (optional)
                <input
                  type="text"
                  class="quotation-brand"
                  data-index="${index}"
                  value="${escapeHTML(item.brand)}"
                  placeholder="Enter preferred brand">
              </label>

              <label>
                Quantity *
                <input
                  type="number"
                  class="quotation-quantity"
                  data-index="${index}"
                  min="1"
                  step="1"
                  value="${item.quantity}"
                  required>
              </label>

              <label>
                Unit of Measurement (UOM) *
                <input
                  type="text"
                  class="quotation-uom"
                  data-index="${index}"
                  value="${escapeHTML(item.uom)}"
                  placeholder="e.g. pcs, box, pack, gal"
                  required>
              </label>
            </div>
          </div>
        `).join("");
    }

    if (quotationItemCount) {
      const count = selectedQuotationItems.length;

      quotationItemCount.textContent =
        `${count} ${count === 1 ? "product" : "products"} selected`;
    }

    if (clearQuotationButton) {
      clearQuotationButton.disabled =
        selectedQuotationItems.length === 0;
    }
  }

  // Update brand, quantity and UOM values
  if (quotationItemsContainer) {
    quotationItemsContainer.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.index);

      if (!Number.isInteger(index)) return;

      const item = selectedQuotationItems[index];

      if (!item) return;

      if (event.target.classList.contains("quotation-brand")) {
        item.brand = event.target.value;
      }

      if (event.target.classList.contains("quotation-quantity")) {
        item.quantity = event.target.value;
      }

      if (event.target.classList.contains("quotation-uom")) {
        item.uom = event.target.value;
      }
    });

    // Remove an individual product
    quotationItemsContainer.addEventListener("click", (event) => {
      const removeButton = event.target.closest(
        ".remove-quotation-item"
      );

      if (!removeButton) return;

      const index = Number(removeButton.dataset.index);

      if (!Number.isInteger(index)) return;

      selectedQuotationItems.splice(index, 1);

      renderQuotationItems();
      showQuotationMessage("");
    });
  }

  // Clear the entire quotation list
  if (clearQuotationButton) {
    clearQuotationButton.addEventListener("click", () => {
      selectedQuotationItems = [];

      renderQuotationItems();
      showQuotationMessage("");
    });
  }

  // Initial quotation list display
  renderQuotationItems();

  // --------------------------------------------------
  // SEARCH, FILTER AND SORT
  // --------------------------------------------------

  function renderProducts() {
    const searchTerm = searchInput
      ? searchInput.value.trim().toLowerCase()
      : "";

    const sortMode = sortSelect
  ? sortSelect.value
  : "az";

    const cards = $$(".product-card", productGrid);
    const sortedCards = [...cards];

    if (sortMode === "az" || sortMode === "default") {
  sortedCards.sort((a, b) =>
    a.dataset.name.localeCompare(b.dataset.name, undefined, {
      sensitivity: "base",
      numeric: true
    })
  );
}

    if (sortMode === "za") {
  sortedCards.sort((a, b) =>
    b.dataset.name.localeCompare(a.dataset.name, undefined, {
      sensitivity: "base",
      numeric: true
    })
  );
}

    let visibleCount = 0;

    sortedCards.forEach((card) => {
      const name = (card.dataset.name || "").toLowerCase();
      const category = (card.dataset.category || "").toLowerCase();
      const description = (card.dataset.description || "").toLowerCase();

      const searchableText = [
        name,
        category.replaceAll("-", " "),
        description
      ].join(" ");

      const matchesSearch = searchableText.includes(searchTerm);

      const matchesCategory =
        activeCategory === "all" ||
        category === activeCategory;

      const isVisible = matchesSearch && matchesCategory;

      card.hidden = !isVisible;

      if (isVisible) {
        visibleCount++;
        productGrid.appendChild(card);
      }
    });

    if (productCount) {
      productCount.textContent = visibleCount;
    }

    if (noResults) {
      noResults.hidden = visibleCount !== 0;
    }

    if (clearSearch && searchInput) {
      clearSearch.hidden = searchInput.value.length === 0;
    }

    productGrid.hidden = false;
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderProducts);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", renderProducts);
  }

  if (clearSearch && searchInput) {
    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      renderProducts();
      searchInput.focus();
    });
  }

  if (filters) {
    $$(".filter-btn", filters).forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.category || "all";

        $$(".filter-btn", filters).forEach((filter) => {
          const isActive = filter === button;

          filter.classList.toggle("active", isActive);
          filter.setAttribute("aria-pressed", String(isActive));
        });

        renderProducts();
      });
    });
  }

  if (resetFilters) {
    resetFilters.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (sortSelect) sortSelect.value = "default";

      activeCategory = "all";

      if (filters) {
        $$(".filter-btn", filters).forEach((button) => {
          const isActive = button.dataset.category === "all";

          button.classList.toggle("active", isActive);
          button.setAttribute("aria-pressed", String(isActive));
        });
      }

      renderProducts();
    });
  }

  // --------------------------------------------------
  // HEADER SEARCH
  // --------------------------------------------------

  function performHeaderSearch() {
    if (!headerSearchInput || !searchInput) return;

    searchInput.value = headerSearchInput.value.trim();
    activeCategory = "all";

    if (filters) {
      $$(".filter-btn", filters).forEach((button) => {
        const isActive = button.dataset.category === "all";

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    renderProducts();

    $("#products")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  if (headerSearchForm) {
    headerSearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      performHeaderSearch();
    });
  }

  // --------------------------------------------------
  // PRODUCT DETAILS MODAL
  // --------------------------------------------------

  function openModal(card) {
    if (!modal || !modalTitle || !modalDescription || !modalQuote) {
  addProductToQuotation(card.dataset.id);
  return;
}

    previousFocus = document.activeElement;

    modalTitle.textContent = card.dataset.name;
    modalDescription.textContent =
      card.dataset.description || "Contact us for more information.";

    modalQuote.dataset.product = card.dataset.name;

    const isAvailable = card.dataset.available === "true";

    modalQuote.disabled = !isAvailable;
    modalQuote.textContent = isAvailable
      ? "Available Now"
      : "Not Available";

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    $(".modal-close", modal)?.focus();
  }

  function closeModal() {
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    previousFocus?.focus?.();
  }

  productGrid.addEventListener("click", (event) => {
    const quickViewButton = event.target.closest(".quick-view");
    const quoteButton = event.target.closest(".quote-btn");

    if (quickViewButton) {
      const card = quickViewButton.closest(".product-card");
      if (card) openModal(card);
      return;
    }

   if (quoteButton && !quoteButton.disabled) {
  const card = quoteButton.closest(".product-card");

  if (card) {
    addProductToQuotation(card.dataset.id);
  }
}
  });

  if (modal) {
    $$("[data-close-modal]", modal).forEach((element) => {
      element.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });
  }

  function selectProductAndGoToForm(productName) {
    const selectedCard = $$(".product-card", productGrid).find(
      (card) => card.dataset.name === productName
    );

    if (selectedCard?.dataset.available !== "true") return;

    if (quotationProduct) {
      const matchingOption = [...quotationProduct.options].find(
        (option) =>
          option.value === productName ||
          option.textContent.trim() === productName
      );

      quotationProduct.value = matchingOption
        ? matchingOption.value
        : "Other";
    }

    closeModal();

    $("#quotation")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    quotationProduct?.focus({ preventScroll: true });
  }

  if (modalQuote) {
  modalQuote.addEventListener("click", () => {
    if (modalQuote.disabled) return;

    const product = products.find(
      (item) => item.product_name === modalQuote.dataset.product
    );

    if (product) {
      addProductToQuotation(product.id);
    }
  });
}

  // --------------------------------------------------
  // MOBILE NAVIGATION
  // --------------------------------------------------

  if (menuToggle && navLinks) {
    menuToggle.setAttribute("aria-expanded", "false");

    menuToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");

      menuToggle.setAttribute("aria-expanded", String(isOpen));

      menuToggle.innerHTML = isOpen
        ? '<i class="fa-solid fa-xmark"></i> Close'
        : '<i class="fa-solid fa-bars"></i> Menu';
    });

    $$("a", navLinks).forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.innerHTML =
          '<i class="fa-solid fa-bars"></i> Menu';
      });
    });
  }


  // --------------------------------------------------
// CATEGORY FROM HOME PAGE URL
// --------------------------------------------------

function applyCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    const requestedCategory = params.get("category");

    const validCategories = [
        "all",
        "medical-supplies",
        "medical-equipment",
        "personal-care",
        "pharmaceuticals"
    ];

    activeCategory = validCategories.includes(requestedCategory)
        ? requestedCategory
        : "all";

    if (filters) {
        $$(".filter-btn", filters).forEach((button) => {
            const isActive = button.dataset.category === activeCategory;

            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }
}

  // --------------------------------------------------
  // BACK TO TOP
  // --------------------------------------------------

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

  // --------------------------------------------------
  // INITIALIZE
  // --------------------------------------------------

  await loadCatalog();
  updateBackToTop();
});
