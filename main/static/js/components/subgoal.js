/**
 * Компонент для работы с подцелями на странице целей (goals.html)
 */

console.log("🎯 [GOALS] Инициализация обработчиков подцелей для страницы целей");

// Проверяем, что мы на странице целей
const isGoalsPage = window.location.pathname.includes("/goals") ||
	document.querySelector(".goals-page") !== null ||
	document.querySelector(".show-all-subgoals-btn") !== null;

if (!isGoalsPage) {
	console.log("❌ [GOALS] Не страница целей, пропускаем инициализацию");
} else {
	// Ищем input-чекбоксы
	const subgoalCheckboxes = document.querySelectorAll("input.subgoal-checkbox[type=\"checkbox\"]");
	console.log("📝 [GOALS] Найдено подцелей:", subgoalCheckboxes.length);

	// Инициализируем прогресс для всех целей на странице
	const goalCards = document.querySelectorAll('.goal-card');
	goalCards.forEach(goalCard => {
		updateGoalsGoalProgress(goalCard);
	});

	// Инициализируем состояние подцелей при загрузке
	subgoalCheckboxes.forEach(checkbox => {
		const isCompleted = checkbox.checked;
		const subgoalElement = checkbox.closest(".subgoal-item");
		const nameElement = subgoalElement ? subgoalElement.querySelector(".subgoal-name") : null;

		// Применяем стили зачеркивания
		if (nameElement) {
			if (isCompleted) {
				nameElement.style.textDecoration = "line-through";
				nameElement.style.color = "var(--text-tertiary)";
				nameElement.style.opacity = "0.7";
				nameElement.classList.add('completed');
				subgoalElement.classList.add('completed');
			} else {
				nameElement.style.textDecoration = "";
				nameElement.style.color = "";
				nameElement.style.opacity = "";
				nameElement.classList.remove('completed');
				subgoalElement.classList.remove('completed');
			}
		}

		// Добавляем обработчик
		if (!checkbox.hasAttribute("data-goals-handler-attached")) {
			checkbox.setAttribute("data-goals-handler-attached", "true");

			checkbox.addEventListener("change", async function () {
				if (this.hasAttribute("data-processing")) return;
				this.setAttribute("data-processing", "true");

				const newCompleted = this.checked;
				const subgoalId = this.dataset.subgoalId;
				const element = this.closest(".subgoal-item");
				const name = element ? element.querySelector(".subgoal-name") : null;

				// Оптимистичное обновление UI
				if (name) {
					if (newCompleted) {
						name.style.textDecoration = "line-through";
						name.style.color = "var(--text-tertiary)";
						name.style.opacity = "0.7";
						name.classList.add('completed');
						element.classList.add('completed');
					} else {
						name.style.textDecoration = "";
						name.style.color = "";
						name.style.opacity = "";
						name.classList.remove('completed');
						element.classList.remove('completed');
					}
				}

				try {
					const response = await fetch("/api/toggle-subgoal/", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-CSRFToken": getCookie("csrftoken"),
						},
						body: JSON.stringify({ subgoal_id: subgoalId })
					});

					const data = await response.json();
					if (response.ok) {
						this.checked = data.completed;
						console.log("✅ [GOALS] Подцель обновлена");

						// Обновляем прогресс цели
						const goalCard = this.closest('.goal-card');
						if (goalCard) {
							updateGoalsGoalProgress(goalCard);

							// Также получаем свежие данные с сервера
							const goalId = goalCard.dataset.goalId;
							if (goalId) {
								setTimeout(() => {
									updateGoalsGoalProgressFromServer(goalId);
								}, 100);
							}
						}						// Показываем уведомление
						const message = data.completed ? 'Subgoal completed!' : 'Subgoal unchecked';
						showGoalsNotification(message, 'success');

					} else {
						throw new Error(data.message || "Error updating subgoal");
					}
				} catch (error) {
					console.error("❌ [GOALS] Ошибка:", error);
					this.checked = !newCompleted;
					if (name) {
						if (!newCompleted) {
							name.style.textDecoration = "line-through";
							name.style.color = "var(--text-tertiary)";
							name.style.opacity = "0.7";
							name.classList.add('completed');
							element.classList.add('completed');
						} else {
							name.style.textDecoration = "";
							name.style.color = "";
							name.style.opacity = "";
							name.classList.remove('completed');
							element.classList.remove('completed');
						}
					}

					// Показываем уведомление об ошибке
					showGoalsNotification('Error updating subgoal', 'error');

				} finally {
					this.removeAttribute("data-processing");
				}
			});
		}
	});
}

function getCookie(name) {
	let cookieValue = null;
	if (document.cookie && document.cookie !== "") {
		const cookies = document.cookie.split(";");
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.substring(0, name.length + 1) === (name + "=")) {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
				break;
			}
		}
	}
	return cookieValue;
}

