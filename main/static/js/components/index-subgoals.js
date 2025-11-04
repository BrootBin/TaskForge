/**
 * Компонент для работы с подцелями на главной странице (index.html)
 * TaskForge - специализированные обработчики для главной страницы
 */

// Глобальные переменные для управления автоматическим перемещением подцелей
const autoReplaceTimers = new Map(); // Хранит таймеры для автоперемещения
const REPLACE_DELAY = 5000; // 5 секунд задержки

// Функция для автоматического перемещения выполненной подцели вниз
function scheduleAutoReplace(completedSubgoalElement, goalCard) {
	const subgoalId = completedSubgoalElement.querySelector('.subgoal-checkbox')?.dataset.subgoalId;
	if (!subgoalId) return;

	// Отменяем существующий таймер если есть
	if (autoReplaceTimers.has(subgoalId)) {
		clearTimeout(autoReplaceTimers.get(subgoalId));
	}

	console.log(`⏰ [INDEX] Запуск таймера перемещения подцели вниз ${subgoalId} (5 сек)`);

	const timerId = setTimeout(() => {
		moveCompletedSubgoalToBottom(completedSubgoalElement, goalCard);
		autoReplaceTimers.delete(subgoalId);
	}, REPLACE_DELAY);

	autoReplaceTimers.set(subgoalId, timerId);
}

// Функция для отмены автоперемещения
function cancelAutoReplace(subgoalId) {
	if (autoReplaceTimers.has(subgoalId)) {
		clearTimeout(autoReplaceTimers.get(subgoalId));
		autoReplaceTimers.delete(subgoalId);
		console.log(`❌ [INDEX] Таймер автоперемещения отменен для подцели ${subgoalId}`);
	}
}

// Функция для перемещения выполненных подцелей вниз списка
async function moveCompletedSubgoalToBottom(completedSubgoalElement, goalCard) {
	if (!completedSubgoalElement || !goalCard) return;

	const subgoalsContainer = goalCard.querySelector('.subgoals-list');
	if (!subgoalsContainer) return;

	console.log('🔄 [INDEX] Перемещение выполненной подцели вниз списка');

	// Получаем все подцели, исключая индикаторы "more"
	const allSubgoals = Array.from(subgoalsContainer.querySelectorAll('.subgoal-item:not(.more-subgoals-indicator)'));
	const moreIndicator = subgoalsContainer.querySelector('.more-subgoals-indicator');

	// Анимация перемещения
	completedSubgoalElement.style.transition = 'all 0.5s ease';
	completedSubgoalElement.style.transform = 'translateY(10px)';
	completedSubgoalElement.style.opacity = '0.8';

	setTimeout(() => {
		// Перемещаем выполненную подцель в конец списка (перед индикатором "more")
		if (moreIndicator) {
			subgoalsContainer.insertBefore(completedSubgoalElement, moreIndicator);
		} else {
			subgoalsContainer.appendChild(completedSubgoalElement);
		}

		// Возвращаем элемент в исходное состояние
		completedSubgoalElement.style.transform = '';
		completedSubgoalElement.style.opacity = '';

		// Убираем переходы
		setTimeout(() => {
			completedSubgoalElement.style.transition = '';
		}, 50);

		// Обновляем прогресс
		updateIndexGoalProgressLocal(goalCard);

		console.log('✅ [INDEX] Выполненная подцель перемещена вниз списка');

	}, 250);
}

// Простая функция для принудительного применения стилей завершения на главной странице
function applyIndexSubgoalCompletionStyle(nameElement, subgoalElement, isCompleted) {
	if (!nameElement || !subgoalElement) return;

	// Всегда сначала очищаем все стили и классы
	nameElement.classList.remove('completed');
	subgoalElement.classList.remove('completed');
	nameElement.style.textDecoration = '';
	nameElement.style.color = '';
	nameElement.style.opacity = '';

	if (isCompleted) {
		// Подцель выполнена - зачеркиваем
		nameElement.classList.add('completed');
		subgoalElement.classList.add('completed');
		nameElement.style.textDecoration = 'line-through !important';
		nameElement.style.color = 'var(--text-tertiary) !important';
		nameElement.style.opacity = '0.7 !important';

		// Дополнительная установка через CSS-свойства для надежности
		nameElement.style.setProperty('text-decoration', 'line-through', 'important');
		nameElement.style.setProperty('color', 'var(--text-tertiary)', 'important');
		nameElement.style.setProperty('opacity', '0.7', 'important');
	} else {
		// Подцель не выполнена - убираем зачеркивание  
		nameElement.style.removeProperty('text-decoration');
		nameElement.style.removeProperty('color');
		nameElement.style.removeProperty('opacity');
	}
}

