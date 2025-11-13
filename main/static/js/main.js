/**
 * TaskForge - основний JavaScript файл
 * Імпортує всі компоненти та утиліти JavaScript
 * 
 * Цей файл ініціалізує глобальні функції та утиліти,
 * які можуть бути використані іншими компонентами
 */

// Завантаження компонентів та утиліт
// Функції залежать від порядку завантаження, не змінюйте його без необхідності

// Базовые модальные компоненты (сначала базовый, потом специфичные)
document.write('<script src="/static/js/components/modals/base-modal.js"></script>');
document.write('<script src="/static/js/components/modals/auth-modal.js"></script>');
document.write('<script src="/static/js/components/modals/2fa-modal.js"></script>');
document.write('<script src="/static/js/components/modals/create-modal.js"></script>');
document.write('<script src="/static/js/components/modals/support-modal.js"></script>');
document.write('<script src="/static/js/components/modals/dropdown-modal.js"></script>');

// Остальные компоненты
document.write('<script src="/static/js/utils/templates.js"></script>');
document.write('<script src="/static/js/components/calendar.js"></script>');
document.write('<script src="/static/js/components/calendar-habits.js"></script>');
document.write('<script src="/static/js/components/stats-dashboard.js"></script>');
document.write('<script src="/static/js/components/progress-text.js"></script>');
document.write('<script src="/static/js/components/notification.js"></script>');
document.write('<script src="/static/js/components/subgoal.js"></script>');
document.write('<script src="/static/js/components/index-subgoals.js"></script>');
document.write('<script src="/static/js/components/habit-checkbox.js"></script>');

// МАКСИМАЛЬНО РАННЕЕ начало загрузки данных привычек
document.addEventListener('DOMContentLoaded', function () {
	// Запускаем предварительную загрузку данных НЕМЕДЛЕННО
	if (typeof preloadHabitsData === 'function') {
		preloadHabitsData();
	}

	// ДОПОЛНИТЕЛЬНО: если календарь готов, запускаем загрузку сразу
	if (typeof loadHabitsCompletionHistory === 'function') {
		loadHabitsCompletionHistory();
	}
}, { once: true });


// Ініціалізація скриптів при завантаженні DOM
document.addEventListener('DOMContentLoaded', function () {
	// Проверяем наличие кнопки админ панели и добавляем класс к navbar
	const adminLink = document.querySelector('.admin-link');
	const navbar = document.querySelector('header.nav-bar');
	if (adminLink && navbar) {
		navbar.classList.add('has-admin-btn');
	}

	// Переміщення прогрес-кола на мобільних
	repositionProgressCircle();

	// Ініціалізація глобальних утиліт
	initGlobalUtils();

	// Ініціалізація базовых модальных обработчиков
	if (typeof initBaseModalHandlers === 'function') initBaseModalHandlers();

	// Ініціалізація модальных компонентов
	if (typeof initAuthModals === 'function') initAuthModals();
	if (typeof initCreateModals === 'function') initCreateModals();
	if (typeof initSupportModal === 'function') initSupportModal();

	// ВАЖНО: Инициализация dropdown (колокольчик уведомлений)
	console.log('🔔 Checking for initDropdownModals...');
	if (typeof initDropdownModals === 'function') {
		console.log('🔔 Calling initDropdownModals...');
		initDropdownModals();
	} else {
		console.error('❌ initDropdownModals function not found!');
	}

	// Ініціалізація Telegram настроек
	if (typeof initTelegramSettings === 'function') initTelegramSettings();

	// Ініціалізація остальных компонентов
	if (typeof initTemplates === 'function') initTemplates();
	if (typeof initCalendar === 'function') initCalendar();
	if (typeof initStatsDashboard === 'function') initStatsDashboard();
	if (typeof initProgressText === 'function') initProgressText();

	// Перевіряємо, що система сповіщень завантажена
	console.log('window.notifications доступний:', !!window.notifications);

	// Инициализация обработчиков подцелей зависит от страницы
	// Для главной страницы уже инициализируется автоматически в index-subgoals.js
	// Для страницы целей уже инициализируется автоматически в subgoal.js

	// Ініціалізація обработчиков привычек на главной странице
	if (typeof initHabitCheckboxHandlers === 'function') initHabitCheckboxHandlers();

	// Перевірка та ініціалізація 2FA модального вікна, якщо необхідно
	if (window.show2faUser) {
		console.log('🔄 2FA user detected:', window.show2faUser);
		console.log('🔄 DOM ready, showing 2FA modal via modular component');

		// Небольшая задержка для полной загрузки DOM и модулей
		setTimeout(() => {
			// Используем функции из модуля 2fa-modal.js
			if (typeof show2FAModal === 'function') {
				show2FAModal();
			}
			if (typeof startPollingForAuth === 'function') {
				startPollingForAuth(window.show2faUser);
			}
		}, 100);
	}
});

/**
 * Ініціалізує глобальні утиліти
 */
function initGlobalUtils() {
	// Ініціалізація функції для отримання CSRF токену
	window.getCSRFToken = function () {
		const name = 'csrftoken';
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) return parts.pop().split(';').shift();
		return '';
	};

	// Ініціалізація глобальної функції для показу повідомлень
	// Використовує централизовану систему з notification.js
	window.showMessage = function (message, type = 'info', duration = 5000) {
		console.log('🌟 [GLOBAL] window.showMessage called:', message, type);

		// Делегируем централизованной системе уведомлений
		if (typeof showNotification === 'function') {
			return showNotification(message, type, duration);
		} else {
			console.warn('⚠️ showNotification not available yet');
		}
	};
}

/**
 * Переміщення прогрес-кола на мобільних пристроях
 */
function repositionProgressCircle() {
	const progressContainer = document.querySelector('.monthly-progress-container');
	const createBtn = document.querySelector('.create-goal-btn');
	const welcomeTextContainer = document.querySelector('.welcome-text-container');

	if (!progressContainer || !createBtn || !welcomeTextContainer) return;

	function moveCircle() {
		if (window.innerWidth <= 768) {
			// На мобільних: переміщуємо в create-goal-btn
			if (progressContainer.parentElement !== createBtn) {
				createBtn.appendChild(progressContainer);
			}
		} else {
			// На десктопі: повертаємо в welcome-text-container
			if (progressContainer.parentElement !== welcomeTextContainer) {
				welcomeTextContainer.appendChild(progressContainer);
			}
		}
	}

	// Виконуємо при завантаженні
	moveCircle();

	// Виконуємо при зміні розміру вікна
	window.addEventListener('resize', moveCircle);
}