/**
 * Компонент статичного дашборда
 * TaskForge - Ініціалізація та управління дашбордом статистики
 * 
 * @module components/stats-dashboard
 */

// Флаг для отслеживания готовности данных календаря
let calendarDataReady = false;

// Дебаунсинг для предотвращения частых обновлений
let updateProgressTimeout = null;
let isUpdating = false;

// Хранилище для предыдущих значений (предотвращение мерцания)
let lastDailyPercent = null;
let lastMonthlyPercent = null;

// Функция для быстрой проверки готовности данных
function isHabitsDataReady() {
	return calendarDataReady &&
		typeof habitsCompletionData !== 'undefined' &&
		Object.keys(habitsCompletionData).length > 0;
}

// Функция для установки готовности данных календаря
function setCalendarDataReady() {
	calendarDataReady = true;
}

// Публічна функція для ініціалізації дашборда
function initStatsDashboard() {
	// Ініціалізуємо графік прогресу
	initProgressChart();

	// Оновлюємо прогрес-круги
	updateProgressCircles();
}

/**
 * Ініціалізує графік прогресу з використанням Chart.js
 */
function initProgressChart() {
	const chartElement = document.getElementById('progressChart');

	// Check if the chart element exists
	if (!chartElement) return;

	// Загружаємо дані активності користувача
	loadActivityData();
}

/**
 * Загружає дані активності користувача з сервера
 */
function loadActivityData() {
	// Перевіряємо, чи авторизований користувач
	if (!document.body.classList.contains('authenticated')) {
		// Показуємо приклад даних для неавторизованих користувачів
		renderChart(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [2, 4, 1, 3, 5, 2, 4]);
		return;
	}

	fetch('/api/activity-chart/')
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				renderChart(data.data.labels, data.data.weekly_data);
			} else {
				console.error('Error loading activity data:', data.message);
				// Fallback к прикладним даним
				renderChart(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [0, 0, 0, 0, 0, 0, 0]);
			}
		})
		.catch(error => {
			console.error('Error fetching activity data:', error);
			// Fallback к прикладним даним
			renderChart(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [0, 0, 0, 0, 0, 0, 0]);
		});
}

/**
 * Малює графік з наданими мітками та даними
 */
function renderChart(labels, weeklyData) {
	const chartElement = document.getElementById('progressChart');
	if (!chartElement) return;

	// Data for the chart
	const data = {
		labels: labels,
		datasets: [{
			label: 'Activity Points',
			data: weeklyData,
			backgroundColor: 'rgba(212, 175, 55, 0.2)',
			borderColor: '#d4af37',
			borderWidth: 2,
			tension: 0.4,
			fill: true,
			pointBackgroundColor: '#d4af37',
		}]
	};

	// Setup configuration for the chart
	const config = {
		type: 'line',
		data: data,
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				y: {
					beginAtZero: true,
					grid: {
						color: 'rgba(255, 255, 255, 0.1)'
					},
					ticks: {
						color: '#bcbcbc',
						font: {
							size: 10
						}
					}
				},
				x: {
					grid: {
						color: 'rgba(255, 255, 255, 0.1)'
					},
					ticks: {
						color: '#bcbcbc',
						font: {
							size: 10
						}
					}
				}
			},
			plugins: {
				legend: {
					display: false
				},
				tooltip: {
					backgroundColor: '#1a1a1a',
					borderColor: '#d4af37',
					borderWidth: 1,
					titleColor: '#d4af37',
					bodyColor: '#ffffff',
					usePointStyle: true
				}
			}
		}
	};

	// Create and render the chart
	window.activityChart = new Chart(chartElement.getContext('2d'), config);
}

/**
 * Обновляет данные чарта активности
 */
function updateActivityChart() {
	if (!window.activityChart || !document.body.classList.contains('authenticated')) {
		return;
	}

	fetch('/api/activity-chart/')
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				console.log('📊 Updating activity chart with new data');
				window.activityChart.data.datasets[0].data = data.data.weekly_data;
				window.activityChart.update();
			}
		})
		.catch(error => {
			console.error('Error updating activity chart:', error);
		});
}

/**
 * Основная функция обновления прогресс-кругов
 * Оптимизировано для быстрого отклика
 */
function updateProgressCircles() {
	// Если данные готовы, обновляем немедленно
	if (isHabitsDataReady()) {
		performProgressUpdate();
		return;
	}

	// Если идет обновление, не дублируем
	if (isUpdating) return;

	// Убираем debouring для ускорения первичной загрузки
	if (updateProgressTimeout) {
		clearTimeout(updateProgressTimeout);
	}

	// Уменьшаем задержку до минимума
	updateProgressTimeout = setTimeout(() => {
		performProgressUpdate();
		updateProgressTimeout = null;
	}, 50); // Сокращено с 300ms до 50ms
}

/**
 * Выполняет фактическое обновление прогресс-кругов
 */
