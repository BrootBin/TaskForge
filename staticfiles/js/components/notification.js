/**
 * Централизована система уведомлений для всего приложения
 * Используется единый класс .app-notification для всех типов сообщений
 * Максимум 3 сообщения одновременно на экране
 */

// Конфигурация стилей для разных типов уведомлений
const NOTIFICATION_STYLES = {
	success: {
		background: 'linear-gradient(135deg, #2c3e50, #34495e)',
		borderLeft: '4px solid #FFD700',
		color: '#FFD700',
		icon: '<i class="fa-solid fa-circle-check"></i>'
	},
	error: {
		background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
		borderLeft: 'none',
		color: 'white',
		icon: '<i class="fa-solid fa-circle-xmark"></i>'
	},
	warning: {
		background: 'linear-gradient(135deg, #fff3cd, #ffeeba)',
		borderLeft: '4px solid #ffc107',
		color: '#856404',
		icon: '<i class="fa-solid fa-triangle-exclamation"></i>'
	},
	info: {
		background: 'linear-gradient(135deg, #2196F3, #0b7dda)',
		borderLeft: 'none',
		color: 'white',
		icon: '<i class="fa-solid fa-circle-info"></i>'
	}
};

// Единый класс для всех уведомлений
const NOTIFICATION_CLASS = '.app-notification';
const MAX_NOTIFICATIONS = 3;
const NOTIFICATION_DURATION = 3000;
const NOTIFICATION_OFFSET = 80; // Высота одного уведомления

/**
 * Главная функция показа уведомления
 * Используется везде: привычки, цели, подцели, модали
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Длительность показа в миллисекундах (0 = не закрывается)
 * @returns {HTMLElement} Элемент уведомления
 */
function showNotification(message, type = 'info', duration = NOTIFICATION_DURATION) {
	// Получаем стиль для типа уведомления
	const style = NOTIFICATION_STYLES[type] || NOTIFICATION_STYLES.info;

	// Ограничиваем максимум до 3 сообщений
	const existingNotifications = document.querySelectorAll(NOTIFICATION_CLASS);
	if (existingNotifications.length >= MAX_NOTIFICATIONS) {
		// Удаляем самое старое сообщение (первое в DOM)
		const oldestNotification = existingNotifications[0];
		oldestNotification.style.opacity = '0';
		oldestNotification.style.transform = 'translateX(100%)';
		setTimeout(() => {
			if (oldestNotification.parentNode) {
				oldestNotification.remove();
			}
		}, 300);
	}

	// Создаем элемент уведомления
	const notification = document.createElement('div');
	notification.className = 'app-notification';

	// Применяем стили (сначала без конкретных значений top и z-index)
	notification.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		background: ${style.background};
		${style.borderLeft ? `border-left: ${style.borderLeft};` : ''}
		color: ${style.color};
		padding: 15px 20px;
		border-radius: 8px;
		z-index: 10000;
		opacity: 0;
		transform: translateX(100%);
		transition: all 0.3s ease;
		max-width: 350px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	`;

	// Создаем содержимое уведомления
	notification.innerHTML = `
		<div class="notification-icon" style="flex-shrink: 0;">${style.icon}</div>
		<div class="notification-content" style="flex: 1; word-break: break-word;">${escapeHtml(message)}</div>
		<button class="notification-close" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: 16px; flex-shrink: 0;">
			<i class="fa-solid fa-xmark"></i>
		</button>
	`;

	// Добавляем в DOM
	document.body.appendChild(notification);

	// Расчитываем позицию ПОСЛЕ добавления в DOM
	const notificationCount = document.querySelectorAll(NOTIFICATION_CLASS).length;
	const topOffset = 20 + ((notificationCount - 1) * NOTIFICATION_OFFSET);
	notification.style.top = `${topOffset}px`;
	notification.style.zIndex = `${10000 + notificationCount}`;

	// Анимация появления
	setTimeout(() => {
		notification.style.opacity = '1';
		notification.style.transform = 'translateX(0)';
	}, 100);

	// Обработчик кнопки закрытия
	const closeButton = notification.querySelector('.notification-close');
	closeButton.addEventListener('click', () => {
		closeNotification(notification);
	});

	// Автоматическое закрытие через указанное время
	if (duration > 0) {
		setTimeout(() => {
			closeNotification(notification);
		}, duration);
	}

	return notification;
}

/**
 * Закрывает уведомление с анимацией
 * @param {HTMLElement} notification - Элемент уведомления
 */
function closeNotification(notification) {
	notification.style.opacity = '0';
	notification.style.transform = 'translateX(100%)';

	setTimeout(() => {
		if (notification.parentNode) {
			notification.parentNode.removeChild(notification);
		}
	}, 300);
}

/**
 * Экранирует HTML для безопасности
 * @param {string} text - Текст для экранирования
 * @returns {string} Экранированный текст
 */
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Удобные функции для разных типов уведомлений
 */
window.Notification = {
	show: showNotification,
	success: (message, duration) => showNotification(message, 'success', duration),
	error: (message, duration) => showNotification(message, 'error', duration),
	warning: (message, duration) => showNotification(message, 'warning', duration),
	info: (message, duration) => showNotification(message, 'info', duration),
	close: closeNotification
};

// Для обратной совместимости с существующим кодом
window.notifications = {
	show: showNotification,
	close: closeNotification
};