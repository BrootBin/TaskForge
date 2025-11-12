/**
 * My Goals Page JavaScript
 * TaskForge - функціональність сторінки управління цілями
 */

// Головна функція ініціалізації сторінки цілей
function initGoalsPage() {
	console.log('Goals page initialized');

	// Иніціалізуємо всі обробники подій
	initGoalCreation();
	initGoalDeletion();
	initSubgoalToggle();
	initTemplateUsage();
}

/**
 * Ініціалізація створення цілей
 */
function initGoalCreation() {
	const createBtn = document.getElementById('create-goal-btn');
	const createFirstBtn = document.getElementById('create-first-goal-btn');
	const cancelBtn = document.getElementById('cancel-goal-btn');
	const createSection = document.getElementById('create-goal-section');
	const createForm = document.getElementById('create-goal-form');
	const addSubgoalBtn = document.getElementById('add-subgoal-btn');

	// Показати форму створення цілі
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
			resetSubgoals();
		});
	}

	// Додавання підцілі
	if (addSubgoalBtn) {
		addSubgoalBtn.addEventListener('click', addSubgoalInput);
	}

	// Відправка форми створення цілі
	if (createForm) {
		createForm.addEventListener('submit', handleGoalCreation);
	}

	// Обробники видалення підцілей
	document.addEventListener('click', (e) => {
		if (e.target.closest('.remove-subgoal')) {
			e.target.closest('.subgoal-input').remove();
		}
	});
}

/**
 * Добавлення поля для вводу підцілі
 */
function addSubgoalInput() {
	const subgoalsList = document.getElementById('subgoals-list');
	const subgoalInput = document.createElement('div');
	subgoalInput.className = 'subgoal-input';
	subgoalInput.innerHTML = `
		<input type="text" name="subgoal" placeholder="Enter subgoal name">
		<button type="button" class="btn-icon remove-subgoal">
			<i class="fas fa-times"></i>
		</button>
	`;
	subgoalsList.appendChild(subgoalInput);
}

/**
 * Скидання списку підцілей до початкового стану
 */
function resetSubgoals() {
	const subgoalsList = document.getElementById('subgoals-list');
	subgoalsList.innerHTML = `
		<div class="subgoal-input">
			<input type="text" name="subgoal" placeholder="Enter subgoal name">
			<button type="button" class="btn-icon remove-subgoal">
				<i class="fas fa-times"></i>
			</button>
		</div>
	`;
}

/**
 * Обробка створення нової цілі
 */
async function handleGoalCreation(e) {
	e.preventDefault();

	console.log('🚀 [GOALS] handleGoalCreation started');
	console.log('🔍 [GOALS] window.showMessage available:', typeof window.showMessage === 'function');

	const formData = new FormData(e.target);
	const subgoals = [];

	// Збираємо підцілі
	const subgoalInputs = document.querySelectorAll('input[name="subgoal"]');
	subgoalInputs.forEach(input => {
		if (input.value.trim()) {
			subgoals.push(input.value.trim());
		}
	});

	const goalData = {
		name: formData.get('name'),
		description: formData.get('description'),
		deadline: formData.get('deadline'),
		notify_before_days: formData.get('notify_before_days'),
		subgoals: subgoals
	};

	try {
		const response = await fetch('/api/create-custom-goal/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCsrfToken(),
			},
			body: JSON.stringify(goalData)
		});

		const result = await response.json();
		console.log('📦 [GOALS] Server response:', result);

		if (result.status === 'success' || result.status === 'ok') {
			// Прямо вызываем глобальную функцию
			console.log('✅ [GOALS] Goal created successfully!');
			window.showMessage('Goal created successfully!', 'success');

			// Скрываем форму создания
			const createSection = document.getElementById('create-goal-section');
			if (createSection) {
				createSection.style.display = 'none';
			}

			// Очищаем форму
			e.target.reset();

			// Удаляем дополнительные поля подцелей (оставляем только первое)
			const allSubgoals = document.querySelectorAll('.subgoal-input');
			for (let i = 1; i < allSubgoals.length; i++) {
				allSubgoals[i].remove();
			}

			// Сразу перезагружаем страницу
			setTimeout(() => {
				console.log('� [GOALS] Reloading page immediately...');
				window.location.reload();
			}, 1000);
		} else {
			console.log('❌ [GOALS] Failed to create goal:', result.message);
			window.showMessage(result.message || 'Failed to create goal', 'error');
		}
	} catch (error) {
		console.error('💥 [GOALS] Error creating goal:', error);
		window.showMessage('Failed to create goal', 'error');
	}
}

/**
 * Ініціалізація видалення цілей
 */
