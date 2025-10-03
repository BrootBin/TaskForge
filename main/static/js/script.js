document.addEventListener("DOMContentLoaded", () => {
    // --- Authentication Modal ---
    const authModal = document.getElementById("auth-modal");
    const profileBtn = document.getElementById("profile-btn");
    const closeAuth = authModal.querySelector(".close");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const showRegister = document.getElementById("show-register");
    const showLogin = document.getElementById("show-login");

    // Показати реєстрацію за замовчуванням
    loginForm.style.display = "none";
    registerForm.style.display = "block";

    const openAuthModal = () => authModal.classList.add("active");
    const closeAuthModal = () => authModal.classList.remove("active");

    profileBtn.addEventListener("click", openAuthModal);
    closeAuth.addEventListener("click", closeAuthModal);
    window.addEventListener("click", (e) => {
        if (e.target === authModal) closeAuthModal();
    });

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

    // --- Notifications Dropdown ---
    const bellBtn = document.getElementById("bell");
    const notificationsDropdown = document.querySelector(".notifications-dropdown");
    const notificationsList = document.getElementById("notifications-list");

    // Спочатку додамо елемент "немає повідомлень", якщо список порожній
    if (notificationsList.children.length === 0) {
        const li = document.createElement("li");
        li.classList.add("no-notifications");
        li.textContent = "У вас поки що немає сповіщень";
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
