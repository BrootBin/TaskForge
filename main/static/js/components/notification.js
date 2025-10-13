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
	const container = ensureNotificationContainer();
	const notification = document.createElement('div');

	notification.className = `notification notification-${type}`;

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

	// Створюємо вміст сповіщення
	notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-content">${message}</div>
    <button class="notification-close"><i class="fa-solid fa-xmark"></i></button>
  `;

	// Додаємо сповіщення в контейнер
	container.appendChild(notification);

	// Додаємо клас для анімації появи
	setTimeout(() => {
		notification.classList.add('show');
	}, 10);

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