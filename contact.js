
document.addEventListener("DOMContentLoaded", function () {

    // =====================================
    // SUPABASE CONFIGURATION
    // =====================================

    const SUPABASE_URL = "https://pgsfcplwdruttyaggvvu.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_E2Fm2FHuHeLhD1IvEONP3g_I0Mno3BW";

    const FUNCTION_URL =
        `${SUPABASE_URL}/functions/v1/send-inquiry`;

    // =====================================
    // FORM ELEMENTS
    // =====================================

    const contactForm = document.getElementById("contactForm");
    const formStatus = document.getElementById("formStatus");
    const subjectSelect = document.getElementById("subject");

    const applicationFields =
        document.getElementById("applicationFields");

    const positionInput = document.getElementById("position");
    const resumeInput = document.getElementById("resume");
    const applicationConsent =
        document.getElementById("applicationConsent");

    const submitButton =
        contactForm.querySelector('button[type="submit"]');

    const menuToggle = document.getElementById("menuToggle");
    const navlinks = document.getElementById("navlinks");

    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    // =====================================
    // APPLICATION FIELD VISIBILITY
    // =====================================

    function updateApplicationFields() {

        const isApplication = subjectSelect.value === "Apply";

        applicationFields.hidden = !isApplication;

        positionInput.required = isApplication;
        resumeInput.required = isApplication;
        applicationConsent.required = isApplication;

        if (!isApplication) {
            positionInput.value = "";
            resumeInput.value = "";
            applicationConsent.checked = false;
        }

        formStatus.textContent = "";
    }

    subjectSelect.addEventListener(
        "change",
        updateApplicationFields
    );

    // =====================================
    // RESUME VALIDATION
    // =====================================

    function validateResume() {

        const file = resumeInput.files[0];

        if (!file) {
            return "Please upload your resume or CV.";
        }

        const allowedExtensions = [".pdf", ".docx"];

        const fileName = file.name.toLowerCase();

        const isValidExtension = allowedExtensions.some(
            extension => fileName.endsWith(extension)
        );

        if (!isValidExtension) {
            return "Please upload a PDF or DOCX file.";
        }

        if (file.size === 0 || file.size > MAX_FILE_SIZE) {
            return "Your resume must be greater than 0 bytes and must not exceed 5 MB.";
        }

        return "";
    }

    // =====================================
    // FORM SUBMISSION
    // =====================================

    contactForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        formStatus.textContent = "";
        formStatus.style.color = "#B42318";

        if (!contactForm.checkValidity()) {
            contactForm.reportValidity();
            return;
        }

        const isApplication = subjectSelect.value === "Apply";

        // =====================================
        // APPLICATION VALIDATION
        // =====================================

        if (isApplication) {

            const resumeError = validateResume();

            if (resumeError) {
                formStatus.textContent = resumeError;
                return;
            }

            if (!applicationConsent.checked) {
                formStatus.textContent =
                    "Please provide consent before submitting your application.";
                return;
            }
        }

        // Prevent repeated submissions
        submitButton.disabled = true;
        submitButton.textContent = isApplication
            ? "Submitting Application..."
            : "Sending...";

        try {

            let response;

            // =====================================
            // APPLICATION SUBMISSION
            // =====================================

            if (isApplication) {

                const formData = new FormData();

                formData.append(
                    "fullName",
                    document.getElementById("fullName").value.trim()
                );

                formData.append(
                    "email",
                    document.getElementById("email").value.trim()
                );

                formData.append(
                    "phone",
                    document.getElementById("phone").value.trim()
                );

                formData.append(
                    "subject",
                    "Apply"
                );

                formData.append(
                    "position",
                    positionInput.value.trim()
                );

                formData.append(
                    "message",
                    document.getElementById("message").value.trim()
                );

                formData.append(
                    "resume",
                    resumeInput.files[0]
                );

                formData.append(
                    "applicationConsent",
                    "true"
                );

                response = await fetch(FUNCTION_URL, {
                    method: "POST",
                    headers: {
                        "apikey": SUPABASE_ANON_KEY
                    },
                    body: formData
                });

            } else {

                // =====================================
                // NORMAL INQUIRY SUBMISSION
                // =====================================

                const formData = {
                    fullName: document.getElementById("fullName").value.trim(),
                    email: document.getElementById("email").value.trim(),
                    phone: document.getElementById("phone").value.trim(),
                    subject: subjectSelect.value,
                    message: document.getElementById("message").value.trim()
                };

                response = await fetch(FUNCTION_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify(formData)
                });
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to submit your form."
                );
            }

            if (!result.success) {
                throw new Error(
                    result.error || "Something went wrong."
                );
            }

            // =====================================
            // SUCCESS MESSAGE
            // =====================================

            if (isApplication) {

                if (result.emailSent) {
                    formStatus.textContent =
                        "Thank you! Your application has been submitted successfully.";
                } else {
                    formStatus.textContent =
                        "Your application was saved, but the HR notification could not be sent.";
                }

            } else {

                if (result.emailSent) {
                    formStatus.textContent =
                        "Thank you! Your inquiry has been submitted successfully.";
                } else {
                    formStatus.textContent =
                        "Your inquiry was saved, but the email notification could not be sent.";
                }
            }

            formStatus.style.color = "#08734C";

            contactForm.reset();
            updateApplicationFields();

        } catch (error) {

            console.error("Contact form error:", error);

            formStatus.textContent =
                error.message ||
                "Unable to submit your form. Please try again.";

            formStatus.style.color = "#B42318";

        } finally {

            submitButton.disabled = false;
            submitButton.textContent = "Send Message";

        }

    });


    // =====================================
    // SCROLL REVEAL ANIMATIONS
    // =====================================

    if ("IntersectionObserver" in window) {

        const revealElements = [
            {
                selector: ".contact-hero",
                className: "contact-hero-reveal"
            },
            {
                selector: ".contact-info",
                className: "contact-info-reveal"
            },
            {
                selector: ".contact-form-card",
                className: "contact-form-reveal"
            },
            {
                selector: ".info-item",
                className: "contact-item-reveal"
            },
            {
                selector: ".contact-note",
                className: "contact-note-reveal"
            },
            {
                selector: ".location-heading",
                className: "location-heading-reveal"
            },
            {
                selector: ".map-card",
                className: "map-card-reveal"
            }
        ];

        const revealObserver = new IntersectionObserver(
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

        revealElements.forEach(item => {

            document.querySelectorAll(item.selector).forEach(element => {

                element.classList.add(item.className);

                revealObserver.observe(element);

            });

        });

    }

    // =====================================
    // MOBILE NAVIGATION
    // =====================================

    if (menuToggle && navlinks) {

        menuToggle.addEventListener("click", function () {

            const isOpen = navlinks.classList.toggle("active");

            menuToggle.setAttribute("aria-expanded", isOpen);

        });

    }

    updateApplicationFields();

});
