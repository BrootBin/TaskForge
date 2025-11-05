/**
 * Компонент для відображення сповіщень
 */

// Створюємо контейнер для сповіщень, якщо його ще немає
function ensureNotificationContainer() {
	let container = document.getElementById('notification-container');

	if (!container) {
		container = document.createElement('div');
		container.id = 'notification-container';
		document.body.appendChild(container);
	}

	return container;
}

// Функція для відображення сповіщення
function showNotification(message, type = 'info', duration = 3000) {
	// Удаляем существующие уведомления
	const existingNotifications = document.querySelectorAll('.unified-notification');
	existingNotifications.forEach(notif => notif.remove());

	const notification = document.createElement('div');
	notification.className = `unified-notification notification-${type}`;

	// Визначаємо іконку залежно від типу
	let icon;
	switch (type) {
		case 'success':
			icon = '<i class="fa-solid fa-circle-check"></i>';
			break;
		case 'error':
			icon = '<i class="fa-solid fa-circle-xmark"></i>';
			break;
		case 'warning':
			icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
			break;
		case 'info':
		default:
			icon = '<i class="fa-solid fa-circle-info"></i>';
			break;
	}

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
	notification.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		${styles}
		padding: 15px 20px;
		border-radius: 8px;
		z-index: 1001;
		opacity: 0;
		transform: translateX(100%);
		transition: all 0.3s ease;
		max-width: 300px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 10px;
	`;

	// Створюємо вміст сповіщення
	notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-content" style="flex: 1;">${message}</div>
    <button class="notification-close" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: 16px;"><i class="fa-solid fa-xmark"></i></button>
  `;

	// Додаємо сповіщення в body
	document.body.appendChild(notification);

	// Анимация появления
	setTimeout(() => {
		notification.style.opacity = '1';
		notification.style.transform = 'translateX(0)';
	}, 100);

	// Налаштовуємо кнопку закриття
	const closeButton = notification.querySelector('.notification-close');
	closeButton.addEventListener('click', () => {
		closeNotification(notification);
	});

	// Автоматично закриваємо сповіщення через вказаний час
	if (duration > 0) {
		setTimeout(() => {
			closeNotification(notification);
		}, duration);
	}

	return notification;
}

// Функція для закриття сповіщення
function closeNotification(notification) {
	notification.classList.add('hide');

	// Видаляємо елемент після завершення анімації
	setTimeout(() => {
		if (notification.parentNode) {
			notification.parentNode.removeChild(notification);
		}
	}, 300);
}

// Експортуємо функції для використання в інших модулях
window.notifications = {
	show: showNotification,
	close: closeNotification
};