// Функция инициализации для главной страницы
function initIndexSubgoalHandlers() {
	console.log('🏠 [INDEX] Инициализация обработчиков подцелей для главной страницы');

	// Проверяем, что мы на главной странице
	const isIndexPage = window.location.pathname === '/' ||
		window.location.pathname.includes('/index') ||
		document.querySelector('.welcome-section') !== null;

	if (!isIndexPage) {
		console.log('❌ [INDEX] Не главная страница, пропускаем инициализацию');
		return;
	}

	// Диагностика карточек целей на главной странице
	const allGoalCards = document.querySelectorAll('.goal-card');

	// Ищем подцели с использованием span-чекбоксов (характерно для главной страницы)
	const subgoalCheckboxes = document.querySelectorAll('.subgoal-checkbox');

	if (subgoalCheckboxes.length === 0) {
		return;
	}

	// Инициализируем состояние подцелей
	subgoalCheckboxes.forEach(checkbox => {
		// На главной странице используются span-элементы с data-completed
		// Очищаем значение от лишних пробелов и приводим к нижнему регистру
		const completedValue = (checkbox.dataset.completed || '').trim().toLowerCase();
		const isCompleted = completedValue === 'true';
		const subgoalElement = checkbox.closest('.subgoal-item');
		const nameElement = subgoalElement ? subgoalElement.querySelector('.subgoal-name') : null;

		// Применяем правильные стили при инициализации
		applyIndexSubgoalCompletionStyle(nameElement, subgoalElement, isCompleted);
	});

	// Инициализируем прогресс для всех целей
	allGoalCards.forEach(goalCard => {
		updateIndexGoalProgressLocal(goalCard);
		// Убираем сортировку при инициализации, так как используем автозамену
		// sortSubgoalsInGoalCard(goalCard);
	});

	// Добавляем обработчики кликов
	subgoalCheckboxes.forEach(checkbox => {
		addIndexSubgoalClickHandler(checkbox);
	});

	// Добавляем обработчики для кнопок "Show all"
	initShowAllSubgoalsButtons();

	// Добавляем глобальный обработчик для клавиши Escape
	initIndexEscapeHandler();

	// Инициализируем интеграцию с календарем привычек
	if (typeof initCalendarHabitsIntegration === 'function') {
		initCalendarHabitsIntegration();
	}
}

