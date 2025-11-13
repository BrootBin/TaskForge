/**
 * Компонент для работы с подцелями на главной странице (index.html)
 * TaskForge - специализированные обработчики для главной страницы
 */

// Глобальные переменные для управления автоматическим перемещением подцелей
// Защита от повторной инициализации
if (!window.autoReplaceTimers) {
	window.autoReplaceTimers = new Map(); // Хранит таймеры для автоперемещения
}
if (!window.REPLACE_DELAY) {
	window.REPLACE_DELAY = 5000; // 5 секунд задержки
}

const autoReplaceTimers = window.autoReplaceTimers;
const REPLACE_DELAY = window.REPLACE_DELAY;

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

// Функция для возвращения подцели в видимую область (когда снимается отметка выполнения)
function moveSubgoalBackToVisible(subgoalElement, goalCard) {
	if (!subgoalElement || !goalCard) return;

	console.log('↩️ [INDEX] Возвращение подцели в видимую область');

	const isGoalExpanded = goalCard.classList.contains('goal-expanded');

	// Если цель раскрыта, просто показываем элемент
	if (isGoalExpanded) {
		if (subgoalElement.classList.contains('hidden-subgoal')) {
			subgoalElement.classList.remove('hidden-subgoal');
			subgoalElement.style.display = 'flex';
		}
		return;
	}

	// Если цель не раскрыта, нужно проверить, поместится ли подцель в первые 3
	const subgoalsContainer = goalCard.querySelector('.subgoals-list');
	if (!subgoalsContainer) return;

	const allSubgoals = Array.from(subgoalsContainer.querySelectorAll('.subgoal-item:not(.more-subgoals-indicator)'));
	const incompleteSubgoals = allSubgoals.filter(subgoal => {
		const checkbox = subgoal.querySelector('.subgoal-checkbox');
		return checkbox && checkbox.dataset.completed !== 'true';
	});

	// Если после возвращения будет <= 3 невыполненных подцелей, показываем элемент
	if (incompleteSubgoals.length <= 3) {
		subgoalElement.classList.remove('hidden-subgoal');

		// Анимация появления
		subgoalElement.style.opacity = '0';
		subgoalElement.style.transform = 'translateY(-10px)';
		subgoalElement.style.display = 'flex';

		requestAnimationFrame(() => {
			subgoalElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
			subgoalElement.style.opacity = '1';
			subgoalElement.style.transform = 'translateY(0)';

			setTimeout(() => {
				subgoalElement.style.transition = '';
				subgoalElement.style.transform = '';
			}, 300);
		});

		// Обновляем индикатор "more"
		const moreIndicator = goalCard.querySelector('.more-subgoals-indicator');
		if (moreIndicator) {
			const hiddenSubgoals = allSubgoals.filter(subgoal => subgoal.classList.contains('hidden-subgoal'));
			const moreText = moreIndicator.querySelector('.more-text');

			if (hiddenSubgoals.length > 0) {
				if (moreText) {
					moreText.textContent = `+${hiddenSubgoals.length} more`;
				}
				moreIndicator.style.display = 'flex';
			} else {
				moreIndicator.style.display = 'none';
			}
		}

		console.log('✅ [INDEX] Подцель возвращена в видимую область');
	}
}