function performProgressUpdate() {
	if (isUpdating) return;

	isUpdating = true;

	try {
		// Обновляем дневной прогресс
		updateDailyProgressCircle();

		// Обновляем месячный прогресс
		updateMonthlyProgressCircle();
	} catch (error) {
		console.error('❌ [STATS-DASHBOARD] Ошибка при обновлении прогресс-кругов:', error);
	} finally {
		// Освобождаем флаг немедленно для ускорения
		isUpdating = false;
	}
}

/**
 * Обновляет ежедневный прогресс-круг (около календаря)
 */
function updateDailyProgressCircle() {
	const progressCircle = document.querySelector('.circle-progress');
	const circleText = document.querySelector('.circle-text');

	if (!progressCircle || !circleText) {
		console.warn('⚠️ Daily progress circle elements not found');
		return;
	}

	// Проверяем, авторизован ли пользователь
	if (!document.body.classList.contains('authenticated')) {
		// Для неавторизованных пользователей показываем демо-данные
		if (lastDailyPercent === null || lastDailyPercent !== 72) {
			animateProgressCircle(progressCircle, circleText, 72, 35);
			lastDailyPercent = 72;
		}
		return;
	}

	// Добавляем индикатор загрузки
	progressCircle.style.opacity = '0.6';
	progressCircle.style.transition = 'opacity 0.3s ease';

	// Получаем данные о ежедневных привычках
	fetch('/api/daily-habits-status/')
		.then(response => response.json())
		.then(data => {
			// Убираем индикатор загрузки
			progressCircle.style.opacity = '1';
			if (data.status === 'success') {
				const dailyPercent = Math.round(data.completion_percentage || 0);

				// Анимируем только если значение изменилось или это первый раз
				if (lastDailyPercent === null || lastDailyPercent !== dailyPercent) {
					animateProgressCircle(progressCircle, circleText, dailyPercent, 35);
					lastDailyPercent = dailyPercent;
				}
			} else {
				console.warn('⚠️ Error getting daily habits data:', data.message);
				// Убираем индикатор загрузки
				progressCircle.style.opacity = '1';
				// Fallback к демо-данным только если значение не установлено
				if (lastDailyPercent === null || lastDailyPercent !== 0) {
					animateProgressCircle(progressCircle, circleText, 0, 35);
					lastDailyPercent = 0;
				}
			}
		})
		.catch(error => {
			console.error('❌ Error fetching daily habits data:', error);
			// Убираем индикатор загрузки
			progressCircle.style.opacity = '1';
			// Fallback к демо-данным только если значение не установлено
			if (lastDailyPercent === null || lastDailyPercent !== 0) {
				animateProgressCircle(progressCircle, circleText, 0, 35);
				lastDailyPercent = 0;
			}
		});
}

/**
 * Обновляет месячный прогресс-круг
 */
function updateMonthlyProgressCircle() {
	const monthlyProgress = document.querySelector('.progress-ring__progress');
	const monthlyProgressText = document.querySelector('.monthly-progress-container .progress-text');

	if (!monthlyProgress) {
		console.warn('⚠️ Monthly progress circle elements not found');
		return;
	}

	// Проверяем, авторизован ли пользователь
	if (!document.body.classList.contains('authenticated')) {
		// Для неавторизованных пользователей показываем демо-данные
		if (lastMonthlyPercent === null || lastMonthlyPercent !== 65) {
			animateMonthlyProgress(monthlyProgress, 65, 40);
			lastMonthlyPercent = 65;
		}
		return;
	}

	// Быстрая проверка готовности данных
	if (isHabitsDataReady()) {
		const monthlyPercent = calculateMonthlyCompletionPercent(habitsCompletionData);

		// Анимируем только если значение изменилось или это первый раз
		if (lastMonthlyPercent === null || lastMonthlyPercent !== monthlyPercent) {
			animateMonthlyProgress(monthlyProgress, monthlyPercent, 40);
			lastMonthlyPercent = monthlyPercent;
		}
		return; // Выходим рано, если данные готовы
	}

	// Если данные не готовы, показываем индикатор загрузки
	monthlyProgress.style.opacity = '0.6';
	monthlyProgress.style.transition = 'opacity 0.3s ease';

	// Проверяем, есть ли у нас система кэширования календаря
	if (typeof loadHabitsCompletionHistory === 'function') {
		// Используем кэшированную систему календаря
		loadHabitsCompletionHistory()
			.then(() => {
				monthlyProgress.style.opacity = '1';
				// После загрузки данных календарем, пересчитываем прогресс
				if (isHabitsDataReady()) {
					const monthlyPercent = calculateMonthlyCompletionPercent(habitsCompletionData);
					if (lastMonthlyPercent !== monthlyPercent) {
						animateMonthlyProgress(monthlyProgress, monthlyPercent, 40);
						lastMonthlyPercent = monthlyPercent;
					}
				}
			})
			.catch(() => {
				// В случае ошибки убираем индикатор загрузки
				monthlyProgress.style.opacity = '1';
			});
	} else {
		// Fallback: прямой API запрос только если нет системы кэширования
		fetch('/api/habits-completion-history/')
			.then(response => response.json())
			.then(data => {
				// Убираем индикатор загрузки
				monthlyProgress.style.opacity = '1';
				if (data.status === 'success') {
					const monthlyPercent = calculateMonthlyCompletionPercent(data.data);

					// Анимируем только если значение изменилось
					if (lastMonthlyPercent !== monthlyPercent) {
						animateMonthlyProgress(monthlyProgress, monthlyPercent, 40);
						lastMonthlyPercent = monthlyPercent;
					}
				} else {
					console.warn('⚠️ Error getting monthly habits data:', data.message);
					// Убираем индикатор загрузки
					monthlyProgress.style.opacity = '1';
					// Fallback к демо-данным только если значение не установлено
					if (lastMonthlyPercent === null || lastMonthlyPercent !== 0) {
						animateMonthlyProgress(monthlyProgress, 0, 40);
						lastMonthlyPercent = 0;
					}
				}
			})
			.catch(error => {
				console.error('❌ Error fetching monthly habits data:', error);
				// Убираем индикатор загрузки
				monthlyProgress.style.opacity = '1';
				// Fallback к демо-данным только если значение не установлено
				if (lastMonthlyPercent === null || lastMonthlyPercent !== 0) {
					animateMonthlyProgress(monthlyProgress, 0, 40);
					lastMonthlyPercent = 0;
				}
			});
	}
}