function initGoalDeletion() {
	const deleteModal = document.getElementById('delete-modal');
	const closeModal = deleteModal?.querySelector('.close');
	const cancelDelete = document.getElementById('cancel-delete');
	const confirmDelete = document.getElementById('confirm-delete');
	let goalToDelete = null;

	// Обробники кнопок видалення
	document.addEventListener('click', (e) => {
		if (e.target.closest('.delete-goal-btn')) {
			const btn = e.target.closest('.delete-goal-btn');
			goalToDelete = btn.dataset.goalId;
			deleteModal.style.display = 'flex';
		}
	});

	// Закриття модального вікна
	if (closeModal) {
		closeModal.addEventListener('click', () => {
			deleteModal.style.display = 'none';
			goalToDelete = null;
		});
	}

	if (cancelDelete) {
		cancelDelete.addEventListener('click', () => {
			deleteModal.style.display = 'none';
			goalToDelete = null;
		});
	}

	// Підтвердження видалення
	if (confirmDelete) {
		confirmDelete.addEventListener('click', async () => {
			if (goalToDelete) {
				await deleteGoal(goalToDelete);
				deleteModal.style.display = 'none';
				goalToDelete = null;
			}
		});
	}

	// Закриття по кліку вне модального вікна
	if (deleteModal) {
		deleteModal.addEventListener('click', (e) => {
			if (e.target === deleteModal) {
				deleteModal.style.display = 'none';
				goalToDelete = null;
			}
		});
	}
}

/**
 * Видалення цілі
 */
async function deleteGoal(goalId) {
	try {
		const response = await fetch('/api/delete-goal/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCsrfToken(),
			},
			body: JSON.stringify({ goal_id: goalId })
		});

		const result = await response.json();

		if (result.status === 'success') {
			if (typeof window.showMessage === 'function') {
				window.showMessage('Goal deleted successfully!', 'success');
			} else {
				showNotification('Goal deleted successfully!', 'success');
			}
			// Видаляємо елемент з DOM
			const goalCard = document.querySelector(`[data-goal-id="${goalId}"]`);
			if (goalCard) {
				goalCard.style.opacity = '0';
				goalCard.style.transform = 'translateX(-100%)';
				setTimeout(() => {
					goalCard.remove();
					// Перевіряємо, чи залишилися цілі
					checkEmptyState();
				}, 300);
			}
		} else {
			if (typeof window.showMessage === 'function') {
				window.showMessage(result.message || 'Failed to delete goal', 'error');
			} else {
				showNotification(result.message || 'Failed to delete goal', 'error');
			}
		}
	} catch (error) {
		console.error('Error deleting goal:', error);
		if (typeof window.showMessage === 'function') {
			window.showMessage('Failed to delete goal', 'error');
		} else {
			showNotification('Failed to delete goal', 'error');
		}
	}
}

/**
 * Перевірка пустого стану та оновлення інтерфейсу
 */
function checkEmptyState() {
	const goalsList = document.querySelector('.goals-list');
	const goalsSection = document.querySelector('.goals-list-section');

	if (goalsList && goalsList.children.length === 0) {
		goalsSection.innerHTML = `
			<div class="empty-state">
				<div class="empty-icon">
					<i class="fas fa-bullseye"></i>
				</div>
				<h3>No Goals Yet</h3>
				<p>Start your journey by creating your first goal!</p>
				<button class="btn-primary" id="create-first-goal-btn">
					<i class="fas fa-plus"></i> Create Your First Goal
				</button>
			</div>
		`;
		// Переініціалізуємо обробник
		initGoalCreation();
	}
}

/**
 * Ініціалізація перемикання підцілей (ВІДКЛЮЧЕНО - використовується модуль subgoal.js)
 */
function initSubgoalToggle() {
	console.log('⚠️ initSubgoalToggle в goals.js відключено, використовується subgoal.js');
	// document.addEventListener('change', async (e) => {
	// 	if (e.target.classList.contains('subgoal-checkbox')) {
	// 		const subgoalId = e.target.dataset.subgoalId;
	// 		const completed = e.target.checked;
	// 		await toggleSubgoal(subgoalId, completed);
	// 	}
	// });
}

/**
 * Переключення стану підцелі (ВІДКЛЮЧЕНО - використовується модуль subgoal.js)
 */