// Функция для перемещения выполненных подцелей вниз списка (с учетом скрытых подцелей)
async function moveCompletedSubgoalToBottom(completedSubgoalElement, goalCard) {
	if (!completedSubgoalElement || !goalCard) return;

	const subgoalsContainer = goalCard.querySelector('.subgoals-list');
	if (!subgoalsContainer) return;

	console.log('🔄 [INDEX] Перемещение выполненной подцели с учетом скрытых элементов');

	// Получаем все подцели, исключая индикаторы "more"
	const allSubgoals = Array.from(subgoalsContainer.querySelectorAll('.subgoal-item:not(.more-subgoals-indicator)'));
	const moreIndicator = subgoalsContainer.querySelector('.more-subgoals-indicator');
	const isGoalExpanded = goalCard.classList.contains('goal-expanded');

	// Определяем, нужно ли скрывать подцель
	let shouldHideSubgoal = false;

	if (!isGoalExpanded) {
		// Если цель не раскрыта, считаем видимые подцели (без hidden-subgoal)
		const visibleSubgoals = allSubgoals.filter(subgoal => !subgoal.classList.contains('hidden-subgoal'));
		const visibleIndex = visibleSubgoals.indexOf(completedSubgoalElement);

		// Если выполненная подцель будет после 3-й позиции в общем списке, скрываем её
		const completedSubgoals = allSubgoals.filter(subgoal => {
			const checkbox = subgoal.querySelector('.subgoal-checkbox');
			return checkbox && checkbox.dataset.completed === 'true';
		});

		// Определяем финальную позицию после сортировки
		const incompleteSubgoals = allSubgoals.filter(subgoal => {
			const checkbox = subgoal.querySelector('.subgoal-checkbox');
			return checkbox && checkbox.dataset.completed !== 'true' && subgoal !== completedSubgoalElement;
		});

		const finalPosition = incompleteSubgoals.length; // Позиция среди всех после сортировки
		shouldHideSubgoal = finalPosition >= 3; // Скрываем если позиция >= 3 (4-я, 5-я и т.д.)
	}

	// Сохраняем исходную позицию для анимации
	const originalRect = completedSubgoalElement.getBoundingClientRect();

	// Временно клонируем элемент для плавной анимации
	const placeholder = completedSubgoalElement.cloneNode(true);
	placeholder.style.opacity = '0.3';
	placeholder.style.pointerEvents = 'none';
	completedSubgoalElement.parentNode.insertBefore(placeholder, completedSubgoalElement);

	// Перемещаем элемент в конечную позицию без анимации
	if (moreIndicator) {
		subgoalsContainer.insertBefore(completedSubgoalElement, moreIndicator);
	} else {
		subgoalsContainer.appendChild(completedSubgoalElement);
	}

	// Если нужно скрыть подцель, делаем это сразу после перемещения
	if (shouldHideSubgoal) {
		completedSubgoalElement.classList.add('hidden-subgoal');

		// Обновляем индикатор "more" если есть скрытые подцели
		if (moreIndicator) {
			const hiddenCount = allSubgoals.filter(subgoal => subgoal.classList.contains('hidden-subgoal')).length + 1; // +1 за текущую
			const moreText = moreIndicator.querySelector('.more-text');
			if (moreText) {
				moreText.textContent = `+${hiddenCount} more`;
			}
			moreIndicator.style.display = 'flex';
		}
	}

	// Получаем новую позицию (для анимации)
	let newRect;
	if (shouldHideSubgoal) {
		// Если элемент скрывается, анимируем к позиции индикатора "more"
		newRect = moreIndicator ? moreIndicator.getBoundingClientRect() : originalRect;
	} else {
		newRect = completedSubgoalElement.getBoundingClientRect();
	}

	const deltaY = originalRect.top - newRect.top;

	// Устанавливаем элемент в исходную позицию для анимации
	completedSubgoalElement.style.transform = `translateY(${deltaY}px)`;
	completedSubgoalElement.style.transition = 'none';

	// Если элемент скрывается, начинаем с полной непрозрачности
	if (!shouldHideSubgoal) {
		completedSubgoalElement.style.opacity = '1';
	}

	// Запускаем анимацию плавного перемещения
	requestAnimationFrame(() => {
		if (shouldHideSubgoal) {
			// Анимация скрытия: уменьшаем прозрачность и перемещаем
			completedSubgoalElement.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease';
			completedSubgoalElement.style.transform = 'translateY(0)';
			completedSubgoalElement.style.opacity = '0';

			setTimeout(() => {
				// Полностью скрываем элемент
				completedSubgoalElement.style.display = 'none';
				completedSubgoalElement.style.transform = '';
				completedSubgoalElement.style.transition = '';
			}, 600);
		} else {
			// Обычная анимация перемещения
			completedSubgoalElement.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
			completedSubgoalElement.style.transform = 'translateY(0)';
			completedSubgoalElement.style.opacity = '0.8';

			// Возвращаем полную непрозрачность в конце анимации
			setTimeout(() => {
				completedSubgoalElement.style.opacity = '';
				completedSubgoalElement.style.transform = '';
				completedSubgoalElement.style.transition = '';
			}, 600);
		}

		// Убираем placeholder
		setTimeout(() => {
			if (placeholder.parentNode) {
				placeholder.remove();
			}
		}, 100);
	});

	if (shouldHideSubgoal) {
		console.log('✅ [INDEX] Выполненная подцель перемещена в скрытую область');
	} else {
		console.log('✅ [INDEX] Выполненная подцель перемещена вниз видимого списка');
	}
}