/**
 * Анимирует ежедневный прогресс-круг
 */
function animateProgressCircle(progressCircle, circleText, targetPercent, radius) {
	if (!progressCircle || !circleText) return;

	const circleCircumference = 2 * Math.PI * radius;
	progressCircle.style.strokeDasharray = circleCircumference;

	// Получаем текущий процент из текста (если есть)
	const currentTextContent = circleText.textContent;
	const currentPercent = currentTextContent ? parseInt(currentTextContent.replace('%', '')) || 0 : 0;

	// Если значение не изменилось, не анимируем
	if (currentPercent === targetPercent) {
		return;
	}

	// Плавная анимация круга
	progressCircle.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
	progressCircle.style.strokeDashoffset = circleCircumference * (1 - targetPercent / 100);

	// Плавная анимация текста
	const diff = targetPercent - currentPercent;
	const steps = Math.abs(diff);
	const stepSize = diff / steps;
	const stepDuration = Math.max(10, 600 / steps); // Максимум 600ms на анимацию

	let step = 0;
	const interval = setInterval(() => {
		step++;
		const newPercent = Math.round(currentPercent + (stepSize * step));

		if (step >= steps) {
			circleText.textContent = targetPercent + '%';
			clearInterval(interval);
		} else {
			circleText.textContent = newPercent + '%';
		}
	}, stepDuration);
}

/**
 * Анимирует месячный прогресс-круг
 */
function animateMonthlyProgress(monthlyProgress, targetPercent, radius) {
	if (!monthlyProgress) return;

	const circumference = 2 * Math.PI * radius;
	monthlyProgress.style.strokeDasharray = circumference;

	// Плавная анимация
	monthlyProgress.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
	monthlyProgress.style.strokeDashoffset = circumference * (1 - targetPercent / 100);
}/**
 * Вычисляет процент завершения привычек за текущий месяц
 * Учитывает исторический контекст: для прошлых дней использует зафиксированные данные
 */
function calculateMonthlyCompletionPercent(habitsData) {
	if (!habitsData || typeof habitsData !== 'object') {
		return 0;
	}

	// Проверяем, готовы ли данные календаря
	if (!calendarDataReady) {
		return 0;
	}

	const now = new Date();
	const currentMonth = now.getMonth();
	const currentYear = now.getFullYear();
	const todayString = now.toISOString().split('T')[0]; // YYYY-MM-DD

	let totalDays = 0;
	let completedDays = 0;

	// Проходим по всем датам в данных
	Object.keys(habitsData).forEach(dateStr => {
		const date = new Date(dateStr);

		// Проверяем, что дата относится к текущему месяцу
		if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
			totalDays++;

			const dayData = habitsData[dateStr];
			if (dayData) {
				let dayCompleted = false;

				if (dateStr === todayString) {
					// Для сегодняшнего дня используем актуальное состояние
					dayCompleted = dayData.all_completed && dayData.total_count > 0;
				} else {
					// Для исторических дней используем зафиксированные данные
					if (dayData.day_was_complete !== undefined) {
						dayCompleted = dayData.day_was_complete;
					} else {
						// Fallback для старых данных без day_was_complete
						dayCompleted = dayData.all_completed && dayData.total_count > 0;
					}
				}

				if (dayCompleted) {
					completedDays++;
				}
			}
		}
	});

	// Возвращаем процент
	const monthlyPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

	return monthlyPercent;
}