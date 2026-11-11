
document.addEventListener("DOMContentLoaded", async () => {

    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("errorMessage");
    const togglePassword = document.getElementById("togglePassword");
    const currentYear = document.getElementById("currentYear");

    // SUPABASE CONNECTION
    const SUPABASE_URL = "https://pgsfcplwdruttyaggvvu.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_E2Fm2FHuHeLhD1IvEONP3g_I0Mno3BW";

    const { createClient } = supabase;

    const supabaseClient = createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    // DISPLAY CURRENT YEAR
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    // SHOW / HIDE PASSWORD
    togglePassword.addEventListener("click", () => {

        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        togglePassword.innerHTML = isPassword
            ? '<i class="fa-solid fa-eye-slash"></i>'
            : '<i class="fa-solid fa-eye"></i>';

        togglePassword.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );

    });

    // CHECK EXISTING SESSION
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session) {
        const { data: isAdmin, error } =
            await supabaseClient.rpc("is_blessing_admin");

        if (!error && isAdmin === true) {
            window.location.href = "dashboard.html";
            return;
        }

        await supabaseClient.auth.signOut();
    }

    // SUPABASE ADMIN LOGIN
    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        errorMessage.textContent = "";

        const submitButton = loginForm.querySelector(
            'button[type="submit"]'
        );

        submitButton.disabled = true;
        submitButton.innerHTML = "Signing in...";

        try {

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {
                throw error;
            }

            // VERIFY ADMIN PERMISSION
            const { data: isAdmin, error: adminError } =
                await supabaseClient.rpc("is_blessing_admin");

            if (adminError || isAdmin !== true) {

                await supabaseClient.auth.signOut();

                throw new Error(
                    "This account is not authorized to access the admin dashboard."
                );

            }

            window.location.href = "dashboard.html";

        } catch (error) {

            errorMessage.textContent =
                error.message || "Unable to sign in. Please try again.";

            passwordInput.value = "";
            passwordInput.focus();

        } finally {

            submitButton.disabled = false;
            submitButton.innerHTML =
                'Sign In <i class="fa-solid fa-arrow-right"></i>';

        }

    });

});