// Функция для сортировки подцелей в карточке цели с анимацией (невыполненные сверху, выполненные снизу)
function sortSubgoalsInGoalCard(goalCard, animated = true) {
	if (!goalCard) return;

	const subgoalsContainer = goalCard.querySelector('.subgoals-list');
	if (!subgoalsContainer) return;

	// Получаем все подцели, исключая индикаторы
	const allSubgoals = Array.from(subgoalsContainer.querySelectorAll('.subgoal-item:not(.more-subgoals-indicator)'));
	const moreIndicator = subgoalsContainer.querySelector('.more-subgoals-indicator');
	const isGoalExpanded = goalCard.classList.contains('goal-expanded');

	if (allSubgoals.length === 0) return;

	// Если анимация отключена или подцелей <= 1, выполняем быструю сортировку
	if (!animated || allSubgoals.length <= 1) {
		sortSubgoalsInGoalCardQuick(goalCard);
		return;
	}

	// Сохраняем исходные позиции для анимации
	const originalPositions = new Map();
	allSubgoals.forEach(subgoal => {
		const rect = subgoal.getBoundingClientRect();
		originalPositions.set(subgoal, {
			top: rect.top,
			left: rect.left
		});
	});

	// Сортируем: невыполненные подцели сверху, выполненные снизу
	const sortedSubgoals = [...allSubgoals].sort((a, b) => {
		const aCompleted = (a.querySelector('.subgoal-checkbox')?.dataset.completed || '').toLowerCase() === 'true';
		const bCompleted = (b.querySelector('.subgoal-checkbox')?.dataset.completed || '').toLowerCase() === 'true';

		// Невыполненные (false) должны быть первыми
		if (aCompleted !== bCompleted) {
			return aCompleted - bCompleted;
		}

		// Если статус одинаковый, сохраняем исходный порядок
		return 0;
	});

	// Проверяем, нужна ли анимация (изменился ли порядок)
	const needsAnimation = !allSubgoals.every((subgoal, index) => subgoal === sortedSubgoals[index]);

	if (!needsAnimation) {
		// Если порядок не изменился, выполняем только управление видимостью
		managSubgoalsVisibility(goalCard, sortedSubgoals, isGoalExpanded, moreIndicator);
		return;
	}

	// Перестраиваем DOM в отсортированном порядке
	sortedSubgoals.forEach((subgoal, index) => {
		if (moreIndicator) {
			subgoalsContainer.insertBefore(subgoal, moreIndicator);
		} else {
			subgoalsContainer.appendChild(subgoal);
		}
	});

	// Получаем новые позиции после перестановки
	const newPositions = new Map();
	sortedSubgoals.forEach(subgoal => {
		const rect = subgoal.getBoundingClientRect();
		newPositions.set(subgoal, {
			top: rect.top,
			left: rect.left
		});
	});

	// Применяем анимацию FLIP (First, Last, Invert, Play)
	sortedSubgoals.forEach(subgoal => {
		const originalPos = originalPositions.get(subgoal);
		const newPos = newPositions.get(subgoal);

		if (!originalPos || !newPos) return;

		const deltaY = originalPos.top - newPos.top;
		const deltaX = originalPos.left - newPos.left;

		// Если элемент не сдвинулся, не анимируем
		if (Math.abs(deltaY) < 2 && Math.abs(deltaX) < 2) return;

		// Устанавливаем элемент в исходную позицию
		subgoal.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
		subgoal.style.transition = 'none';

		// Запускаем анимацию к новой позиции
		requestAnimationFrame(() => {
			subgoal.style.transition = 'transform 0.4s cubic-bezier(0.2, 0, 0.2, 1)';
			subgoal.style.transform = 'translate(0, 0)';

			// Очищаем стили после анимации
			setTimeout(() => {
				subgoal.style.transform = '';
				subgoal.style.transition = '';
			}, 400);
		});
	});

	// Управляем видимостью с небольшой задержкой для завершения анимации
	setTimeout(() => {
		console.log('🔄 [INDEX] Управляем видимостью подцелей после анимации');
		managSubgoalsVisibility(goalCard, sortedSubgoals, isGoalExpanded, moreIndicator);
		// ВАЖНО: Обновляем прогресс ПОСЛЕ управления видимостью
		console.log('📊 [INDEX] Обновляем прогресс после управления видимостью');
		updateIndexGoalProgressLocal(goalCard);
	}, 200);

	console.log('🎬 [INDEX] Подцели отсортированы с анимацией: невыполненные сверху, выполненные снизу');
}

