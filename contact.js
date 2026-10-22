
document.addEventListener("DOMContentLoaded", function () {
    const contactForm = document.getElementById("contactForm");
    const formStatus = document.getElementById("formStatus");
    const subjectSelect = document.getElementById("subject");
    const emailInput = document.getElementById("email");

    // Recipient email for each inquiry type
    const inquiryEmails = {
        "Inquiry": "blessingpharmacysales@example.com",
        "Purchasing": "purchasing@example.com",
        "Quotation": "quotations@example.com",
        "Apply": "applications@example.com",
        "Partnership": "partnerships@example.com",
        "Other": "blessingpharmedsuppliestrading@gmail.com"
    };

    // Automatically fill the existing email field
    function updateEmail() {
        emailInput.value = inquiryEmails[subjectSelect.value] || "";
    }

    subjectSelect.addEventListener("change", updateEmail);

    // Validate the form when submitted
    contactForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const fullName = document.getElementById("fullName").value.trim();
        const email = emailInput.value.trim();
        const subject = subjectSelect.value;
        const message = document.getElementById("message").value.trim();

        if (!fullName || !email || !subject || !message) {
            formStatus.textContent =
                "Please complete all required fields.";
            formStatus.style.color = "#B42318";
            return;
        }

        formStatus.textContent =
            "Your form is ready, but message sending has not been configured yet.";
        formStatus.style.color = "#08734C";
    });
});


const menuToggle = document.getElementById("menuToggle");
const navlinks = document.getElementById("navlinks");

if (menuToggle && navlinks) {
    menuToggle.addEventListener("click", () => {
        const isOpen = navlinks.classList.toggle("active");
        menuToggle.setAttribute("aria-expanded", isOpen);
    });
}
