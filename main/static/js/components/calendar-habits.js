/**
 * Компонент интеграции календаря с привычками
 * TaskForge - отметки в календаре для дней с выполненными привычками
 */

// Объект для хранения данных о выполненных привычках по дням
let habitsCompletionData = {};

// Инициализация интеграции календаря с привычками
function initCalendarHabitsIntegration() {
	console.log('📅 [CALENDAR-HABITS] Инициализация интеграции календаря с привычками');

	// Проверяем, что мы на главной странице
	const isIndexPage = window.location.pathname === '/' ||
		window.location.pathname.includes('/index') ||
		document.querySelector('.welcome-section') !== null;

	if (!isIndexPage) {
		console.log('❌ [CALENDAR-HABITS] Не главная страница, пропускаем инициализацию');
		return;
	}

	// Загружаем историю выполнения привычек
	loadHabitsCompletionHistory();

	// Проверяем текущее состояние привычек
	setTimeout(() => {
		checkTodayHabitsCompletion();
	}, 500);
}

// Загружаем историю выполнения привычек с сервера
function loadHabitsCompletionHistory() {
	// Проверяем, авторизован ли пользователь
	console.log('🔍 [CALENDAR-HABITS] Проверка авторизации...');
	console.log('🔍 [CALENDAR-HABITS] document.body.className:', document.body.className);
	console.log('🔍 [CALENDAR-HABITS] authenticated class present:', document.body.classList.contains('authenticated'));

	if (!document.body.classList.contains('authenticated')) {
		console.log('🔒 [CALENDAR-HABITS] Пользователь не авторизован');
		return;
	}

	console.log('📡 [CALENDAR-HABITS] Отправляем запрос на получение истории привычек...');

	fetch('/api/habits-completion-history/')
		.then(response => {
			console.log('📡 [CALENDAR-HABITS] Response status:', response.status);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			return response.json();
		})
		.then(data => {
			console.log('📡 [CALENDAR-HABITS] Response data:', data);
			if (data.status === 'success') {
				habitsCompletionData = data.data || {};
				console.log('📊 [CALENDAR-HABITS] История привычек загружена:', habitsCompletionData);
				console.log('📊 [CALENDAR-HABITS] Количество дней с данными:', Object.keys(habitsCompletionData).length);

				// Обновляем календарь с задержкой, чтобы дать время для инициализации
				setTimeout(() => {
					updateCalendarMarks();
				}, 500);
			} else {
				console.error('❌ [CALENDAR-HABITS] Ошибка загрузки истории:', data.message);
			}
		})
		.catch(error => {
			console.error('❌ [CALENDAR-HABITS] Ошибка запроса истории:', error);
		});
}

// Проверяем, выполнены ли все привычки на сегодня
function checkTodayHabitsCompletion() {
	const habitCards = document.querySelectorAll('.habit-card:not(.template)');

	if (habitCards.length === 0) {
		console.log('⚠️ [CALENDAR-HABITS] Привычки не найдены');
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

	console.log(`📊 [CALENDAR-HABITS] Сегодня: ${completedHabits}/${totalHabits} привычек выполнено`);

	// Обновляем данные для сегодняшнего дня
	const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
	habitsCompletionData[today] = {
		all_completed: allCompleted,
		completed_count: completedHabits,
		total_count: totalHabits
	};

	// Обновляем отметки в календаре
	updateCalendarMarks();

	// Отправляем данные на сервер, если все привычки выполнены
	if (allCompleted && totalHabits > 0) {
		saveHabitsCompletionToServer(today, true);
		console.log('🎉 [CALENDAR-HABITS] Все привычки выполнены! Отмечаем в календаре');
	} else if (completedHabits > 0) {
		// Сохраняем частичное выполнение
		saveHabitsCompletionToServer(today, false);
		console.log('⚡ [CALENDAR-HABITS] Частично выполнено привычек');
	}
}// Сохраняем информацию о выполнении привычек на сервер
function saveHabitsCompletionToServer(date, allCompleted) {
	if (!document.body.classList.contains('authenticated')) {
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
			all_completed: allCompleted
		})
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				console.log('✅ [CALENDAR-HABITS] Данные сохранены на сервер');
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
	console.log('🎨 [CALENDAR-HABITS] Обновляем отметки в календаре');
	console.log('🎨 [CALENDAR-HABITS] Данные привычек:', habitsCompletionData);

	const calendarDays = document.querySelectorAll('.day:not(.empty)');
	console.log('🎨 [CALENDAR-HABITS] Найдено дней календаря:', calendarDays.length);

	if (calendarDays.length === 0) {
		console.warn('⚠️ [CALENDAR-HABITS] Дни календаря не найдены!');
		return;
	}

	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();

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
			if (dayData.all_completed && dayData.total_count > 0) {
				// Все привычки выполнены - зеленая отметка
				dayElement.classList.add('habits-completed');
				dayElement.title = `${dayData.completed_count}/${dayData.total_count} привычек выполнено ✅`;
				console.log(`✅ [CALENDAR-HABITS] День ${dayNumber}: все привычки выполнены`);
			} else if (dayData.completed_count > 0) {
				// Частично выполнены - желтая отметка
				dayElement.classList.add('habits-partial');
				dayElement.title = `${dayData.completed_count}/${dayData.total_count} привычек выполнено ⚡`;
				console.log(`⚡ [CALENDAR-HABITS] День ${dayNumber}: частично выполнено`);
			}
		}
	});
}

// Функция для обновления календаря при изменении привычек
function updateTodayInCalendar() {
	console.log('🔄 [CALENDAR-HABITS] Обновление сегодняшнего дня в календаре');
	checkTodayHabitsCompletion();
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