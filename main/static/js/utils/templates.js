/**
 * Утиліти для роботи з шаблонами
 * TaskForge - функціонал шаблонів звичок та цілей
 * 
 * @module utils/templates
 */

// Публічний API модуля
function initTemplates() {
	console.log('Templates utility initialized');
	// Ініціалізація обробників для кнопок шаблонів
	initTemplateButtons();
}

function initTemplateButtons() {
	// Обробники для кнопок використання шаблонів звичок
	document.querySelectorAll('.habit-card.template .template-use-btn').forEach(button => {
		button.addEventListener('click', function (e) {
			e.preventDefault();
			const templateId = this.dataset.templateId;
			useHabitTemplate(templateId);
		});
	});

	// Обробники для кнопок використання шаблонів цілей
	document.querySelectorAll('.goal-card.template .template-use-btn').forEach(button => {
		button.addEventListener('click', function (e) {
			e.preventDefault();
			const templateId = this.dataset.templateId;
			useGoalTemplate(templateId);
		});
	});
}

function useHabitTemplate(templateId) {
	if (!isAuthenticated()) {
		showLoginPrompt();
		return;
	}

	fetch('/api/use-habit-template/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify({ template_id: templateId })
	})
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		})
		.then(data => {
			if (data.status === 'ok') {
				// Перезавантажуємо сторінку для відображення нової звички
				window.location.reload();
			} else {
				showMessage('Error creating habit: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('Server interaction error occurred', 'error');
		});
}

function useGoalTemplate(templateId) {
	if (!isAuthenticated()) {
		showLoginPrompt();
		return;
	}

	fetch('/api/use-goal-template/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify({ template_id: templateId })
	})
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		})
		.then(data => {
			if (data.status === 'ok') {
				// Перезавантажуємо сторінку для відображення нової цілі
				window.location.reload();
			} else {
				showMessage('Error creating goal: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('Server interaction error occurred', 'error');
		});
}

function isAuthenticated() {
	// Перевіряємо, чи авторизований користувач
	// Використовуємо метадані з шаблону Django
	return document.body.classList.contains('authenticated');
}

function showLoginPrompt() {
	// Показуємо модальне вікно з пропозицією авторизуватися
	const profileBtn = document.getElementById('profile-btn');
	if (profileBtn) {
		profileBtn.click();
	}
	showMessage('Please log in or register to use templates', 'info');
}

function getCSRFToken() {
	// Отримуємо CSRF токен з cookie
	const name = 'csrftoken';
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
	return '';
}

function showMessage(message, type = 'info') {
	// Удаляем существующие уведомления
	const existingNotifications = document.querySelectorAll('.templates-notification');
	existingNotifications.forEach(notif => notif.remove());

	// Створюємо елемент повідомлення
	const messageElement = document.createElement('div');
	messageElement.className = `templates-notification message-${type}`;
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

	// Стилізація повідомлення
	messageElement.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		${styles}
		padding: 15px 20px;
		border-radius: 8px;
		z-index: 9999;
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

	// Додаємо повідомлення в контейнер
	messageContainer.appendChild(messageElement);

	// Видаляємо повідомлення через 5 секунд
	setTimeout(() => {
		messageElement.style.opacity = '0';
		setTimeout(() => {
			messageElement.remove();
		}, 500);
	}, 5000);
}