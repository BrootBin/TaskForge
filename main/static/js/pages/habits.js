/**
 * My Habits Page JavaScript
 * TaskForge - функціональність сторінки управління привычками
 */

// Головна функція ініціалізації сторінки привычек
function initHabitsPage() {
	console.log('Habits page initialized');

	// Иніціалізуємо всі обробники подій
	initHabitCreation();
	initHabitDeletion();
	initHabitToggle();
	initHabitCheckin();
	initTemplateUsage();
}

/**
 * Ініціалізація створення привычек
 */
function initHabitCreation() {
	const createBtn = document.getElementById('create-habit-btn');
	const createFirstBtn = document.getElementById('create-first-habit-btn');
	const cancelBtn = document.getElementById('cancel-habit-btn');
	const createSection = document.getElementById('create-habit-section');
	const createForm = document.getElementById('create-habit-form');

	// Показати форму створення привычки
	if (createBtn) {
		createBtn.addEventListener('click', () => {
			createSection.style.display = 'block';
			createSection.scrollIntoView({ behavior: 'smooth' });
		});
	}

	if (createFirstBtn) {
		createFirstBtn.addEventListener('click', () => {
			createSection.style.display = 'block';
			createSection.scrollIntoView({ behavior: 'smooth' });
		});
	}

	// Сховати форму створення
	if (cancelBtn) {
		cancelBtn.addEventListener('click', () => {
			createSection.style.display = 'none';
			createForm.reset();
		});
	}

	// Обробка відправлення форми
	if (createForm) {
		createForm.addEventListener('submit', handleHabitCreation);
	}
}

/**
 * Обробляє створення нової привычки
 */
function handleHabitCreation(e) {
	e.preventDefault();

	const formData = new FormData(e.target);
	const habitData = {
		name: formData.get('name'),
		description: formData.get('description'),
		frequency: formData.get('frequency'),
		reminder_time: formData.get('reminder_time'),
		category: formData.get('category')
	};

	console.log('Creating habit:', habitData);

	// Відправляємо дані на сервер
	fetch('/api/create-custom-habit/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify(habitData)
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				showMessage('Habit created successfully!', 'success');
				// Перезагружаем страницу для обновления списка
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				showMessage(data.message || 'Failed to create habit', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while creating habit', 'error');
		});
}

/**
 * Ініціалізація видалення привычек
 */
function initHabitDeletion() {
	const deleteModal = document.getElementById('delete-modal');
	const cancelDeleteBtn = document.getElementById('cancel-delete');
	const confirmDeleteBtn = document.getElementById('confirm-delete');
	const closeBtn = deleteModal ? deleteModal.querySelector('.close') : null;
	let currentHabitId = null;

	// Обробка кліків на кнопки видалення
	document.addEventListener('click', (e) => {
		if (e.target.closest('.delete-habit-btn')) {
			const btn = e.target.closest('.delete-habit-btn');
			currentHabitId = btn.dataset.habitId;
			if (deleteModal) {
				deleteModal.style.display = 'block';
			}
		}
	});

	// Закриття модального вікна
	[cancelDeleteBtn, closeBtn].forEach(btn => {
		if (btn) {
			btn.addEventListener('click', () => {
				deleteModal.style.display = 'none';
				currentHabitId = null;
			});
		}
	});

	// Підтвердження видалення
	if (confirmDeleteBtn) {
		confirmDeleteBtn.addEventListener('click', () => {
			if (currentHabitId) {
				deleteHabit(currentHabitId);
				deleteModal.style.display = 'none';
				currentHabitId = null;
			}
		});
	}

	// Закриття при кліку поза модальним вікном
	if (deleteModal) {
		deleteModal.addEventListener('click', (e) => {
			if (e.target === deleteModal) {
				deleteModal.style.display = 'none';
				currentHabitId = null;
			}
		});
	}
}

/**
 * Видаляє привычку
 */
function deleteHabit(habitId) {
	fetch('/api/delete-habit/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify({ habit_id: habitId })
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				showMessage('Habit deleted successfully!', 'success');
				// Удаляем карточку из DOM
				const habitCard = document.querySelector(`[data-habit-id="${habitId}"]`);
				if (habitCard) {
					habitCard.remove();
				}
			} else {
				showMessage(data.message || 'Failed to delete habit', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while deleting habit', 'error');
		});
}

/**
 * Ініціалізація переключення активности привычек
 */