// Функция для обновления прогресса цели на странице целей
function updateGoalsGoalProgress(goalCard) {
	const checkboxes = goalCard.querySelectorAll('input.subgoal-checkbox[type="checkbox"]');
	const totalSubgoals = checkboxes.length;
	const completedSubgoals = [...checkboxes].filter(cb => cb.checked).length;

	if (totalSubgoals === 0) return;

	const progressPercent = Math.round((completedSubgoals / totalSubgoals) * 100);

	console.log('⚡ [GOALS] Локальний розрахунок прогресу:', `${completedSubgoals}/${totalSubgoals} = ${progressPercent}%`);

	// Обновляем прогресс-бар для страницы целей (.progress-fill)
	const progressBar = goalCard.querySelector('.progress-fill');
	if (progressBar) {
		progressBar.style.width = `${progressPercent}%`;
		console.log('📊 [GOALS] Оновлено прогрес-бар: .progress-fill →', progressPercent + '%');
	}

	// Обновляем процент для страницы целей (.progress-percent)
	const percentElement = goalCard.querySelector('.progress-percent');
	if (percentElement) {
		percentElement.textContent = `${progressPercent}%`;
		console.log('🔢 [GOALS] Оновлено відсоток: .progress-percent →', progressPercent + '%');
	}

	// Обновляем счетчик подцелей в заголовке
	const subgoalsHeader = goalCard.querySelector('.subgoals-section h4');
	if (subgoalsHeader) {
		const headerText = `Subgoals (${completedSubgoals}/${totalSubgoals})`;
		subgoalsHeader.textContent = headerText;
		console.log('📝 [GOALS] Оновлено заголовок підцілей:', headerText);
	}

	// Проверяем завершение цели
	if (progressPercent === 100 && totalSubgoals > 0) {
		if (!goalCard.classList.contains('goal-completed')) {
			goalCard.classList.add('goal-completed');
			showGoalsNotification('🎉 Goal completed!', 'success');
		}
	} else if (progressPercent < 100) {
		goalCard.classList.remove('goal-completed');
	}
}

// Функция уведомлений для страницы целей
function showGoalsNotification(message, type = 'info') {
	console.log('📢 [GOALS] Показуємо сповіщення:', message, type);

	// Используем глобальную систему уведомлений если доступна
	if (typeof window.showMessage === 'function') {
		window.showMessage(message, type);
	} else {
		createGoalsCustomNotification(message, type);
	}
}

// Создание кастомного уведомления для страницы целей
function createGoalsCustomNotification(message, type = 'info') {
	// Удаляем существующие уведомления
	const existingNotifications = document.querySelectorAll('.goals-custom-notification');
	existingNotifications.forEach(notif => notif.remove());

	const notification = document.createElement('div');
	notification.className = 'goals-custom-notification';

	const bgColors = {
		success: 'linear-gradient(135deg, #4CAF50, #45a049)',
		error: 'linear-gradient(135deg, #f44336, #da190b)',
		info: 'linear-gradient(135deg, #2196F3, #0b7dda)',
		warning: 'linear-gradient(135deg, #ff9800, #e68900)'
	};

	notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColors[type] || bgColors.info};
        color: white;
        padding: 12px 18px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        font-weight: 500;
        font-size: 13px;
        max-width: 300px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;

	notification.textContent = message;
	document.body.appendChild(notification);

	// Анимация появления
	setTimeout(() => {
		notification.style.opacity = '1';
		notification.style.transform = 'translateX(0)';
	}, 100);

	// Автоматическое удаление
	setTimeout(() => {
		notification.style.opacity = '0';
		notification.style.transform = 'translateX(100%)';
		setTimeout(() => {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		}, 300);
	}, 3000);
}

// Обновление прогресса с сервера для страницы целей
function updateGoalsGoalProgressFromServer(goalId) {
	fetch(`/api/goal-progress/${goalId}/`)
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				const progressPercent = data.progress_percent || 0;
				const completedSubgoals = data.completed_subgoals || 0;
				const totalSubgoals = data.total_subgoals || 0;

				console.log('🎯 [GOALS] Прогрес цілі оновлено з сервера:', `${completedSubgoals}/${totalSubgoals} = ${progressPercent}%`);

				const goalCard = document.querySelector(`[data-goal-id="${goalId}"]`);
				if (!goalCard) return;

				// Обновляем элементы для страницы целей
				const progressBar = goalCard.querySelector('.progress-fill');
				if (progressBar) {
					progressBar.style.width = `${progressPercent}%`;
				}

				const percentElement = goalCard.querySelector('.progress-percent');
				if (percentElement) {
					percentElement.textContent = `${progressPercent}%`;
				}

				const subgoalsHeader = goalCard.querySelector('.subgoals-section h4');
				if (subgoalsHeader) {
					const headerText = `Subgoals (${completedSubgoals}/${totalSubgoals})`;
					subgoalsHeader.textContent = headerText;
				}

				// Проверяем завершение цели
				if (progressPercent === 100 && totalSubgoals > 0 && !goalCard.classList.contains('goal-completed')) {
					goalCard.classList.add('goal-completed');
					showGoalsNotification('🎉 Goal completed successfully!', 'success');
				} else if (progressPercent < 100 && goalCard.classList.contains('goal-completed')) {
					goalCard.classList.remove('goal-completed');
				}
			}
		})
		.catch(error => {
			console.error('[GOALS] Error getting goal progress:', error);
		});
}