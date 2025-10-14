/**
 * TaskForge - основний JavaScript файл
 * Імпортує всі компоненти та утиліти JavaScript
 * 
 * Цей файл ініціалізує глобальні функції та утиліти,
 * які можуть бути використані іншими компонентами
 */

// Завантаження компонентів та утиліт
// Функції залежать від порядку завантаження, не змінюйте його без необхідності
document.write('<script src="/static/js/utils/templates.js"></script>');
document.write('<script src="/static/js/components/calendar.js"></script>');
document.write('<script src="/static/js/components/modal.js"></script>');
document.write('<script src="/static/js/components/stats-dashboard.js"></script>');
document.write('<script src="/static/js/components/progress-text.js"></script>');
document.write('<script src="/static/js/components/notification.js"></script>');
document.write('<script src="/static/js/components/subgoal.js"></script>');

// Ініціалізація скриптів при завантаженні DOM
document.addEventListener('DOMContentLoaded', function () {
	console.log('TaskForge JS initialized');

	// Ініціалізація глобальних утиліт
	initGlobalUtils();

	// Ініціалізація компонентів
	if (typeof initTemplates === 'function') initTemplates();
	if (typeof initCalendar === 'function') initCalendar();
	if (typeof initModals === 'function') initModals();
	if (typeof initStatsDashboard === 'function') initStatsDashboard();
	if (typeof initProgressText === 'function') initProgressText();

	// Перевіряємо, що система сповіщень завантажена
	console.log('window.notifications доступний:', !!window.notifications);

	if (typeof initSubgoalHandlers === 'function') initSubgoalHandlers();

	// Перевірка та ініціалізація 2FA модального вікна, якщо необхідно
	if (window.show2faUser) {
		console.log('Showing 2FA modal for user:', window.show2faUser);
		document.getElementById('twofa-modal').style.display = 'flex';
		startPollingForAuth(window.show2faUser);
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

	// Додаємо глобальну функцію для тестування сповіщень
	window.testNotification = function (message = 'Тестове повідомлення', type = 'info') {
		if (window.notifications && typeof window.notifications.show === 'function') {
			window.notifications.show(message, type, 3000);
			console.log('Сповіщення відправлено через window.notifications');
		} else {
			console.log('window.notifications недоступний');
		}
	};

	// Перевірка авторизації користувача
	window.isAuthenticated = function () {
		return document.body.classList.contains('authenticated');
	};

	// Функція для відображення повідомлень
	function showMessage(message, type = 'info') {
		// Використовуємо глобальний компонент сповіщень, якщо доступний
		if (window.notifications && typeof window.notifications.show === 'function') {
			window.notifications.show(message, type, 3000);
		} else {
			// Перевіряємо, чи існує контейнер для повідомлень
			let messageContainer = document.getElementById('message-container');

			if (!messageContainer) {
				// Створюємо контейнер, якщо його немає
				messageContainer = document.createElement('div');
				messageContainer.id = 'message-container';
				messageContainer.style.position = 'fixed';
				messageContainer.style.top = '20px';
				messageContainer.style.right = '20px';
				messageContainer.style.zIndex = '9999';
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
		}
	};
}

/**
 * Опитування сервера для перевірки статусу 2FA автентифікації
 * @param {string} username - имя пользователя для проверки
 */
function startPollingForAuth(username) {
	const intervalId = setInterval(() => {
		fetch(`/api/check_2fa_status/?username=${encodeURIComponent(username)}`)
			.then(response => response.json())
			.then(data => {
				if (data.authenticated) {
					clearInterval(intervalId);
					window.location.href = '/'; // Перенаправление на главную страницу
				}
			})
			.catch(error => {
				console.error('Error checking 2FA status:', error);
			});
	}, 3000);
}