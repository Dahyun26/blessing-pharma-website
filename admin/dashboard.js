
/* =========================================
   BLESSING PHARMA - ADMIN DASHBOARD
========================================= */

/* SUPABASE CONNECTION */

const SUPABASE_URL = "https://pgsfcplwdruttyaggvvu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_E2Fm2FHuHeLhD1IvEONP3g_I0Mno3BW";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================
   ADMIN AUTHENTICATION
========================================= */

async function protectDashboard() {
    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError || !sessionData.session) {
        window.location.replace("login.html");
        return false;
    }

    const { data: isAdmin, error: adminError } =
        await supabaseClient.rpc("is_blessing_admin");

    if (adminError || isAdmin !== true) {
        console.error("Admin verification failed:", adminError);
        await supabaseClient.auth.signOut();
        window.location.replace("login.html");
        return false;
    }

    return true;
}


/* =========================================
   DASHBOARD INITIALIZATION
========================================= */

async function initializeDashboard() {

    const $ = id => document.getElementById(id);

    /* MAIN ELEMENTS */

    const productTableBody = $("productTableBody");
    const emptyMessage = $("emptyMessage");

    const totalProducts = $("totalProducts");
    const availableProducts = $("availableProducts");
    const outOfStockProducts = $("outOfStockProducts");

    const productSearch = $("productSearch");
    const statusFilter = $("statusFilter");

    const addProductButton = $("addProductButton");
    const productFormContainer = $("productFormContainer");
    const productForm = $("productForm");

    const closeProductForm = $("closeProductForm");
    const cancelProductButton = $("cancelProductButton");

    const productName = $("productName");
    const productCategory = $("productCategory");
    const productDescription = $("productDescription");
    const productImage = $("productImage");

    const mainBranchStatus = $("mainBranchStatus");
    const comingSoonBranchStatus = $("comingSoonBranchStatus");

    const imagePreviewContainer = $("imagePreviewContainer");
    const imagePreview = $("imagePreview");

    const productFormMessage = $("productFormMessage");
    const saveProductButton = $("saveProductButton");

    const logoutButton = $("logoutButton");

    const menuToggle = $("menuToggle");
    const sidebar = $("sidebar");


    /* DATA */

    let products = [];
let branches = [];
let branchAvailability = [];
let selectedImage = null;

let editingProductId = null;
let existingImageUrl = null;


    /* =========================================
       HELPER FUNCTIONS
    ========================================= */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
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


    function showFormMessage(message, type = "error") {
        productFormMessage.textContent = message;
        productFormMessage.style.color =
            type === "success" ? "#08734C" : "#dc3545";
    }


    function getBranch(branchCode) {
        return branches.find(branch =>
            branch.branch_code === branchCode
        );
    }


    function getProductBranchStatus(productId, branchCode) {

        const branch = getBranch(branchCode);

        if (!branch) return "coming_soon";

        const record = branchAvailability.find(item =>
            item.product_id === productId &&
            item.branch_id === branch.id
        );

        return record
            ? record.availability_status
            : "coming_soon";
    }


    function getStatusLabel(status) {
        const labels = {
            available: "Available",
            out_of_stock: "Out of Stock",
            coming_soon: "Coming Soon"
        };

        return labels[status] || "Coming Soon";
    }


    function getStatusClass(status) {
        const classes = {
            available: "available",
            out_of_stock: "out",
            coming_soon: "low"
        };

        return classes[status] || "low";
    }


    /* =========================================
       LOAD BRANCHES
    ========================================= */

    async function loadBranches() {

        const { data, error } = await supabaseClient
            .from("branches")
            .select("id, branch_name, branch_code")
            .eq("is_active", true);

        if (error) throw error;

        branches = data || [];

        if (!getBranch("main") || !getBranch("coming-soon")) {
            throw new Error(
                "Main Branch or Coming Soon branch is missing or inactive."
            );
        }
    }


    /* =========================================
       LOAD PRODUCTS AND AVAILABILITY
    ========================================= */

    async function loadProducts() {

        productTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    Loading products...
                </td>
            </tr>
        `;

        try {

            const [
                productsResult,
                availabilityResult
            ] = await Promise.all([

                supabaseClient
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("product_name", { ascending: true }),

                supabaseClient
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
            if (availabilityResult.error) throw availabilityResult.error;

            products = productsResult.data || [];
            branchAvailability = availabilityResult.data || [];

            renderProducts();
            updateDashboardSummary();

        } catch (error) {

            console.error("Product loading error:", error);

            productTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">
                        Unable to load products.
                    </td>
                </tr>
            `;
        }
    }


    /* =========================================
       DISPLAY PRODUCTS
    ========================================= */

    function renderProducts() {

        const searchValue = productSearch.value
            .trim()
            .toLowerCase();

        const filterValue = statusFilter.value;

        const filteredProducts = products.filter(product => {

            const name = (product.product_name || "").toLowerCase();
            const category = (product.category || "").toLowerCase();

            const matchesSearch =
                name.includes(searchValue) ||
                category.includes(searchValue);

            const mainStatus = getProductBranchStatus(
                product.id,
                "main"
            );

            const comingSoonStatus = getProductBranchStatus(
                product.id,
                "coming-soon"
            );

            const matchesFilter =
                filterValue === "all" ||
                (
                    filterValue === "available" &&
                    (
                        mainStatus === "available" ||
                        comingSoonStatus === "available"
                    )
                ) ||
                (
                    filterValue === "out" &&
                    mainStatus === "out_of_stock" &&
                    comingSoonStatus === "out_of_stock"
                );

            return matchesSearch && matchesFilter;
        });


        productTableBody.innerHTML = "";

        if (filteredProducts.length === 0) {
            emptyMessage.style.display = "block";
            return;
        }

        emptyMessage.style.display = "none";


        filteredProducts.forEach(product => {

            const mainStatus = getProductBranchStatus(
                product.id,
                "main"
            );

            const comingSoonStatus = getProductBranchStatus(
                product.id,
                "coming-soon"
            );

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <div class="product-info">
                        <span>
                            ${escapeHTML(product.product_name)}
                        </span>
                    </div>
                </td>

                <td>${escapeHTML(product.category)}</td>

                <td>
                    <select
                        class="branch-status-select"
                        data-product-id="${product.id}"
                        data-branch-code="main"
                        aria-label="Main Branch availability for ${escapeHTML(product.product_name)}">

                        <option value="available"
                            ${mainStatus === "available" ? "selected" : ""}>
                            Available
                        </option>

                        <option value="out_of_stock"
                            ${mainStatus === "out_of_stock" ? "selected" : ""}>
                            Out of Stock
                        </option>
                    </select>
                </td>

                <td>
                    <select
                        class="branch-status-select"
                        data-product-id="${product.id}"
                        data-branch-code="coming-soon"
                        aria-label="Coming Soon branch availability for ${escapeHTML(product.product_name)}">

                        <option value="available"
                            ${comingSoonStatus === "available" ? "selected" : ""}>
                            Available
                        </option>

                        <option value="out_of_stock"
                            ${comingSoonStatus === "out_of_stock" ? "selected" : ""}>
                            Out of Stock
                        </option>

                        <option value="coming_soon"
                            ${comingSoonStatus === "coming_soon" ? "selected" : ""}>
                            Coming Soon
                        </option>
                    </select>
                </td>

                <td>
    <div class="product-actions">
        <button
            type="button"
            class="edit-product-btn"
            data-product-id="${product.id}"
            title="Edit Product">
            <i class="fas fa-edit"></i> Edit
        </button>

        <button
            type="button"
            class="delete-product-btn"
            data-product-id="${product.id}"
            title="Delete Product">
            <i class="fas fa-trash"></i> Delete
        </button>
    </div>
</td>
            `;

            productTableBody.appendChild(row);
        });
    }

    /* =========================================
   EDIT PRODUCT
========================================= */

productTableBody.addEventListener("click", async event => {

    const editButton = event.target.closest(".edit-product-btn");
    const deleteButton = event.target.closest(".delete-product-btn");

    // EDIT PRODUCT
    if (editButton) {

        const productId = editButton.dataset.productId;

        const product = products.find(item =>
            item.id === productId
        );

        if (!product) {
            alert("Product not found.");
            return;
        }

        editingProductId = product.id;
        existingImageUrl = product.image_url || null;
        selectedImage = null;

        productForm.reset();

        productName.value = product.product_name || "";
        productCategory.value = product.category || "";
        productDescription.value = product.description || "";

        mainBranchStatus.value = getProductBranchStatus(
            product.id,
            "main"
        );

        comingSoonBranchStatus.value = getProductBranchStatus(
            product.id,
            "coming-soon"
        );

        productImage.value = "";

        if (existingImageUrl) {
            imagePreview.src = existingImageUrl;
            imagePreviewContainer.hidden = false;
            imagePreviewContainer.style.display = "block";
        } else {
            imagePreview.src = "";
            imagePreviewContainer.hidden = true;
            imagePreviewContainer.style.display = "none";
        }

        $("productFormTitle").textContent = "Edit Product";

        saveProductButton.innerHTML =
            '<i class="fas fa-save"></i> Update Product';

        showFormMessage("");

        openProductForm();

        return;
    }

    // DELETE PRODUCT
    if (deleteButton) {

        const productId = deleteButton.dataset.productId;

        const product = products.find(item =>
            item.id === productId
        );

        if (!product) {
            alert("Product not found.");
            return;
        }

        const confirmed = confirm(
            `Are you sure you want to delete "${product.product_name}"?\n\nThis product will be removed from the active catalog.`
        );

        if (!confirmed) return;

        deleteButton.disabled = true;
        deleteButton.innerHTML = "Deleting...";

        try {

            const { error } = await supabaseClient
                .from("products")
                .update({
                    is_active: false
                })
                .eq("id", productId);

            if (error) throw error;

            alert("Product deleted successfully.");

            await loadProducts();

        } catch (error) {

            console.error("Delete product error:", error);

            alert(
                "Unable to delete product: " +
                (error.message || "Please try again.")
            );

            deleteButton.disabled = false;
            deleteButton.innerHTML =
                '<i class="fas fa-trash"></i> Delete';
        }
    }
});


    /* =========================================
       UPDATE BRANCH AVAILABILITY
    ========================================= */

    async function updateBranchAvailability(
        productId,
        branchCode,
        newStatus,
        selectElement
    ) {

        const branch = getBranch(branchCode);

        if (!branch) {
            alert("Branch not found.");
            return;
        }

        const previousStatus = getProductBranchStatus(
            productId,
            branchCode
        );

        selectElement.disabled = true;

        try {

            const existingRecord = branchAvailability.find(item =>
                item.product_id === productId &&
                item.branch_id === branch.id
            );

            const updateData = {
                product_id: productId,
                branch_id: branch.id,
                availability_status: newStatus
            };

            if (existingRecord) {

                const { data, error } = await supabaseClient
                    .from("branch_product_availability")
                    .update({
                        availability_status: newStatus
                    })
                    .eq("product_id", productId)
                    .eq("branch_id", branch.id)
                    .select(`
                        id,
                        product_id,
                        branch_id,
                        stock_quantity,
                        low_stock_threshold,
                        availability_status
                    `)
                    .single();

                if (error) throw error;

                branchAvailability = branchAvailability.map(item =>
                    item.id === data.id ? data : item
                );

            } else {

                const { data, error } = await supabaseClient
                    .from("branch_product_availability")
                    .insert(updateData)
                    .select(`
                        id,
                        product_id,
                        branch_id,
                        stock_quantity,
                        low_stock_threshold,
                        availability_status
                    `)
                    .single();

                if (error) throw error;

                branchAvailability.push(data);
            }

            renderProducts();
            updateDashboardSummary();

        } catch (error) {

            console.error("Availability update error:", error);

            alert(
                "Unable to update availability: " +
                (error.message || "Please try again.")
            );

            selectElement.value = previousStatus;

        } finally {

            selectElement.disabled = false;
        }
    }


    /* LISTEN FOR BRANCH STATUS CHANGES */

    productTableBody.addEventListener("change", event => {

        const selectElement = event.target.closest(
            ".branch-status-select"
        );

        if (!selectElement) return;

        const productId = selectElement.dataset.productId;
        const branchCode = selectElement.dataset.branchCode;
        const newStatus = selectElement.value;

        updateBranchAvailability(
            productId,
            branchCode,
            newStatus,
            selectElement
        );
    });


    /* =========================================
       DASHBOARD SUMMARY
    ========================================= */

    function updateDashboardSummary() {

    const total = products.length;

    // Count products available in at least one branch.
    const available = products.filter(product => {

        const mainStatus = getProductBranchStatus(
            product.id,
            "main"
        );

        const comingSoonStatus = getProductBranchStatus(
            product.id,
            "coming-soon"
        );

        return (
            mainStatus === "available" ||
            comingSoonStatus === "available"
        );

    }).length;


    // Count products that are out of stock in at least one branch.
    const outOfStock = products.filter(product => {

        const mainStatus = getProductBranchStatus(
            product.id,
            "main"
        );

        const comingSoonStatus = getProductBranchStatus(
            product.id,
            "coming-soon"
        );

        return (
            mainStatus === "out_of_stock" ||
            comingSoonStatus === "out_of_stock"
        );

    }).length;


    totalProducts.textContent = total;
    availableProducts.textContent = available;
    outOfStockProducts.textContent = outOfStock;
}


    /* =========================================
       OPEN AND CLOSE PRODUCT FORM
    ========================================= */

    function openProductForm() {

        productFormContainer.hidden = false;
        productFormContainer.style.display = "block";

        productFormMessage.textContent = "";

        productForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    function closeForm() {

    productForm.reset();

    selectedImage = null;
    editingProductId = null;
    existingImageUrl = null;

    imagePreviewContainer.hidden = true;
    imagePreviewContainer.style.display = "none";
    imagePreview.src = "";

    productFormMessage.textContent = "";

    $("productFormTitle").textContent = "Add New Product";

    saveProductButton.innerHTML =
        '<i class="fas fa-save"></i> Save Product';

    productFormContainer.hidden = true;
    productFormContainer.style.display = "none";
}


    addProductButton.addEventListener("click", openProductForm);

    closeProductForm.addEventListener("click", closeForm);

    cancelProductButton.addEventListener("click", closeForm);


    /* =========================================
       IMAGE PREVIEW
    ========================================= */

    productImage.addEventListener("change", () => {

        const file = productImage.files[0];

        if (!file) {
            selectedImage = null;
            imagePreviewContainer.hidden = true;
            imagePreviewContainer.style.display = "none";
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {

            showFormMessage(
                "Please select a JPG, PNG, or WEBP image."
            );

            productImage.value = "";
            selectedImage = null;
            imagePreviewContainer.hidden = true;
            imagePreviewContainer.style.display = "none";

            return;
        }

        if (file.size > 5 * 1024 * 1024) {

            showFormMessage(
                "Image size must not exceed 5MB."
            );

            productImage.value = "";
            selectedImage = null;
            imagePreviewContainer.hidden = true;
            imagePreviewContainer.style.display = "none";

            return;
        }

        selectedImage = file;

        const reader = new FileReader();

        reader.onload = event => {
            imagePreview.src = event.target.result;
            imagePreviewContainer.hidden = false;
            imagePreviewContainer.style.display = "block";
        };

        reader.readAsDataURL(file);

        productFormMessage.textContent = "";
    });


    /* =========================================
       UPLOAD PRODUCT IMAGE
    ========================================= */

    async function uploadProductImage(file) {

        const safeFileName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, "-");

        const filePath =
            `products/${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabaseClient
            .storage
            .from("product-images")
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data } = supabaseClient
            .storage
            .from("product-images")
            .getPublicUrl(filePath);

        return {
            imageUrl: data.publicUrl,
            filePath
        };
    }


    /* =========================================
   ADD AND UPDATE PRODUCT
========================================= */

productForm.addEventListener("submit", async event => {

    event.preventDefault();

    const name = productName.value.trim();
    const category = productCategory.value;
    const description = productDescription.value.trim();

    const mainStatus = mainBranchStatus.value;
    const comingStatus = comingSoonBranchStatus.value;

    if (!name || !category) {
        showFormMessage(
            "Please complete the product name and category."
        );
        return;
    }

    const isEditing = Boolean(editingProductId);

    saveProductButton.disabled = true;
    saveProductButton.textContent =
        isEditing ? "Updating..." : "Saving...";

    productFormMessage.textContent = "";

    let uploadedFilePath = null;

    try {

        let imageUrl = existingImageUrl;

        // Upload a new image if selected
        if (selectedImage) {

            const uploadedImage =
                await uploadProductImage(selectedImage);

            imageUrl = uploadedImage.imageUrl;
            uploadedFilePath = uploadedImage.filePath;
        }

        const productData = {
            product_name: name,
            category,
            description: description || null,
            image_url: imageUrl,
            updated_at: new Date().toISOString()
        };

        let productId = editingProductId;

        // ADD NEW PRODUCT
        if (!isEditing) {

            const { data: newProduct, error } =
                await supabaseClient
                    .from("products")
                    .insert({
                        ...productData,
                        stock_quantity: 0,
                        low_stock_threshold: 5,
                        is_active: true
                    })
                    .select("id")
                    .single();

            if (error) throw error;

            productId = newProduct.id;

        } else {

            // UPDATE EXISTING PRODUCT
            const { error } = await supabaseClient
                .from("products")
                .update(productData)
                .eq("id", productId);

            if (error) throw error;
        }

        // UPDATE BOTH BRANCH AVAILABILITY RECORDS
        const mainBranch = getBranch("main");
        const comingBranch = getBranch("coming-soon");

        const availabilityRecords = [
            {
                product_id: productId,
                branch_id: mainBranch.id,
                availability_status: mainStatus
            },
            {
                product_id: productId,
                branch_id: comingBranch.id,
                availability_status: comingStatus
            }
        ];

        const { error: availabilityError } =
            await supabaseClient
                .from("branch_product_availability")
                .upsert(
                    availabilityRecords,
                    {
                        onConflict: "product_id,branch_id"
                    }
                );

        if (availabilityError) throw availabilityError;

        showFormMessage(
            isEditing
                ? "Product updated successfully!"
                : "Product added successfully!",
            "success"
        );

        await loadProducts();

        setTimeout(() => {
            closeForm();
        }, 1000);

    } catch (error) {

        console.error("Product save error:", error);

        // Remove a newly uploaded image if saving failed
        if (uploadedFilePath) {

            const { error: cleanupError } =
                await supabaseClient
                    .storage
                    .from("product-images")
                    .remove([uploadedFilePath]);

            if (cleanupError) {
                console.error(
                    "Image cleanup error:",
                    cleanupError
                );
            }
        }

        showFormMessage(
            error.message || "Unable to save product."
        );

    } finally {

        saveProductButton.disabled = false;

        saveProductButton.innerHTML =
            editingProductId
                ? '<i class="fas fa-save"></i> Update Product'
                : '<i class="fas fa-save"></i> Save Product';
    }
});


    /* =========================================
       SEARCH AND FILTER
    ========================================= */

    productSearch.addEventListener("input", renderProducts);

    statusFilter.addEventListener("change", renderProducts);


    /* =========================================
       LOGOUT
    ========================================= */

    logoutButton.addEventListener("click", async event => {

        event.preventDefault();

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Logout error:", error);
            alert("Unable to log out. Please try again.");
            return;
        }

        window.location.replace("login.html");
    });


    /* =========================================
       MOBILE SIDEBAR
    ========================================= */

    menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("active");
    });


    /* =========================================
       DATE AND YEAR
    ========================================= */

    const currentDate = $("currentDate");
    const currentYear = $("currentYear");

    if (currentDate) {
        currentDate.textContent = new Date().toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
    }

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }


    /* =========================================
       INITIAL LOAD
    ========================================= */

    try {

        await loadBranches();
        await loadProducts();

    } catch (error) {

        console.error("Dashboard loading error:", error);

        productTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    Unable to load dashboard data.
                </td>
            </tr>
        `;
    }
}


/* =========================================
   START DASHBOARD AFTER AUTH CHECK
========================================= */

(async () => {

    try {

        const authorized = await protectDashboard();

        if (authorized) {
            await initializeDashboard();
        }

    } catch (error) {

        console.error("Dashboard initialization error:", error);

        window.location.replace("login.html");
    }

})();