// Быстрая сортировка без анимации (для инициализации)
function sortSubgoalsInGoalCardQuick(goalCard) {
	if (!goalCard) return;

	const subgoalsContainer = goalCard.querySelector('.subgoals-list');
	if (!subgoalsContainer) return;

	// Получаем все подцели, исключая индикаторы
	const allSubgoals = Array.from(subgoalsContainer.querySelectorAll('.subgoal-item:not(.more-subgoals-indicator)'));
	const moreIndicator = subgoalsContainer.querySelector('.more-subgoals-indicator');
	const isGoalExpanded = goalCard.classList.contains('goal-expanded');

	if (allSubgoals.length === 0) return;

	// Сортируем: невыполненные подцели сверху, выполненные снизу
	allSubgoals.sort((a, b) => {
		const aCompleted = (a.querySelector('.subgoal-checkbox')?.dataset.completed || '').toLowerCase() === 'true';
		const bCompleted = (b.querySelector('.subgoal-checkbox')?.dataset.completed || '').toLowerCase() === 'true';

		// Невыполненные (false) должны быть первыми
		if (aCompleted !== bCompleted) {
			return aCompleted - bCompleted;
		}

		// Если статус одинаковый, сохраняем исходный порядок
		return 0;
	});

	// Перестраиваем DOM в отсортированном порядке
	allSubgoals.forEach((subgoal, index) => {
		if (moreIndicator) {
			subgoalsContainer.insertBefore(subgoal, moreIndicator);
		} else {
			subgoalsContainer.appendChild(subgoal);
		}
	});

	// Управляем видимостью
	managSubgoalsVisibility(goalCard, allSubgoals, isGoalExpanded, moreIndicator);

	console.log('⚡ [INDEX] Быстрая сортировка подцелей завершена');
}

