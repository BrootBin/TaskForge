/**
 * Централизованная система уведомлений для приложения TaskForge
 * Обеспечивает единое управление всеми уведомлениями в приложении
 */

// Защита от повторной загрузки
if (typeof window.NOTIFICATION_SYSTEM_LOADED !== 'undefined') {
	console.warn('⚠️ Notification system already loaded, skipping re-initialization');
} else {
	window.NOTIFICATION_SYSTEM_LOADED = true;

	// Конфигурация стилей для разных типов уведомлений
	const NOTIFICATION_STYLES = {
		success: {
			background: 'linear-gradient(135deg, #2c3e50, #34495e)',
			borderLeft: '4px solid #FFD700',
			color: '#FFD700'
		},
		error: {
			background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
			borderLeft: '4px solid #e74c3c',
			color: 'white'
		},
		warning: {
			background: 'linear-gradient(135deg, #fff3cd, #ffeeba)',
			borderLeft: '4px solid #ffc107',
			color: '#856404'
		},
		info: {
			background: 'linear-gradient(135deg, #2196F3, #0b7dda)',
			borderLeft: '4px solid #2196F3',
			color: 'white'
		}
	};

	const NOTIFICATION_CLASS = 'app-notification';
	const MAX_NOTIFICATIONS = 3;
	const NOTIFICATION_DURATION = 3000;
	const NOTIFICATION_OFFSET = 80;
	const NOTIFICATION_TOP_OFFSET = 20;
	const NOTIFICATION_RIGHT_OFFSET = 20;

	// Массив для отслеживания активных уведомлений
	let activeNotifications = [];

	/**
	 * Экранирует HTML спецсимволы для безопасности
	 */
	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	/**
	 * Закрывает уведомление с анимацией
	 */
	function closeNotification(notification) {
		// Отменяем автозакрытие если оно было запланировано
		if (notification.timeoutId) {
			clearTimeout(notification.timeoutId);
		}

		notification.style.opacity = '0';
		notification.style.transform = 'translateX(100%)';

		setTimeout(() => {
			try {
				if (notification.parentNode) {
					notification.parentNode.removeChild(notification);
				}
			} catch (e) {
				console.warn('Error removing notification:', e);
			}
			// Удаляем из массива
			activeNotifications = activeNotifications.filter(n => n !== notification);
			// Обновляем позиции оставшихся
			updateNotificationPositions();
		}, 300);
	}

	/**
	 * Обновляет позиции всех активных уведомлений
	 */
	function updateNotificationPositions() {
		// Сначала очищаем массив от удаленных элементов
		activeNotifications = activeNotifications.filter(notification => {
			return notification.parentNode !== null;
		});

		// Затем обновляем позиции оставшихся
		activeNotifications.forEach((notification, index) => {
			const topOffset = NOTIFICATION_TOP_OFFSET + (index * NOTIFICATION_OFFSET);
			notification.style.top = `${topOffset}px`;
			notification.style.zIndex = `${10000 + index}`;
		});
	}

	/**
	 * Основная функция для показа уведомлений
	 * @param {string} message - Текст уведомления
	 * @param {string} type - Тип уведомления: 'success', 'error', 'warning', 'info'
	 * @param {number} duration - Длительность показа в миллисекундах
	 */
	function showNotification(message, type = 'info', duration = NOTIFICATION_DURATION) {
		// Получаем стиль для типа уведомления
		const style = NOTIFICATION_STYLES[type] || NOTIFICATION_STYLES.info;

		// Глубокая очистка: удаляем все мертвые элементы из DOM
		const allNotifications = document.querySelectorAll(`.${NOTIFICATION_CLASS}`);
		allNotifications.forEach(notif => {
			const index = activeNotifications.indexOf(notif);
			if (index === -1 && notif.parentNode) {
				// Это мертвое уведомление - удаляем его
				notif.parentNode.removeChild(notif);
			}
		});

		// Очищаем массив от мертвых уведомлений (которые уже удалены из DOM)
		activeNotifications = activeNotifications.filter(notification => {
			return notification.parentNode !== null;
		});

		// ВАЖНО: Если уже есть 3 уведомления, НЕМЕДЛЕННО удаляем самое старое из DOM
		while (activeNotifications.length >= MAX_NOTIFICATIONS) {
			const oldestNotification = activeNotifications[0];
			// Удаляем таймаут автозакрытия
			if (oldestNotification.timeoutId) {
				clearTimeout(oldestNotification.timeoutId);
			}
			// Удаляем из массива
			activeNotifications.shift();
			// Удаляем из DOM немедленно
			if (oldestNotification.parentNode) {
				oldestNotification.parentNode.removeChild(oldestNotification);
			}
		}

		// Создаем элемент уведомления
		const notification = document.createElement('div');
		notification.className = NOTIFICATION_CLASS;

		// Применяем стили
		notification.style.cssText = `
		position: fixed;
		top: ${NOTIFICATION_TOP_OFFSET}px;
		right: ${NOTIFICATION_RIGHT_OFFSET}px;
		background: ${style.background};
		border-left: ${style.borderLeft};
		color: ${style.color};
		padding: 15px 20px;
		border-radius: 8px;
		z-index: 10000;
		font-weight: 500;
		font-size: 14px;
		max-width: 400px;
		opacity: 0;
		transform: translateX(100%);
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		word-wrap: break-word;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	`;

		// Устанавливаем текст (экранируем для безопасности)
		notification.textContent = message;
		document.body.appendChild(notification);

		// Добавляем в массив активных уведомлений
		activeNotifications.push(notification);

		// Обновляем позиции всех уведомлений
		updateNotificationPositions();

		// Анимация появления
		setTimeout(() => {
			notification.style.opacity = '1';
			notification.style.transform = 'translateX(0)';
		}, 10);

		// Автоматическое удаление
		const timeoutId = setTimeout(() => {
			closeNotification(notification);
		}, duration);

		// Сохраняем ID таймаута для возможности отмены
		notification.timeoutId = timeoutId;

		return notification;
	}

	// API для удобства
	const NotificationAPI = {
		show: (message, type = 'info', duration = NOTIFICATION_DURATION) => showNotification(message, type, duration),
		success: (message, duration = NOTIFICATION_DURATION) => showNotification(message, 'success', duration),
		error: (message, duration = NOTIFICATION_DURATION) => showNotification(message, 'error', duration),
		warning: (message, duration = NOTIFICATION_DURATION) => showNotification(message, 'warning', duration),
		info: (message, duration = NOTIFICATION_DURATION) => showNotification(message, 'info', duration),
		close: (notification) => closeNotification(notification),
		closeAll: () => {
			while (activeNotifications.length > 0) {
				closeNotification(activeNotifications[0]);
			}
		}
	};

	// Экспортируем в глобальную область
	window.Notification = NotificationAPI;
	window.notifications = NotificationAPI;
	window.showNotification = showNotification; // Прямой экспорт функции

	// Закрываем блок защиты от повторной загрузки
}
