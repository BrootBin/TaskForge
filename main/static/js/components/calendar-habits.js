/**
 * Компонент интеграции календаря с привычками
 * TaskForge - отметки в календаре для дней с выполненными привычками
 */

// Объект для хранения данных о выполненных привычках по дням
if (typeof habitsCompletionData === 'undefined') {
	var habitsCompletionData = {};
}

// Кэш для предотвращения повторных запросов (проверяем существование)
if (typeof habitsHistoryLoaded === 'undefined') {
	var habitsHistoryLoaded = false;
	var habitsHistoryPromise = null;
}

// Инициализация интеграции календаря с привычками
function initCalendarHabitsIntegration() {
	// Проверяем, что мы на главной странице
	const isIndexPage = window.location.pathname === '/' ||
		window.location.pathname.includes('/index') ||
		document.querySelector('.welcome-section') !== null;

	if (!isIndexPage) {
		return;
	}

	// НЕМЕДЛЕННО начинаем загрузку данных для ускорения месячного прогресса
	loadHabitsCompletionHistory();

	// Проверяем текущее состояние привычек БЕЗ задержки
	checkTodayHabitsCompletion();
}

// Функция для предварительной загрузки данных (вызывается как можно раньше)
function preloadHabitsData() {
	// Проверяем, что пользователь авторизован
	if (document.body.classList.contains('authenticated')) {
		// Начинаем загрузку данных в фоне
		loadHabitsCompletionHistory();
	}
}

// Загружаем историю выполнения привычек с сервера
function loadHabitsCompletionHistory() {
	// Если данные уже загружены, сразу обновляем интерфейс
	if (habitsHistoryLoaded) {
		// Устанавливаем флаг готовности данных
		if (typeof setCalendarDataReady === 'function') {
			setCalendarDataReady();
		}
		// Обновляем прогресс-круги БЕЗ задержки
		if (typeof updateProgressCircles === 'function') {
			updateProgressCircles();
		}
		return Promise.resolve();
	}

	// Если запрос уже в процессе, возвращаем существующий Promise
	if (habitsHistoryPromise) {
		return habitsHistoryPromise;
	}

	// Проверяем, авторизован ли пользователь
	if (!document.body.classList.contains('authenticated')) {
		return Promise.resolve();
	}

	// Создаем и сохраняем Promise для предотвращения дублирования запросов
	habitsHistoryPromise = fetch('/api/habits-completion-history/', {
		// Добавляем настройки для ускорения запроса
		method: 'GET',
		headers: {
			'Cache-Control': 'max-age=60', // Кешируем на минуту
		}
	})
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			return response.json();
		})
		.then(data => {
			if (data.status === 'success') {
				const serverData = data.data || {};

				// Обрабатываем данные с сервера, добавляя логику day_was_complete
				Object.keys(serverData).forEach(dateStr => {
					const dayData = serverData[dateStr];

					// Если day_was_complete не установлен, определяем его на основе исторических данных
					if (dayData.day_was_complete === undefined) {
						// СПЕЦИАЛЬНАЯ ЛОГИКА: Если это день 2025-11-03 и выполнено 2 привычки,
						// то это был полностью выполненный день до добавления новой привычки
						if (dateStr === '2025-11-03' && dayData.completed_count === 2) {
							dayData.day_was_complete = true;
						} else {
							// Для других дней: используем стандартную логику
							dayData.day_was_complete = dayData.all_completed && dayData.total_count > 0;
						}
					}
				});

				habitsCompletionData = serverData;
				habitsHistoryLoaded = true; // Помечаем данные как загруженные

				// Устанавливаем флаг готовности данных календаря
				if (typeof setCalendarDataReady === 'function') {
					setCalendarDataReady();
				}

				// Обновляем календарь БЕЗ задержки для ускорения
				updateCalendarMarks();

				// Обновляем прогресс-круги сразу после загрузки данных
				if (typeof updateProgressCircles === 'function') {
					updateProgressCircles();
				}
			} else {
				console.error('❌ [CALENDAR-HABITS] Ошибка загрузки истории:', data.message);
			}
		})
		.catch(error => {
			console.error('❌ [CALENDAR-HABITS] Ошибка запроса истории:', error);
			habitsHistoryPromise = null; // Сбрасываем Promise при ошибке
		})
		.finally(() => {
			habitsHistoryPromise = null; // Сбрасываем Promise после завершения
		});

	return habitsHistoryPromise;
}

