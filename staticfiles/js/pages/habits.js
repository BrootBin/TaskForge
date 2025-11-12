/**
 * My Habits Page JavaScript
 * TaskForge - функціональність сторінки управління привычками
 */

console.log('🎯 HABITS.JS LOADED!');

// Головна функція ініціалізації сторінки привычек
function initHabitsPage() {
	console.log('✨ Habits page initialized');

	// Проверяем наличие кнопок чекина
	const checkinButtons = document.querySelectorAll('.btn-checkin');
	console.log('🔘 Found checkin buttons:', checkinButtons.length);

	// Иніціалізуємо всі обробники подій
	initHabitCreation();
	initHabitDeletion();
	initHabitToggle();
	initHabitCheckin();
	initTemplateUsage();

	console.log('✅ All handlers initialized');
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
			if (data.status === 'success' || data.status === 'ok') {
				showNotification('Habit created successfully!', 'success');

				// Скрываем форму создания
				const createSection = document.getElementById('create-habit-section');
				const createForm = document.getElementById('create-habit-form');
				if (createSection) createSection.style.display = 'none';
				if (createForm) createForm.reset();

				// Обновляем список привычек без перезагрузки
				refreshHabitsListAndStats();
			} else {
				showNotification(data.message || 'Failed to create habit', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('An error occurred while creating habit', 'error');
		});
}

/**
 * Ініціалізація видалення привычек
 */