// Обработчик клика для подцелей на главной странице
function addIndexSubgoalClickHandler(checkbox) {
	// Проверяем, что обработчик еще не добавлен
	if (checkbox.hasAttribute('data-index-handler-attached')) {
		return;
	}

	checkbox.setAttribute('data-index-handler-attached', 'true');

	// На главной странице используются span-элементы
	const isSpanCheckbox = checkbox.tagName.toLowerCase() === 'span';

	if (!isSpanCheckbox) {
		console.warn('⚠️ [INDEX] Неожиданный тип элемента:', checkbox.tagName);
		return;
	}

	// Функции для работы со span-чекбоксами
	const getCurrentState = () => {
		const completedValue = (checkbox.dataset.completed || '').trim().toLowerCase();
		return completedValue === 'true';
	};

	const setCurrentState = (newState) => {
		checkbox.dataset.completed = newState.toString();
		const icon = checkbox.querySelector('i');
		if (icon) {
			if (newState) {
				icon.className = 'fa-solid fa-square-check';
			} else {
				icon.className = 'fa-regular fa-square';
			}
		}
	};

	// Добавляем обработчик клика
	checkbox.addEventListener('click', async function (event) {
		const currentState = getCurrentState();
		const newCompleted = !currentState;

		console.log('🔄 [INDEX] Клік по підцілі:', this.dataset.subgoalId, 'новий стан:', newCompleted);

		// Предотвращаем множественные клики
		if (this.hasAttribute('data-processing')) {
			console.log('⏳ [INDEX] Запит вже обробляється, ігноруємо клік');
			return;
		}
		this.setAttribute('data-processing', 'true');

		const subgoalId = this.dataset.subgoalId;
		const subgoalElement = this.closest('.subgoal-item');
		const nameElement = subgoalElement ? subgoalElement.querySelector('.subgoal-name') : null;

		// Устанавливаем новое состояние
		setCurrentState(newCompleted);

		// Добавляем визуальную анимацию
		if (subgoalElement) {
			subgoalElement.style.transition = 'all 0.3s ease';
			subgoalElement.style.transform = 'scale(1.02)';
			subgoalElement.style.boxShadow = newCompleted ?
				'0 4px 20px rgba(0, 255, 0, 0.2)' :
				'0 4px 20px rgba(255, 165, 0, 0.2)';
		}

		// Оптимистичный UI - сразу меняем внешний вид
		applyIndexSubgoalCompletionStyle(nameElement, subgoalElement, newCompleted);

		try {
			console.log('📡 [INDEX] Відправляємо запит на сервер для підцілі:', subgoalId);

			const response = await fetch('/api/toggle-subgoal/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getIndexCSRFToken(),
				},
				body: JSON.stringify({ subgoal_id: subgoalId })
			});

			const data = await response.json();
			console.log('📡 [INDEX] Відповідь сервера:', data);

			if (!response.ok) {
				throw new Error(data.message || 'An error occurred while updating subgoal');
			}

			// Обновляем состояние на основе ответа сервера
			const actualCompleted = data.completed;
			setCurrentState(actualCompleted);
			this.dataset.completed = actualCompleted.toString();

			// Возвращаем анимацию в исходное состояние
			setTimeout(() => {
				if (subgoalElement) {
					subgoalElement.style.transform = 'scale(1)';
					subgoalElement.style.boxShadow = '';

					// Применяем окончательные стили
					applyIndexSubgoalCompletionStyle(nameElement, subgoalElement, actualCompleted);

					// Дополнительная проверка для надежности
					setTimeout(() => {
						applyIndexSubgoalCompletionStyle(nameElement, subgoalElement, actualCompleted);
					}, 100);

					setTimeout(() => {
						subgoalElement.style.transition = '';
					}, 50);
				}
			}, 300);

			// Обновляем прогресс цели
			const goalCard = subgoalElement ? subgoalElement.closest('.goal-card') : null;
			if (goalCard) {
				console.log('🎯 [INDEX] Оновлюємо прогрес цілі');
				updateIndexGoalProgressLocal(goalCard);

				// Убираем сортировку, так как автозамена обеспечивает нужную логику
				// setTimeout(() => {
				//	 sortSubgoalsInGoalCard(goalCard);
				// }, 400); // Небольшая задержка после анимации

				// Получаем свежие данные с сервера
				setTimeout(() => {
					updateIndexGoalProgress(goalCard.dataset.goalId);
				}, 100);
			}

			// Показываем уведомление
			const message = actualCompleted ?
				'✅ Great! Subgoal completed!' :
				'⏪ Subgoal marked as incomplete';
			showIndexNotification(message, actualCompleted ? 'success' : 'info');

			// Планируем автоперемещение для выполненной подцели или отменяем для невыполненной
			if (actualCompleted) {
				scheduleAutoReplace(subgoalElement, goalCard);
			} else {
				cancelAutoReplace(subgoalId);
			}

		} catch (error) {
			console.error('❌ [INDEX] Error updating subgoal:', error);

			// Возвращаем состояние в случае ошибки
			setCurrentState(!newCompleted);
			applyIndexSubgoalCompletionStyle(nameElement, subgoalElement, !newCompleted);

			// Отменяем автоперемещение в случае ошибки
			cancelAutoReplace(subgoalId);

			if (subgoalElement) {
				subgoalElement.style.transform = 'scale(1)';
				subgoalElement.style.boxShadow = '';
				subgoalElement.style.transition = '';
			}

			showIndexNotification('Помилка при оновленні підцілі: ' + error.message, 'error');
		} finally {
			this.removeAttribute('data-processing');
		}
	});
}

// Функция для получения CSRF токена
function getIndexCSRFToken() {
	const name = 'csrftoken';
	let cookieValue = null;

	if (document.cookie && document.cookie !== '') {
		const cookies = document.cookie.split(';');
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.substring(0, name.length + 1) === (name + '=')) {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
				break;
			}
		}
	}
	return cookieValue;
}

// Функция уведомлений для главной страницы
function showIndexNotification(message, type = 'info') {
	console.log('📢 [INDEX] Показуємо сповіщення:', message, type);

	// Используем глобальную систему уведомлений если доступна
	if (typeof window.showMessage === 'function') {
		window.showMessage(message, type);
	} else {
		createIndexCustomNotification(message, type);
	}
}