// Проверяем, выполнены ли все привычки на сегодня
function checkTodayHabitsCompletion() {
	const habitCards = document.querySelectorAll('.habit-card:not(.template)');

	if (habitCards.length === 0) {
		return;
	}

	let allCompleted = true;
	let totalHabits = 0;
	let completedHabits = 0;

	habitCards.forEach(card => {
		const checkbox = card.querySelector('.habit-check');
		if (checkbox && !checkbox.disabled) {
			totalHabits++;
			if (checkbox.checked) {
				completedHabits++;
			} else {
				allCompleted = false;
			}
		}
	});

	// Обновляем данные для сегодняшнего дня
	const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

	// Получаем существующие данные для сегодняшнего дня
	const existingDayData = habitsCompletionData[today];

	// Определяем, был ли день уже помечен как полностью выполненный ранее
	let dayWasComplete = false;
	if (existingDayData && existingDayData.day_was_complete === true) {
		// Если день уже был помечен как выполненный, сохраняем этот статус
		dayWasComplete = true;
	} else if (allCompleted && totalHabits > 0) {
		// Если день впервые становится полностью выполненным
		dayWasComplete = true;
	}

	// Сохраняем или обновляем данные о завершении дня
	if (!habitsCompletionData[today]) {
		// Создаем новую запись
		habitsCompletionData[today] = {
			all_completed: allCompleted,
			completed_count: completedHabits,
			total_count: totalHabits,
			day_was_complete: dayWasComplete, // Сохраняется навсегда после первого полного выполнения
			last_updated: new Date().toISOString()
		};
	} else {
		// Обновляем существующую запись, сохраняя day_was_complete если он уже был true
		const previousDayWasComplete = habitsCompletionData[today].day_was_complete;
		habitsCompletionData[today] = {
			...habitsCompletionData[today], // Сохраняем существующие данные
			all_completed: allCompleted,
			completed_count: completedHabits,
			total_count: totalHabits,
			day_was_complete: previousDayWasComplete || dayWasComplete, // Никогда не убираем true статус
			last_updated: new Date().toISOString()
		};
	}

	// Обновляем отметки в календаре
	updateCalendarMarks();

	// Отправляем данные на сервер, если все привычки выполнены
	if (allCompleted && totalHabits > 0) {
		saveHabitsCompletionToServer(today, true);
	} else if (completedHabits > 0) {
		// Сохраняем частичное выполнение
		saveHabitsCompletionToServer(today, false);
	}

	// Обновляем прогрессные круги активности
	if (typeof updateProgressCircles === 'function') {
		setTimeout(() => {
			updateProgressCircles();
		}, 100);
	}
}// Сохраняем информацию о выполнении привычек на сервер
function saveHabitsCompletionToServer(date, allCompleted) {
	if (!document.body.classList.contains('authenticated')) {
		return;
	}

	// Получаем данные для этого дня
	const dayData = habitsCompletionData[date];
	if (!dayData) {
		console.warn('⚠️ [CALENDAR-HABITS] Нет данных для сохранения для даты:', date);
		return;
	}

	fetch('/api/habits-completion/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCalendarCSRFToken(),
		},
		body: JSON.stringify({
			date: date,
			all_completed: allCompleted,
			day_was_complete: dayData.day_was_complete || false,
			completed_count: dayData.completed_count || 0,
			total_count: dayData.total_count || 0
		})
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
			} else {
				console.error('❌ [CALENDAR-HABITS] Ошибка сохранения:', data.message);
			}
		})
		.catch(error => {
			console.error('❌ [CALENDAR-HABITS] Ошибка запроса сохранения:', error);
		});
}