async function toggleSubgoal(subgoalId, completed) {
	console.log('⚠️ toggleSubgoal в goals.js відключено, використовується subgoal.js');
	// try {
	// 	const response = await fetch('/api/toggle-subgoal/', {
	// 		method: 'POST',
	// 		headers: {
	// 			'Content-Type': 'application/json',
	// 			'X-CSRFToken': getCsrfToken(),
	// 		},
	// 		body: JSON.stringify({
	// 			subgoal_id: subgoalId,
	// 			completed: completed
	// 		})
	// 	});
	// 	const result = await response.json();
	// 	if (result.status === 'success') {
	// 		const subgoalItem = document.querySelector(`[data-subgoal-id="${subgoalId}"]`).closest('.subgoal-item');
	// 		if (completed) {
	// 			subgoalItem.classList.add('completed');
	// 		} else {
	// 			subgoalItem.classList.remove('completed');
	// 		}
	// 		const goalCard = subgoalItem.closest('.goal-card');
	// 		const goalId = goalCard.dataset.goalId;
	// 		if (goalId) {
	// 			await updateGoalProgress(goalId);
	// 		}
	// 	} else {
	// 		showNotification(result.message || 'Failed to update subgoal', 'error');
	// 		const checkbox = document.querySelector(`[data-subgoal-id="${subgoalId}"]`);
	// 		if (checkbox) {
	// 			checkbox.checked = !completed;
	// 		}
	// 	}
	// } catch (error) {
	// 	console.error('Error toggling subgoal:', error);
	// 	showNotification('Failed to update subgoal', 'error');
	// }
}

/**
 * Оновлення прогресу цілі
 */
async function updateGoalProgress(goalId) {
	try {
		const response = await fetch(`/api/goal-progress/${goalId}/`);
		const result = await response.json();

		if (result.status === 'success') {
			const goalCard = document.querySelector(`[data-goal-id="${goalId}"]`);
			if (goalCard) {
				// Оновлюємо відсоток прогресу
				const progressPercent = goalCard.querySelector('.progress-percent');
				const progressFill = goalCard.querySelector('.progress-fill');

				if (progressPercent) {
					progressPercent.textContent = `${result.progress_percent}%`;
				}

				if (progressFill) {
					progressFill.style.width = `${result.progress_percent}%`;
				}

				// Оновлюємо лічильник підцілей
				const subgoalsHeader = goalCard.querySelector('.subgoals-section h4');
				if (subgoalsHeader) {
					subgoalsHeader.textContent = `Subgoals (${result.completed_subgoals}/${result.total_subgoals})`;
				}

				// Відмічаємо ціль як завершену, якщо потрібно
				if (result.goal_completed) {
					goalCard.classList.add('completed');
					if (typeof window.showMessage === 'function') {
						window.showMessage('🎉 Goal completed! Congratulations!', 'success');
					} else {
						showNotification('🎉 Goal completed! Congratulations!', 'success');
					}
				}
			}
		}
	} catch (error) {
		console.error('Error updating goal progress:', error);
	}
}

/**
 * Ініціалізація використання шаблонів
 */
function initTemplateUsage() {
	document.addEventListener('click', async (e) => {
		if (e.target.closest('.use-template-btn')) {
			const btn = e.target.closest('.use-template-btn');
			const templateId = btn.dataset.templateId;
			await useGoalTemplate(templateId);
		}
	});
}

/**
 * Використання шаблона цілі
 */
async function useGoalTemplate(templateId) {
	try {
		const response = await fetch('/api/use-goal-template/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCsrfToken(),
			},
			body: JSON.stringify({ template_id: templateId })
		});

		const result = await response.json();
		console.log('📦 [GOALS] Template response:', result);

		if (result.status === 'success' || result.status === 'ok') {
			// Используем глобальную функцию для гарантии правильного стиля
			console.log('✅ [GOALS] Goal created from template!');
			window.showMessage('Goal created from template!', 'success');

			// Сразу перезагружаем страницу
			setTimeout(() => {
				console.log('� [GOALS] Template - reloading page immediately...');
				window.location.reload();
			}, 1000);
		} else {
			console.log('❌ [GOALS] Template failed:', result.message);
			window.showMessage(result.message || 'Failed to use template', 'error');
		}
	} catch (error) {
		console.error('💥 [GOALS] Template error:', error);
		window.showMessage('Failed to use template', 'error');
	}
}

/**
 * Отримання CSRF токена
 */
function getCsrfToken() {
	return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
}

/**
 * Показ повідомлень
 */
// Используем централизованную систему уведомлений из notification.js
// Если notification.js не загружен, используем window.showMessage как fallback
if (typeof showNotification === 'undefined' && typeof window.showMessage === 'function') {
	window.showNotification = window.showMessage;
}

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
	// Перевіряємо, чи знаходимося ми на сторінці цілей
	if (document.querySelector('.goals-page')) {
		initGoalsPage();
		console.log('🎯 Goals page initialized, subgoal module should be auto-loaded');
	}
});