// Вспомогательная функция для управления видимостью подцелей с анимацией
function managSubgoalsVisibility(goalCard, subgoals, isGoalExpanded, moreIndicator) {
	// Управляем видимостью подцелей
	subgoals.forEach((subgoal, index) => {
		if (!isGoalExpanded) {
			if (index >= 3) {
				// Скрываем подцели после 3-й позиции с анимацией
				if (!subgoal.classList.contains('hidden-subgoal')) {
					subgoal.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
					subgoal.style.opacity = '0';
					subgoal.style.transform = 'translateY(-10px)';

					setTimeout(() => {
						subgoal.classList.add('hidden-subgoal');
						subgoal.style.display = 'none';
						subgoal.style.transition = '';
						subgoal.style.opacity = '';
						subgoal.style.transform = '';
					}, 300);
				}
			} else {
				// Показываем первые 3 подцели с анимацией
				if (subgoal.classList.contains('hidden-subgoal')) {
					subgoal.classList.remove('hidden-subgoal');
					subgoal.style.opacity = '0';
					subgoal.style.transform = 'translateY(-10px)';
					subgoal.style.display = 'flex';

					requestAnimationFrame(() => {
						subgoal.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
						subgoal.style.opacity = '1';
						subgoal.style.transform = 'translateY(0)';

						setTimeout(() => {
							subgoal.style.transition = '';
							subgoal.style.transform = '';
						}, 300);
					});
				} else if (subgoal.style.display === 'none') {
					// Просто показываем если элемент был скрыт
					subgoal.style.display = 'flex';
				}
			}
		}
	});

	// Обновляем индикатор "more" если цель не раскрыта
	if (!isGoalExpanded && moreIndicator) {
		const hiddenSubgoals = subgoals.filter((subgoal, index) => index >= 3);
		const moreText = moreIndicator.querySelector('.more-text');

		if (hiddenSubgoals.length > 0) {
			if (moreText) {
				moreText.textContent = `+${hiddenSubgoals.length} more`;
			}
			// Плавное появление индикатора
			if (moreIndicator.style.display === 'none') {
				moreIndicator.style.opacity = '0';
				moreIndicator.style.display = 'flex';
				requestAnimationFrame(() => {
					moreIndicator.style.transition = 'opacity 0.2s ease';
					moreIndicator.style.opacity = '1';
					setTimeout(() => {
						moreIndicator.style.transition = '';
					}, 200);
				});
			} else {
				moreIndicator.style.display = 'flex';
			}
		} else {
			// Плавное скрытие индикатора
			if (moreIndicator.style.display !== 'none') {
				moreIndicator.style.transition = 'opacity 0.2s ease';
				moreIndicator.style.opacity = '0';
				setTimeout(() => {
					moreIndicator.style.display = 'none';
					moreIndicator.style.transition = '';
					moreIndicator.style.opacity = '';
				}, 200);
			}
		}
	}
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
		// Сортируем подцели при инициализации: невыполненные сверху, выполненные снизу (без анимации)
		sortSubgoalsInGoalCard(goalCard, false);
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
		const goalCard = subgoalElement ? subgoalElement.closest('.goal-card') : null;

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

			// Обновляем статус цели сразу на основе ответа API
			if (data.goal_completed !== undefined) {
				const goalStatus = goalCard.querySelector('.goal-status');
				if (goalStatus) {
					if (data.goal_completed) {
						goalStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> Completed';
						goalStatus.classList.add('completed');
						goalCard.classList.add('completed');
					} else {
						goalStatus.innerHTML = '<i class="fa-regular fa-circle"></i> In Progress';
						goalStatus.classList.remove('completed');
						goalCard.classList.remove('completed');
					}
				}
			}

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
			if (goalCard) {
				console.log('🎯 [INDEX] Оновлюємо прогрес цілі');
				// Сортируем подцели после изменения состояния с анимацией
				setTimeout(() => {
					sortSubgoalsInGoalCard(goalCard, true);
				}, 400); // Небольшая задержка после анимации

				// Получаем свежие данные с сервера
				setTimeout(() => {
					updateIndexGoalProgress(goalCard.dataset.goalId);
				}, 100);
			}

			// Показываем уведомление
			const message = actualCompleted ?
				'✅ Great! Subgoal completed!' :
				'⏪ Subgoal marked as incomplete';
			showIndexNotification(message, actualCompleted ? 'success' : 'warning');

			// Планируем автоперемещение для выполненной подцели или отменяем для невыполненной
			if (actualCompleted) {
				scheduleAutoReplace(subgoalElement, goalCard);
			} else {
				cancelAutoReplace(subgoalId);
				// Возвращаем подцель в видимую область если она была скрыта
				moveSubgoalBackToVisible(subgoalElement, goalCard);
			}

		} catch (error) {
			console.error('❌ [INDEX] Error updating subgoal:', error);

			// Возвращаем состояние в случае ошибки
			setCurrentState(!newCompleted);
			applyIndexSubgoalCompletionStyle(nameElement, subgoalElement, !newCompleted);

			// Отменяем автоперемещение в случае ошибки
			cancelAutoReplace(subgoalId);

			// Если возвращаем в невыполненное состояние, пытаемся вернуть в видимую область
			if (!newCompleted) {
				moveSubgoalBackToVisible(subgoalElement, goalCard);
			}

			if (subgoalElement) {
				subgoalElement.style.transform = 'scale(1)';
				subgoalElement.style.boxShadow = '';
				subgoalElement.style.transition = '';
			}

			showIndexNotification('Error updating subgoal: ' + error.message, 'error');
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

	// Используем централизованную систему уведомлений
	if (typeof showNotification === 'function') {
		showNotification(message, type);
	} else if (typeof window.showMessage === 'function') {
		// Fallback на глобальную функцию
		window.showMessage(message, type);
	}
}



