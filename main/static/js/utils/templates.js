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

	// Стилізація повідомлення
	messageElement.style.backgroundColor = type === 'error' ? 'rgba(220, 53, 69, 0.9)' :
		type === 'success' ? 'rgba(40, 167, 69, 0.9)' :
			'rgba(212, 175, 55, 0.9)';
	messageElement.style.color = '#fff';
	messageElement.style.padding = '10px 15px';
	messageElement.style.borderRadius = '5px';
	messageElement.style.marginBottom = '10px';
	messageElement.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
	messageElement.style.transition = 'opacity 0.5s ease-in-out';

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