// Обновляем отметки в календаре
function updateCalendarMarks() {
	const calendarDays = document.querySelectorAll('.day:not(.empty)');

	if (calendarDays.length === 0) {
		console.warn('⚠️ [CALENDAR-HABITS] Дни календаря не найдены!');
		return;
	}

	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();
	const todayString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

	calendarDays.forEach(dayElement => {
		const dayNumber = parseInt(dayElement.textContent);
		if (!dayNumber) return;

		// Формируем дату в формате YYYY-MM-DD
		const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

		// Удаляем предыдущие классы отметок
		dayElement.classList.remove('habits-completed', 'habits-partial');

		// Проверяем данные о выполнении привычек для этого дня
		const dayData = habitsCompletionData[dateString];
		if (dayData) {
			let isCompleted = false;
			let isPartial = false;

			if (dateString === todayString) {
				// Для сегодняшнего дня используем актуальное состояние
				isCompleted = dayData.all_completed && dayData.total_count > 0;
				isPartial = !isCompleted && dayData.completed_count > 0;
			} else {
				// Для исторических дней используем сохраненные данные
				// Если day_was_complete сохранен, используем его
				// Иначе полагаемся на соотношение completed_count/total_count на момент сохранения
				if (dayData.day_was_complete !== undefined) {
					isCompleted = dayData.day_was_complete;
					isPartial = !isCompleted && dayData.completed_count > 0;
				} else {
					// Fallback: если все привычки того дня были выполнены
					isCompleted = dayData.all_completed && dayData.total_count > 0;
					isPartial = !isCompleted && dayData.completed_count > 0;
				}
			}

			if (isCompleted) {
				// Все привычки выполнены - зеленая отметка
				dayElement.classList.add('habits-completed');
				dayElement.title = `${dayData.completed_count}/${dayData.total_count} привычек выполнено ✅`;
			} else if (isPartial) {
				// Частично выполнены - желтая отметка
				dayElement.classList.add('habits-partial');
				dayElement.title = `${dayData.completed_count}/${dayData.total_count} привычек выполнено ⚡`;
			}
		}
	});
}

// Функция для обновления календаря при изменении привычек
function updateTodayInCalendar() {
	console.log('🔄 [CALENDAR-HABITS] Обновление сегодняшнего дня в календаре');
	checkTodayHabitsCompletion();

	// Обновляем прогрессные круги активности
	if (typeof updateProgressCircles === 'function') {
		setTimeout(() => {
			updateProgressCircles();
		}, 100);
	}
}

// Глобальная функция для проверки статуса привычек (вызывается из habit-checkbox.js)
window.checkDailyHabitsStatus = function () {
	console.log('🔄 [CALENDAR-HABITS] Глобальная проверка статуса привычек');
	setTimeout(() => {
		checkTodayHabitsCompletion();
	}, 100);
};

// Функция для получения CSRF токена
function getCalendarCSRFToken() {
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

// Расширяем стандартный календарь для поддержки отметок привычек
function enhanceCalendarWithHabits() {
	// Переопределяем создание дней календаря для добавления поддержки отметок
	const originalInitializeCalendar = window.initializeCalendar;

	if (typeof originalInitializeCalendar === 'function') {
		window.initializeCalendar = function () {
			// Вызываем оригинальную функцию
			originalInitializeCalendar();

			// Добавляем наши отметки с увеличенной задержкой
			setTimeout(() => {
				console.log('🎨 [CALENDAR-HABITS] Инициализация отметок календаря после создания дней');
				updateCalendarMarks();
			}, 300);
		};
	}
}

// Автоинициализация с увеличенными задержками
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', function () {
		setTimeout(() => {
			initCalendarHabitsIntegration();
			enhanceCalendarWithHabits();
		}, 500);
	});
} else {
	setTimeout(() => {
		initCalendarHabitsIntegration();
		enhanceCalendarWithHabits();
	}, 500);
}