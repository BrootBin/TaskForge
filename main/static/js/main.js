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
document.write('<script src="/static/js/debug.js"></script>');

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
	// Ініціалізація глобальних утиліт
	initGlobalUtils();

	// Ініціалізація базовых модальных обработчиков
	if (typeof initBaseModalHandlers === 'function') initBaseModalHandlers();

	// Ініціалізація модальных компонентов
	if (typeof initAuthModals === 'function') initAuthModals();
	if (typeof initCreateModals === 'function') initCreateModals();
	if (typeof initSupportModal === 'function') initSupportModal();

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
	window.showMessage = function (message, type = 'info', duration = 5000) {
		console.log('🌟 [GLOBAL] window.showMessage called:', message, type);

		// Удаляем существующие уведомления
		const existingNotifications = document.querySelectorAll('.global-message-notification');
		existingNotifications.forEach(notif => notif.remove());

		// Створюємо елемент повідомлення
		const messageElement = document.createElement('div');
		messageElement.className = `global-message-notification message-${type}`;
		messageElement.textContent = message;

		// Новые стили с темным фоном и золотой окантовкой для успеха
		let styles = '';
		if (type === 'success') {
			styles = `
				background: linear-gradient(135deg, #2c3e50, #34495e);
				border-left: 4px solid #FFD700;
				color: #FFD700;
			`;
		} else if (type === 'error') {
			styles = `
				background: linear-gradient(135deg, #e74c3c, #c0392b);
				color: white;
			`;
		} else if (type === 'warning') {
			styles = `
				background: linear-gradient(135deg, #fff3cd, #ffeeba);
				color: #856404;
				border-left: 4px solid #ffc107;
			`;
		} else {
			styles = `
				background: linear-gradient(135deg, #2196F3, #0b7dda);
				color: white;
			`;
		}

		// Применяем стили
		messageElement.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			${styles}
			padding: 15px 20px;
			border-radius: 8px;
			z-index: 10000;
			opacity: 0;
			transform: translateX(100%);
			transition: all 0.3s ease;
			max-width: 350px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			font-weight: 500;
		`;

		document.body.appendChild(messageElement);

		// Анимация появления
		setTimeout(() => {
			messageElement.style.opacity = '1';
			messageElement.style.transform = 'translateX(0)';
		}, 100);

		// Видаляємо повідомлення через 5 секунд
		setTimeout(() => {
			messageElement.style.opacity = '0';
			setTimeout(() => {
				if (messageElement.parentNode) {
					messageElement.remove();
				}
			}, 500);
		}, duration || 5000);
	};
}