// Локальный расчет прогресса для главной страницы
function updateIndexGoalProgressLocal(goalCard) {
	// Для главной страницы используем span-чекбоксы с data-completed
	const checkboxes = goalCard.querySelectorAll('.subgoal-checkbox');
	const totalSubgoals = checkboxes.length;

	// Считаем только реально существующие подцели (не учитываем скрытые для подсчета прогресса)
	const completedSubgoals = [...checkboxes].filter(cb => {
		const completedValue = (cb.dataset.completed || '').trim().toLowerCase();
		return completedValue === 'true';
	}).length;

	if (totalSubgoals === 0) return;

	const progressPercent = Math.round((completedSubgoals / totalSubgoals) * 100);

	console.log(`📊 [INDEX] Прогресс обновлен: ${completedSubgoals}/${totalSubgoals} = ${progressPercent}%`);

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

	// Обновляем статус цели
	const goalStatus = goalCard.querySelector('.goal-status');
	const isCompleted = progressPercent === 100;

	if (goalStatus) {
		if (isCompleted) {
			goalStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> Completed';
			goalStatus.classList.add('completed');
			goalCard.classList.add('completed');
		} else {
			goalStatus.innerHTML = '<i class="fa-regular fa-circle"></i> In Progress';
			goalStatus.classList.remove('completed');
			goalCard.classList.remove('completed');
		}
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

				// Обновляем статус цели
				const goalStatus = goalCard.querySelector('.goal-status');
				const isCompleted = data.goal_completed || progressPercent === 100;

				if (goalStatus) {
					if (isCompleted) {
						goalStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> Completed';
						goalStatus.classList.add('completed');
						goalCard.classList.add('completed');
					} else {
						goalStatus.innerHTML = '<i class="fa-regular fa-circle"></i> In Progress';
						goalStatus.classList.remove('completed');
						goalCard.classList.remove('completed');
					}
				}

				const subgoalsHeader = goalCard.querySelector('.subgoals-section h4');
				if (subgoalsHeader) {
					const headerText = `Subgoals (${completedSubgoals}/${totalSubgoals})`;
					subgoalsHeader.textContent = headerText;
				}

				// Обновляем визуальное состояние подцелей
				updateIndexSubgoalsVisualState(goalCard);

				// Сортируем подцели после обновления состояния с анимацией
				setTimeout(() => {
					sortSubgoalsInGoalCard(goalCard, true);
				}, 100);

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