function initHabitDeletion() {
	const deleteModal = document.getElementById('delete-modal');
	const cancelDeleteBtn = document.getElementById('cancel-delete');
	const confirmDeleteBtn = document.getElementById('confirm-delete');
	const closeBtn = deleteModal ? deleteModal.querySelector('.modal-close') : null;
	const modalOverlay = deleteModal ? deleteModal.querySelector('.modal-overlay') : null;
	let currentHabitId = null;

	// Функция показа модального окна
	function showModal() {
		if (deleteModal) {
			deleteModal.style.display = 'flex';
			deleteModal.classList.add('show');
			// Добавляем небольшую задержку для анимации
			setTimeout(() => {
				deleteModal.classList.add('active');
			}, 10);
		}
	}

	// Функция скрытия модального окна
	function hideModal() {
		if (deleteModal) {
			deleteModal.classList.remove('active');
			setTimeout(() => {
				deleteModal.style.display = 'none';
				deleteModal.classList.remove('show');
				currentHabitId = null;
			}, 300);
		}
	}

	// Обробка кліків на кнопки видалення
	document.addEventListener('click', (e) => {
		if (e.target.closest('.delete-habit-btn')) {
			const btn = e.target.closest('.delete-habit-btn');
			currentHabitId = btn.dataset.habitId;
			showModal();
		}
	});

	// Закриття модального вікна
	[cancelDeleteBtn, closeBtn].forEach(btn => {
		if (btn) {
			btn.addEventListener('click', () => {
				hideModal();
			});
		}
	});

	// Підтвердження видалення
	if (confirmDeleteBtn) {
		confirmDeleteBtn.addEventListener('click', () => {
			if (currentHabitId) {
				deleteHabit(currentHabitId);
				hideModal();
			}
		});
	}

	// Закриття при кліку на overlay
	if (modalOverlay) {
		modalOverlay.addEventListener('click', () => {
			hideModal();
		});
	}

	// Закриття при натисканні Escape
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && deleteModal && deleteModal.classList.contains('show')) {
			hideModal();
		}
	});
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
			if (data.status === 'success' || data.status === 'ok') {
				showNotification('Habit deleted successfully!', 'success');

				// Обновляем список привычек без перезагрузки
				refreshHabitsListAndStats();
			} else {
				showNotification(data.message || 'Failed to delete habit', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('An error occurred while deleting habit', 'error');
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
			if (data.status === 'success' || data.status === 'ok') {
				const habitCard = document.querySelector(`[data-habit-id="${habitId}"]`);
				const toggleBtn = habitCard.querySelector('.toggle-habit-btn');
				const checkinBtn = habitCard.querySelector('.btn-checkin');
				const icon = toggleBtn.querySelector('i');

				if (active) {
					habitCard.classList.remove('inactive');
					icon.className = 'fas fa-pause';
					toggleBtn.title = 'Deactivate Habit';
					if (checkinBtn) checkinBtn.disabled = false;
					showNotification('Habit activated!', 'success');
				} else {
					habitCard.classList.add('inactive');
					icon.className = 'fas fa-play';
					toggleBtn.title = 'Activate Habit';
					if (checkinBtn) checkinBtn.disabled = true;
					showNotification('Habit deactivated!', 'warning');
				}
			} else {
				showNotification(data.message || 'Failed to toggle habit', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('An error occurred', 'error');
		});
}

/**
 * Ініціалізація чекинов привычек
 */
function initHabitCheckin() {
	document.addEventListener('click', e => {
		if (e.target.closest('.btn-checkin')) {
			const btn = e.target.closest('.btn-checkin');
			if (btn.disabled) return;

			// Предотвращаем двойное нажатие
			if (btn.hasAttribute('data-pending')) return;

			const habitId = btn.dataset.habitId;
			const isChecked = btn.classList.contains('checked');

			console.log('Habit checkin clicked:', habitId, 'isChecked:', isChecked);
			toggleHabitCheckin(habitId, !isChecked);
		}
	});
}

/**
 * Переключает чекин привычки на сегодня
 */
function toggleHabitCheckin(habitId, checked) {
	const btn = document.querySelector(`[data-habit-id="${habitId}"] .btn-checkin`);

	// Устанавливаем флаг, что запрос в процессе
	btn.setAttribute('data-pending', 'true');
	btn.disabled = true;

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
			if (data.status === 'success' || data.status === 'ok') {
				const btn = document.querySelector(`[data-habit-id="${habitId}"] .btn-checkin`);
				const icon = btn.querySelector('i');

				if (checked) {
					btn.classList.add('checked');
					icon.className = 'fas fa-check-circle';
					btn.innerHTML = '<i class="fas fa-check-circle"></i>Completed';
					showNotification('Great job! Habit completed for today!', 'success');
				} else {
					btn.classList.remove('checked');
					icon.className = 'fas fa-circle';
					btn.innerHTML = '<i class="fas fa-circle"></i>Mark as Done';
					showNotification('Habit unchecked', 'warning');
				}

				// Обновляем статистику
				updateHabitStats(habitId, data.stats);
			} else {
				showNotification(data.message || 'Failed to update habit', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('An error occurred', 'error');
		})
		.finally(() => {
			// Убираем флаг и разблокируем кнопку
			btn.removeAttribute('data-pending');
			btn.disabled = false;
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
			statItems[2].textContent = (stats.completion_rate || 0) + '%';
		}

		// Также обновляем общую статистику на странице
		updatePageStats();
	}
}

/**
 * Обновляет общую статистику на странице
 */
function updatePageStats() {
	fetch('/api/get-habits-stats/')
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success' || data.status === 'ok') {
				const stats = data.stats;
				const statCards = document.querySelectorAll('.habits-stats .stat-card .stat-number');

				if (statCards.length >= 4) {
					statCards[0].textContent = stats.total_habits || 0;
					statCards[1].textContent = stats.active_habits || 0;
					statCards[2].textContent = stats.completed_today || 0;
					statCards[3].textContent = stats.current_streak || 0;
				}
			}
		})
		.catch(error => {
			console.error('Error updating page stats:', error);
		});
}

/**
 * Обновляет список привычек и статистику без перезагрузки страницы
 */
function refreshHabitsListAndStats() {
	// Обновляем статистику
	updatePageStats();

	// Получаем обновленный список привычек
	fetch('/api/get-user-habits/')
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success' || data.status === 'ok') {
				const habitsContainer = document.querySelector('.habits-list');
				const emptyState = document.querySelector('.empty-state');

				if (data.habits && data.habits.length > 0) {
					// Скрываем empty state если есть привычки
					if (emptyState) {
						emptyState.style.display = 'none';
					}

					// Показываем контейнер привычек
					if (habitsContainer) {
						habitsContainer.style.display = 'grid';

						// Обновляем HTML содержимое
						habitsContainer.innerHTML = generateHabitsHTML(data.habits);

						// Переинициализируем обработчики для новых элементов
						reinitializeHabitHandlers();
					}
				} else {
					// Показываем empty state если нет привычек
					if (emptyState) {
						emptyState.style.display = 'flex';
					}
					if (habitsContainer) {
						habitsContainer.style.display = 'none';
					}
				}
			}
		})
		.catch(error => {
			console.error('Error refreshing habits list:', error);
			// В случае ошибки просто перезагружаем страницу
			setTimeout(() => {
				window.location.reload();
			}, 500);
		});
}

