document.addEventListener("DOMContentLoaded", () => {
    // --- Authentication Modal ---
    const authModal = document.getElementById("auth-modal");
    const profileBtn = document.getElementById("profile-btn");
    const closeAuth = authModal.querySelector(".close");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const showRegister = document.getElementById("show-register");
    const showLogin = document.getElementById("show-login");

    // --- Two-Factor Authentication Modal ---
    function show2FAModal(username) {
        const modal = document.getElementById("twofa-modal");
        if (!modal) return;

        modal.style.display = "block";

        // --- Polling Logic ---
        let isPolling = true;
        const poll = () => {
            if (!isPolling) return; // Stop if polling is disabled

            fetch(`/api/telegram_2fa_status/?username=${username}`)
                .then(res => res.json())
                .then(data => {
                    if (data.confirmed) {
                        isPolling = false; // Stop polling
                        window.location.reload(); // Reload on success
                    } else {
                        setTimeout(poll, 2000); // Continue polling
                    }
                })
                .catch(err => {
                    console.error("Error checking 2FA status:", err);
                    setTimeout(poll, 5000); // Retry after a longer delay on error
                });
        };

        poll(); // Start polling

        // Optional: Stop polling if the modal is closed manually
        const closeBtn = modal.querySelector(".close");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                isPolling = false;
                modal.style.display = "none";
            });
        }
    }

    // Call this function if Django sets a JS variable `window.show2faUser` with the username
    if (window.show2faUser) {
        show2FAModal(window.show2faUser);
    }

    // Check if user is authenticated by looking for a greeting message
    const greetingBlock = authModal.querySelector("h2");
    const isAuthenticated = greetingBlock && greetingBlock.textContent.startsWith("Hi,");

    if (isAuthenticated) {
        if (loginForm) loginForm.style.display = "none";
        if (registerForm) registerForm.style.display = "none";
    } else {
        loginForm.style.display = "none";
        registerForm.style.display = "block";
    }

    const openAuthModal = () => authModal.classList.add("active");
    const closeAuthModal = () => authModal.classList.remove("active");

    profileBtn.addEventListener("click", openAuthModal);
    closeAuth.addEventListener("click", closeAuthModal);
    window.addEventListener("click", (e) => {
        if (e.target === authModal) closeAuthModal();
    });

    if (!isAuthenticated) {
        showRegister.addEventListener("click", (e) => {
            e.preventDefault();
            loginForm.style.display = "none";
            registerForm.style.display = "block";
        });

        showLogin.addEventListener("click", (e) => {
            e.preventDefault();
            registerForm.style.display = "none";
            loginForm.style.display = "block";
        });
    }

    // --- Notifications Dropdown ---
    const bellBtn = document.getElementById("bell");
    const notificationsDropdown = document.querySelector(".notifications-dropdown");
    const notificationsList = document.getElementById("notifications-list");

    // --- Telegram Notify Switch ---
    const tgNotifySwitch = document.getElementById("tg-notify-switch");
    if (tgNotifySwitch) {
        tgNotifySwitch.addEventListener("change", function () {
            fetch("/api/tg_notify_toggle/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({ enabled: tgNotifySwitch.checked })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.status !== "ok") {
                        alert("Error when changing alert status!");
                    }
                });
        });
    }

    // --- Two-Factor Auth Switch ---
    const tg2faSwitch = document.getElementById("tg-2fa-switch");
    if (tg2faSwitch) {
        tg2faSwitch.addEventListener("change", function () {
            fetch("/api/tg_2fa_toggle/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({ enabled: tg2faSwitch.checked })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.status !== "ok") {
                        alert("Error when changing status 2FA!");
                    }
                });
        });
    }

    if (notificationsList && notificationsList.children.length === 0) {
        const li = document.createElement("li");
        li.classList.add("no-notifications");
        li.textContent = "You have no notifications";
        notificationsList.appendChild(li);
    }

    const toggleNotifications = () => {
        notificationsDropdown.classList.toggle("active");
    };

    bellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleNotifications();
    });

    window.addEventListener("click", () => {
        notificationsDropdown.classList.remove("active");
    });

    notificationsDropdown.addEventListener("click", (e) => e.stopPropagation());
});
