/**
 * Компонент статичного дашборда
 * TaskForge - Ініціалізація та управління дашбордом статистики
 * 
 * @module components/stats-dashboard
 */

// Публічна функція для ініціалізації дашборда
function initStatsDashboard() {
	console.log('Stats dashboard component initialized');
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
				console.log('📊 Activity data loaded:', data.data);
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
 * Updates the progress circles with animation
 * and percentage text increment effect.
 */
function updateProgressCircles() {
	// Circle overall progress
	const progressCircle = document.querySelector('.circle-progress');
	const circleText = document.querySelector('.circle-text');

	if (progressCircle && circleText) {
		const progressPercent = 72;
		const circleCircumference = 2 * Math.PI * 35; // 2 * PI * r
		progressCircle.style.strokeDasharray = circleCircumference;
		progressCircle.style.strokeDashoffset = circleCircumference * (1 - progressPercent / 100);

		// Animation for the percentage text
		let currentPercent = 0;
		const interval = setInterval(() => {
			if (currentPercent >= progressPercent) {
				clearInterval(interval);
			} else {
				currentPercent++;
				circleText.textContent = currentPercent + '%';
			}
		}, 15);
	}

	// Circle monthly progress
	const monthlyProgress = document.querySelector('.progress-ring__progress');
	const monthlyProgressText = document.querySelector('.monthly-progress-container .progress-text');

	if (monthlyProgress && monthlyProgressText) {
		const monthlyPercent = 65;
		const circumference = 2 * Math.PI * 40;
		monthlyProgress.style.strokeDasharray = circumference;
		monthlyProgress.style.strokeDashoffset = circumference * (1 - monthlyPercent / 100);
	}
}