// Создание кастомного уведомления для главной страницы
function createIndexCustomNotification(message, type = 'info') {
	// Удаляем существующие уведомления
	const existingNotifications = document.querySelectorAll('.index-custom-notification');
	existingNotifications.forEach(notif => notif.remove());

	const notification = document.createElement('div');
	notification.className = 'index-custom-notification';

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

// Локальный расчет прогресса для главной страницы
function updateIndexGoalProgressLocal(goalCard) {
	// Для главной страницы используем span-чекбоксы с data-completed
	const checkboxes = goalCard.querySelectorAll('.subgoal-checkbox');
	const totalSubgoals = checkboxes.length;
	const completedSubgoals = [...checkboxes].filter(cb => {
		const completedValue = (cb.dataset.completed || '').trim().toLowerCase();
		return completedValue === 'true';
	}).length;

	if (totalSubgoals === 0) return;

	const progressPercent = Math.round((completedSubgoals / totalSubgoals) * 100);

	// Обновляем прогресс-бар для главной страницы (.progress)
	const progressBar = goalCard.querySelector('.progress');
	if (progressBar) {
		progressBar.style.width = `${progressPercent}%`;
	}

	// Обновляем процент для главной страницы (.percent)
	const percentElement = goalCard.querySelector('.percent');
	if (percentElement) {
		percentElement.textContent = `${progressPercent}%`;
	}

	// Обновляем счетчик подцелей в заголовке
	const subgoalsHeader = goalCard.querySelector('.subgoals-section h4');
	if (subgoalsHeader) {
		const headerText = `Subgoals (${completedSubgoals}/${totalSubgoals})`;
		subgoalsHeader.textContent = headerText;
	}

	// Проверяем завершение цели (только визуальные эффекты, без перемещения)
	if (progressPercent === 100 && totalSubgoals > 0) {
		if (!goalCard.classList.contains('goal-completed')) {
			goalCard.classList.add('goal-completed');
			animateIndexGoalCompletion(goalCard);
		}
	} else if (progressPercent < 100) {
		if (goalCard.classList.contains('goal-completed')) {
			goalCard.classList.remove('goal-completed');
			removeIndexGoalCompletionEffects(goalCard);
		}
	}

	// Обновляем календарь привычек если все привычки выполнены
	if (typeof updateTodayInCalendar === 'function') {
		updateTodayInCalendar();
	}

	// Обновляем прогрессные круги активности
	if (typeof updateProgressCircles === 'function') {
		setTimeout(() => {
			updateProgressCircles();
		}, 100);
	}
}

// Обновление прогресса с сервера для главной страницы
function updateIndexGoalProgress(goalIdOrElement) {
	let goalCard, goalId;

	if (typeof goalIdOrElement === 'string' || typeof goalIdOrElement === 'number') {
		goalId = goalIdOrElement;
		goalCard = document.querySelector(`[data-goal-id="${goalId}"]`);
	} else if (goalIdOrElement && goalIdOrElement.closest) {
		goalCard = goalIdOrElement.closest('.goal-card');
		goalId = goalCard ? goalCard.dataset.goalId : null;
	} else {
		console.error('[INDEX] Invalid parameter passed to updateIndexGoalProgress:', goalIdOrElement);
		return;
	}

	if (!goalCard || !goalId) {
		console.error('[INDEX] Goal card or ID not found');
		return;
	}

	// Запрашиваем актуальные данные
	fetch(`/api/goal-progress/${goalId}/`)
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				const progressPercent = data.progress_percent || 0;
				const completedSubgoals = data.completed_subgoals || 0;
				const totalSubgoals = data.total_subgoals || 0;

				console.log('🎯 [INDEX] Прогрес цілі оновлено з сервера:', `${completedSubgoals}/${totalSubgoals} = ${progressPercent}%`);

				// Обновляем элементы для главной страницы
				const progressBar = goalCard.querySelector('.progress');
				if (progressBar) {
					progressBar.style.width = `${progressPercent}%`;
				}

				const percentElement = goalCard.querySelector('.percent');
				if (percentElement) {
					percentElement.textContent = `${progressPercent}%`;
				}

				const subgoalsHeader = goalCard.querySelector('.subgoals-section h4');
				if (subgoalsHeader) {
					const headerText = `Subgoals (${completedSubgoals}/${totalSubgoals})`;
					subgoalsHeader.textContent = headerText;
				}

				// Обновляем визуальное состояние подцелей
				updateIndexSubgoalsVisualState(goalCard);

				// Проверяем завершение цели
				if (progressPercent === 100 && totalSubgoals > 0 && !goalCard.classList.contains('goal-completed')) {
					goalCard.classList.add('goal-completed');
					animateIndexGoalCompletion(goalCard);
					showIndexNotification('🎉 Goal completed successfully!', 'success');
				} else if (progressPercent < 100 && goalCard.classList.contains('goal-completed')) {
					goalCard.classList.remove('goal-completed');
					removeIndexGoalCompletionEffects(goalCard);
				}

				// Обновляем календарь
				if (typeof updateTodayInCalendar === 'function') {
					updateTodayInCalendar();
				}

				// Обновляем прогрессные круги активности
				if (typeof updateProgressCircles === 'function') {
					setTimeout(() => {
						updateProgressCircles();
					}, 100);
				}
			}
		})
		.catch(error => {
			console.error('[INDEX] Помилка при отриманні прогресу цілі:', error);
			updateIndexGoalProgressLocal(goalCard);
		});
}

