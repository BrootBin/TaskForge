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

	// Data for the chart
	const data = {
		labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
		datasets: [{
			label: 'Completed Tasks',
			data: [5, 7, 4, 6, 8, 3, 5],
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
	new Chart(chartElement, config);
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