function initHabitToggle() {
	document.addEventListener('click', (e) => {
		if (e.target.closest('.toggle-habit-btn')) {
			const btn = e.target.closest('.toggle-habit-btn');
			const habitId = btn.dataset.habitId;
			const habitCard = document.querySelector(`[data-habit-id="${habitId}"]`);
			const isActive = !habitCard.classList.contains('inactive');

			toggleHabitActive(habitId, !isActive);
		}
	});
}

/**
 * Переключает активность привычки
 */
function toggleHabitActive(habitId, active) {
	fetch('/api/toggle-habit-active/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify({
			habit_id: habitId,
			active: active
		})
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				const habitCard = document.querySelector(`[data-habit-id="${habitId}"]`);
				const toggleBtn = habitCard.querySelector('.toggle-habit-btn');
				const checkinBtn = habitCard.querySelector('.btn-checkin');
				const icon = toggleBtn.querySelector('i');

				if (active) {
					habitCard.classList.remove('inactive');
					icon.className = 'fas fa-pause';
					toggleBtn.title = 'Deactivate Habit';
					if (checkinBtn) checkinBtn.disabled = false;
					showMessage('Habit activated!', 'success');
				} else {
					habitCard.classList.add('inactive');
					icon.className = 'fas fa-play';
					toggleBtn.title = 'Activate Habit';
					if (checkinBtn) checkinBtn.disabled = true;
					showMessage('Habit deactivated!', 'info');
				}
			} else {
				showMessage(data.message || 'Failed to toggle habit', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred', 'error');
		});
}

/**
 * Ініціалізація чекинов привычек
 */
function initHabitCheckin() {
	document.addEventListener('click', (e) => {
		if (e.target.closest('.btn-checkin')) {
			const btn = e.target.closest('.btn-checkin');
			if (btn.disabled) return;

			const habitId = btn.dataset.habitId;
			const isChecked = btn.classList.contains('checked');

			toggleHabitCheckin(habitId, !isChecked);
		}
	});
}

/**
 * Переключает чекин привычки на сегодня
 */
function toggleHabitCheckin(habitId, checked) {
	fetch('/api/habit-checkin/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify({
			habit_id: habitId,
			checked: checked
		})
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				const btn = document.querySelector(`[data-habit-id="${habitId}"] .btn-checkin`);
				const icon = btn.querySelector('i');

				if (checked) {
					btn.classList.add('checked');
					icon.className = 'fas fa-check-circle';
					btn.innerHTML = '<i class="fas fa-check-circle"></i>Completed';
					showMessage('Great job! Habit completed for today!', 'success');
				} else {
					btn.classList.remove('checked');
					icon.className = 'fas fa-circle';
					btn.innerHTML = '<i class="fas fa-circle"></i>Mark as Done';
					showMessage('Habit unchecked', 'info');
				}

				// Обновляем статистику (можно добавить AJAX запрос для получения новых данных)
				updateHabitStats(habitId, data.stats);
			} else {
				showMessage(data.message || 'Failed to update habit', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred', 'error');
		});
}

/**
 * Обновляет статистику привычки
 */
function updateHabitStats(habitId, stats) {
	const habitCard = document.querySelector(`[data-habit-id="${habitId}"]`);
	if (habitCard && stats) {
		const statItems = habitCard.querySelectorAll('.stat-item .stat-value');
		if (statItems.length >= 3) {
			statItems[0].textContent = stats.current_streak || 0;
			statItems[1].textContent = stats.longest_streak || 0;
			statItems[2].textContent = stats.completion_rate || 0;
		}
	}
}

/**
 * Ініціалізація використання шаблонів
 */
function initTemplateUsage() {
	document.addEventListener('click', (e) => {
		if (e.target.closest('.use-template-btn')) {
			const btn = e.target.closest('.use-template-btn');
			const templateId = btn.dataset.templateId;
			useHabitTemplate(templateId);
		}
	});
}

/**
 * Використовує шаблон привычки
 */
function useHabitTemplate(templateId) {
	fetch('/api/use-habit-template/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify({ template_id: templateId })
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				showMessage('Habit created from template!', 'success');
				// Перезагружаем страницу для обновления списка
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				showMessage(data.message || 'Failed to use template', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while using template', 'error');
		});
}

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {
	// Проверяем, что мы на странице привычек
	if (document.querySelector('.habits-page')) {
		initHabitsPage();
	}
});