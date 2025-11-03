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
document.write('<script src="/static/js/components/support-modal.js"></script>');

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


// Ініціалізація скриптів при завантаженні DOM
document.addEventListener('DOMContentLoaded', function () {
	console.log('TaskForge JS initialized');

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
		// Перевіряємо наявність контейнера
		let messageContainer = document.getElementById('message-container');
		if (!messageContainer) {
			// Створюємо контейнер для повідомлень
			messageContainer = document.createElement('div');
			messageContainer.id = 'message-container';
			messageContainer.style.position = 'fixed';
			messageContainer.style.top = '20px';
			messageContainer.style.right = '20px';
			messageContainer.style.zIndex = '10000';
			messageContainer.style.maxWidth = '400px';
			document.body.appendChild(messageContainer);
		}

		// Створюємо елемент повідомлення
		const messageElement = document.createElement('div');
		messageElement.className = `message ${type}`;
		messageElement.textContent = message;

		// Стилізація повідомлення з використанням CSS-змінних
		messageElement.style.backgroundColor = type === 'error' ? 'var(--danger)' :
			type === 'success' ? 'var(--success)' :
				'var(--primary)';
		messageElement.style.color = 'var(--text-primary)';
		messageElement.style.padding = '15px';
		messageElement.style.borderRadius = 'var(--border-radius-md)';
		messageElement.style.marginBottom = '10px';
		messageElement.style.boxShadow = 'var(--shadow-modal)';
		messageElement.style.transition = 'opacity 0.5s ease-in-out';
		messageElement.style.maxWidth = '350px';

		// Додаємо повідомлення в контейнер
		messageContainer.appendChild(messageElement);

		// Видаляємо повідомлення через 5 секунд
		setTimeout(() => {
			messageElement.style.opacity = '0';
			setTimeout(() => {
				if (messageElement.parentNode) {
					messageElement.remove();
				}
			}, 500);
		}, 5000);
	};
}