// Обновление визуального состояния подцелей для главной страницы
function updateIndexSubgoalsVisualState(goalCard) {
	const subgoalCheckboxes = goalCard.querySelectorAll('.subgoal-checkbox');

	subgoalCheckboxes.forEach(checkbox => {
		const completedValue = (checkbox.dataset.completed || '').trim().toLowerCase();
		const isCompleted = completedValue === 'true';
		const subgoalElement = checkbox.closest('.subgoal-item');
		const nameElement = subgoalElement ? subgoalElement.querySelector('.subgoal-name') : null;

		applyIndexSubgoalCompletionStyle(nameElement, subgoalElement, isCompleted);
	});
}

// Анимация завершения цели для главной страницы (без перемещения)
function animateIndexGoalCompletion(goalCard) {
	console.log('🎉 [INDEX] Анімація завершення цілі на головній сторінці!');

	// Только визуальные эффекты, без перемещения карточки
	goalCard.style.transition = 'all 0.5s ease';
	goalCard.style.borderColor = '#4CAF50';
	goalCard.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.6)';

	showIndexNotification('🎉 Goal completed successfully!', 'success');

	setTimeout(() => {
		goalCard.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.3)';
	}, 2000);
}

// Удаление эффектов завершения цели для главной страницы
function removeIndexGoalCompletionEffects(goalCard) {
	console.log('⬜ [INDEX] Видаляємо ефекти завершення цілі');

	goalCard.style.transition = 'all 0.5s ease';
	goalCard.style.borderColor = '';
	goalCard.style.boxShadow = '';
	goalCard.style.transform = '';
}

// Инициализация кнопок "Show all" для главной страницы
function initShowAllSubgoalsButtons() {
	console.log('🔍 [INDEX] Ініціалізація кнопок "Show all"');

	const showAllButtons = document.querySelectorAll('.show-all-subgoals-btn');
	console.log('🔍 [INDEX] Знайдено кнопок "Show all":', showAllButtons.length);

	showAllButtons.forEach(button => {
		if (button.hasAttribute('data-index-show-all-attached')) {
			return; // Уже инициализирована
		}

		button.setAttribute('data-index-show-all-attached', 'true');

		button.addEventListener('click', function (event) {
			event.preventDefault();
			console.log('🔍 [INDEX] Клік по кнопці "Show all"');

			const goalCard = this.closest('.goal-card');
			if (!goalCard) {
				console.error('[INDEX] Не знайдено goal-card для кнопки "Show all"');
				return;
			}

			// Находим скрытые подцели
			const hiddenSubgoals = goalCard.querySelectorAll('.hidden-subgoal');
			const moreIndicator = goalCard.querySelector('.more-subgoals-indicator');

			console.log('🔍 [INDEX] Прихованих підцілей:', hiddenSubgoals.length);

			if (hiddenSubgoals.length > 0) {
				// Добавляем подсветку и оверлей при раскрытии
				goalCard.classList.add('goal-expanded');
				addIndexGoalOverlay(goalCard);

				// Показываем скрытые подцели
				hiddenSubgoals.forEach(subgoal => {
					subgoal.classList.remove('hidden-subgoal');
					subgoal.style.display = 'flex';
				});

				// Скрываем индикатор "more"
				if (moreIndicator) {
					moreIndicator.style.display = 'none';
				}

				// Меняем текст кнопки на "Show less"
				this.textContent = 'Show less';
				this.classList.add('show-less');

				console.log('✅ [INDEX] Показано всі підцілі з підсвіткою');
			} else {
				// Убираем подсветку и оверлей при сворачивании
				goalCard.classList.remove('goal-expanded');
				removeIndexGoalOverlay();

				// Скрываем подцели после 3-й
				const allSubgoals = goalCard.querySelectorAll('.subgoal-item:not(.more-subgoals-indicator)');

				allSubgoals.forEach((subgoal, index) => {
					if (index >= 3) {
						subgoal.classList.add('hidden-subgoal');
						subgoal.style.display = 'none';
					}
				});

				// Показываем индикатор "more"
				if (moreIndicator) {
					moreIndicator.style.display = 'flex';
				}

				// Меняем текст кнопки обратно на "Show all"
				this.textContent = 'Show all';
				this.classList.remove('show-less');

				console.log('✅ [INDEX] Приховано зайві підцілі, прибрано підсвітку');
			}
		});
	});
}

