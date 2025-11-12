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
			if (data.status === 'success') {
				// Перезавантажуємо сторінку для відображення нової звички
				window.location.reload();
			} else {
				showNotification('Error creating habit: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('Server interaction error occurred', 'error');
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
			if (data.status === 'success') {
				// Перезавантажуємо сторінку для відображення нової цілі
				window.location.reload();
			} else {
				showNotification('Error creating goal: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('Server interaction error occurred', 'error');
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
	showNotification('Please log in or register to use templates', 'info');
}

function getCSRFToken() {
	// Отримуємо CSRF токен з cookie
	const name = 'csrftoken';
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
	return '';
}