/**
 * Генерирует HTML для списка привычек
 */
function generateHabitsHTML(habits) {
	return habits.map(habit => `
		<div class="habit-card ${habit.active ? '' : 'inactive'}" data-habit-id="${habit.id}">
			<div class="habit-header">
				<div class="habit-info">
					<h3>${habit.name}</h3>
					<div class="habit-frequency">${habit.frequency_display}</div>
				</div>
				<div class="habit-actions">
					<button class="btn-icon toggle-habit-btn" data-habit-id="${habit.id}" title="${habit.active ? 'Deactivate' : 'Activate'} Habit">
						<i class="fas ${habit.active ? 'fa-pause' : 'fa-play'}"></i>
					</button>
					<button class="btn-icon delete-habit-btn" data-habit-id="${habit.id}" title="Delete Habit">
						<i class="fas fa-trash"></i>
					</button>
				</div>
			</div>
			
			${habit.description ? `<p class="habit-description">${habit.description}</p>` : ''}

			<div class="habit-checkin-section">
				<div class="checkin-header">
					<span>Today's Progress</span>
					<span class="checkin-date">${habit.today_date}</span>
				</div>
				<div class="checkin-controls">
					<button class="btn-checkin ${habit.is_checked_today ? 'checked' : ''}" 
							data-habit-id="${habit.id}"
							${!habit.active ? 'disabled' : ''}>
						<i class="fas${habit.is_checked_today ? ' fa-check-circle' : ' fa-circle'}"></i>
						${habit.is_checked_today ? 'Completed' : 'Mark as Done'}
					</button>
				</div>
			</div>

			<div class="habit-stats">
				<div class="stat-item">
					<div class="stat-value">${habit.current_streak}</div>
					<div class="stat-label">Current Streak</div>
				</div>
				<div class="stat-item">
					<div class="stat-value">${habit.longest_streak}</div>
					<div class="stat-label">Best Streak</div>
				</div>
				<div class="stat-item">
					<div class="stat-value">${habit.completion_rate}%</div>
					<div class="stat-label">Success Rate</div>
				</div>
			</div>
		</div>
	`).join('');
}

/**
 * Переинициализирует обработчики событий для новых элементов привычек
 */
function reinitializeHabitHandlers() {
	// Переинициализируем обработчики, которые могли быть потеряны
	// Обработчики уже инициализированы глобально через document.addEventListener,
	// поэтому они должны работать автоматически для новых элементов
	console.log('🔄 Habit handlers reinitialized for new elements');
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
			console.log('Template response:', data); // Отладка
			if (data.status === 'success' || data.status === 'ok') {
				console.log('Showing success notification'); // Отладка
				showNotification('Habit created from template!', 'success');

				// Обновляем список привычек без перезагрузки
				refreshHabitsListAndStats();
			} else {
				console.log('Showing error notification'); // Отладка
				showNotification(data.message || 'Failed to use template', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('An error occurred while using template', 'error');
		});
}

/**
 * Показ повідомлень з правильними кольорами
 */
// Используем централизованную систему уведомлений из notification.js
// Если notification.js не загружен, используем window.showMessage как fallback
if (typeof showNotification === 'undefined' && typeof window.showMessage === 'function') {
	window.showNotification = window.showMessage;
}

// Ініціалізація при завантаженні DOM
document.addEventListener('DOMContentLoaded', () => {
	console.log('🔄 DOM loaded, checking for habits page...');
	// Проверяем, что мы на странице привычек
	const habitsPage = document.querySelector('.habits-page');
	console.log('📄 Habits page element:', habitsPage);
	if (habitsPage) {
		console.log('✅ Initializing habits page...');
		initHabitsPage();
	} else {
		console.log('⚠️ Not on habits page, skipping initialization');
	}
});

// Также инициализируем сразу, если DOM уже загружен
if (document.readyState === 'loading') {
	console.log('⏳ DOM still loading...');
} else {
	console.log('🚀 DOM already loaded, initializing immediately...');
	if (document.querySelector('.habits-page')) {
		initHabitsPage();
	}
}