// Функция для добавления оверлея и фокусировки на цели
function addIndexGoalOverlay(goalCard) {
	// Удаляем существующий оверлей если есть
	removeIndexGoalOverlay();

	// Создаем оверлей
	const overlay = document.createElement('div');
	overlay.className = 'index-goal-overlay';
	overlay.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.4);
		z-index: 98;
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: auto;
	`;

	// Добавляем обработчик клика по оверлею для закрытия
	overlay.addEventListener('click', function (event) {
		if (event.target === overlay) {
			// Клик по оверлею - закрываем развернутую цель
			const expandedGoal = document.querySelector('.goal-card.goal-expanded');
			if (expandedGoal) {
				const showLessBtn = expandedGoal.querySelector('.show-all-subgoals-btn.show-less');
				if (showLessBtn) {
					showLessBtn.click(); // Имитируем клик по кнопке "Show less"
				}
			}
		}
	});

	document.body.appendChild(overlay);

	// Анимация появления оверлея
	setTimeout(() => {
		overlay.style.opacity = '1';
	}, 10);

	// Добавляем класс expanded и повышаем z-index цели
	goalCard.style.position = 'relative';
	goalCard.style.zIndex = '99';

	console.log('🎭 [INDEX] Додано оверлей та підсвітку цілі');
}

// Функция для удаления оверлея
function removeIndexGoalOverlay() {
	const existingOverlay = document.querySelector('.index-goal-overlay');
	if (existingOverlay) {
		existingOverlay.style.opacity = '0';
		setTimeout(() => {
			if (existingOverlay.parentNode) {
				existingOverlay.parentNode.removeChild(existingOverlay);
			}
		}, 300);
	}

	// Убираем z-index со всех целей
	const allGoalCards = document.querySelectorAll('.goal-card');
	allGoalCards.forEach(card => {
		card.style.position = '';
		card.style.zIndex = '';
	});

	console.log('🎭 [INDEX] Прибрано оверлей та підсвітку');
}

// Инициализация обработчика клавиши Escape для главной страницы
function initIndexEscapeHandler() {
	// Проверяем, что обработчик еще не добавлен
	if (window.indexEscapeHandlerInitialized) {
		return;
	}

	window.indexEscapeHandlerInitialized = true;

	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape') {
			// Проверяем, есть ли развернутая цель
			const expandedGoal = document.querySelector('.goal-card.goal-expanded');
			if (expandedGoal) {
				event.preventDefault();
				const showLessBtn = expandedGoal.querySelector('.show-all-subgoals-btn.show-less');
				if (showLessBtn) {
					showLessBtn.click(); // Имитируем клик по кнопке "Show less"
				}
				console.log('⌨️ [INDEX] Закрито розгорнуту ціль через Escape');
			}
		}
	});

	console.log('⌨️ [INDEX] Ініціалізовано обробник клавіші Escape');
}

// Автоинициализация для главной страницы
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initIndexSubgoalHandlers);
} else {
	// Проверяем, что мы на главной странице перед инициализацией
	const isIndexPage = window.location.pathname === '/' ||
		window.location.pathname.includes('/index') ||
		document.querySelector('.welcome-section') !== null;

	if (isIndexPage) {
		initIndexSubgoalHandlers();
	}
}