/**
 * Dropdown modal component for TaskForge
 * Handles profile dropdown and notifications dropdown
 */
console.log('Dropdown modal component initialized');

/**
 * Инициализирует выпадающие меню
 */
function initDropdownModals() {
	console.log('🔧 Initializing dropdown modals...');

	// Инициализируем выпадающие меню
	initDropdownMenus();
	initNotificationsDropdown();

	console.log('✅ Dropdown modals initialized');
}

/**
 * Инициализирует выпадающие меню профиля и уведомлений
 */
function initDropdownMenus() {
	console.log('🔧 Initializing dropdown menus...');

	const profileButton = document.getElementById("profile-dropdown-btn");
	const profileDropdown = document.getElementById("profile-dropdown");
	const bellBtn = document.getElementById("bell");
	const notificationsDropdown = document.querySelector(".notifications-dropdown");

	console.log('🔧 Dropdown elements found:', {
		profileButton: !!profileButton,
		profileDropdown: !!profileDropdown,
		bellBtn: !!bellBtn,
		notificationsDropdown: !!notificationsDropdown
	});

	// Обработка кнопки профиля (выпадающее меню) - только для авторизованных
	if (profileButton && profileDropdown) {
		console.log('Profile dropdown button found, adding event listener');
		profileButton.addEventListener("click", function (e) {
			e.stopPropagation();
			console.log('Profile dropdown button clicked');

			// Закрываем уведомления, если открыты
			if (notificationsDropdown) {
				notificationsDropdown.classList.remove("active");
			}

			// Переключаем выпадающее меню профиля
			profileDropdown.classList.toggle("active");
		});
	}

	// Обработка кнопки уведомлений
	if (bellBtn && notificationsDropdown) {
		console.log('Bell button found, adding event listener');
		bellBtn.addEventListener("click", function (e) {
			e.stopPropagation();
			console.log('Bell button clicked');

			// Проверяем авторизацию
			if (!isUserAuthenticated()) {
				showMessage('You need to register or log in to view notifications', 'info');
				return;
			}

			// Закрываем профиль, если открыт
			if (profileDropdown) {
				profileDropdown.classList.remove("active");
			}

			// Переключаем выпадающее меню уведомлений
			notificationsDropdown.classList.toggle("active");
		});
	}

	// Закрытие выпадающих меню при клике вне их
	document.addEventListener("click", function (e) {
		// Закрываем профиль, если клик не по нему
		if (profileDropdown && !e.target.closest('#profile-dropdown') && !e.target.closest('#profile-dropdown-btn')) {
			profileDropdown.classList.remove("active");
		}

		// Закрываем уведомления, если клик не по ним
		if (notificationsDropdown && !e.target.closest('.notifications-dropdown') && !e.target.closest('#bell')) {
			notificationsDropdown.classList.remove("active");
		}
	});

	// Предотвращаем закрытие при клике внутри выпадающих меню
	if (profileDropdown) {
		profileDropdown.addEventListener("click", (e) => e.stopPropagation());
	}
	if (notificationsDropdown) {
		notificationsDropdown.addEventListener("click", (e) => e.stopPropagation());
	}

	console.log('✅ Dropdown menus initialized');
}

/**
 * Инициализирует выпадающее меню уведомлений
 */
function initNotificationsDropdown() {
	console.log('🔧 Initializing notifications dropdown...');

	const notificationsList = document.getElementById("notifications-list");

	// Добавляем сообщение "No notifications" если список пуст
	if (notificationsList && notificationsList.children.length === 0) {
		const noNotificationsItem = document.createElement('li');
		noNotificationsItem.className = 'no-notifications';
		noNotificationsItem.textContent = 'No notifications';
		noNotificationsItem.style.cssText = `
			padding: 15px;
			text-align: center;
			color: var(--text-secondary, #666);
			font-style: italic;
			border-bottom: none;
		`;
		notificationsList.appendChild(noNotificationsItem);
		console.log('✅ Added "No notifications" message');
	}

	console.log('✅ Notifications dropdown initialized');
}

/**
 * Проверяет, авторизован ли пользователь
 * @returns {boolean}
 */
function isUserAuthenticated() {
	// Проверяем по классу body (самый надежный способ)
	if (document.body.classList.contains('authenticated')) {
		return true;
	}

	// Проверяем глобальную функцию
	if (typeof window.isAuthenticated === 'function') {
		return window.isAuthenticated();
	}

	// Проверяем по наличию элементов профиля
	const profileDropdown = document.getElementById('profile-dropdown');
	if (profileDropdown) {
		return true; // если есть dropdown профиля, значит пользователь авторизован
	}

	// Проверяем по содержимому модального окна авторизации
	const authModal = document.getElementById('auth-modal');
	if (authModal) {
		const greeting = authModal.querySelector('h2');
		if (greeting && greeting.textContent.startsWith('Hi,')) {
			return true;
		}
	}

	// По умолчанию считаем не авторизованным
	return false;
}

/**
 * Показывает сообщение
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип сообщения (info, success, error, warning)
 */
function showMessage(message, type = 'info') {
	// Используем глобальную функцию, если доступна
	if (typeof window.showMessage === 'function') {
		window.showMessage(message, type);
	} else if (window.notifications && typeof window.notifications.show === 'function') {
		window.notifications.show(message, type, 3000);
	} else {
		// Fallback: простое alert
		alert(message);
	}
}

// Добавляем тестовую функцию
window.testDropdowns = function () {
	console.log('🧪 Testing dropdowns...');
	console.log('User authenticated:', isUserAuthenticated());

	const bellBtn = document.getElementById("bell");
	const profileBtn = document.getElementById("profile-dropdown-btn");

	console.log('Elements found:', {
		bellBtn: !!bellBtn,
		profileBtn: !!profileBtn
	});

	if (bellBtn) {
		console.log('Testing bell button...');
		bellBtn.click();
	}
};