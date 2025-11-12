// Statistics Page JavaScript - Chart.js Integration

document.addEventListener('DOMContentLoaded', function () {
	console.log('📊 Statistics page loaded');

	// Инициализация прогресс-колец
	initProgressRings();

	// Инициализация графиков
	initHabitsChart();
	initGoalsChart();
	initActivityChart();

	// Добавляем анимации при скролле
	initScrollAnimations();
});

/**
 * Инициализация круговых прогресс-индикаторов
 */
function initProgressRings() {
	const rings = document.querySelectorAll('.progress-ring');

	rings.forEach(ring => {
		const progress = parseFloat(ring.getAttribute('data-progress')) || 0;
		const circle = ring.querySelector('.progress-ring-circle');
		const radius = 26;
		const circumference = 2 * Math.PI * radius;

		// Устанавливаем начальное значение
		circle.style.strokeDasharray = `${circumference} ${circumference}`;
		circle.style.strokeDashoffset = circumference;

		// Анимируем с задержкой
		setTimeout(() => {
			const offset = circumference - (progress / 100) * circumference;
			circle.style.strokeDashoffset = offset;
		}, 300);
	});
}

/**
 * График привычек (последние 30 дней)
 */
function initHabitsChart() {
	const ctx = document.getElementById('habitsChart');
	if (!ctx) {
		console.warn('⚠️ Habits chart canvas not found');
		return;
	}

	const data = window.STATISTICS_DATA?.habits || [];

	if (data.length === 0) {
		ctx.parentElement.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 2rem;">No data available</p>';
		return;
	}

	const labels = data.map(item => item.date);
	const values = data.map(item => item.completed);

	new Chart(ctx, {
		type: 'line',
		data: {
			labels: labels,
			datasets: [{
				label: 'Completed Habits',
				data: values,
				borderColor: '#FFD700',
				backgroundColor: 'rgba(255, 215, 0, 0.1)',
				borderWidth: 3,
				fill: true,
				tension: 0.4,
				pointRadius: 4,
				pointHoverRadius: 6,
				pointBackgroundColor: '#FFD700',
				pointBorderColor: '#fff',
				pointBorderWidth: 2,
				pointHoverBackgroundColor: '#fff',
				pointHoverBorderColor: '#FFD700',
				pointHoverBorderWidth: 2
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: false
				},
				tooltip: {
					backgroundColor: 'rgba(20, 20, 20, 0.95)',
					titleColor: '#FFD700',
					bodyColor: '#fff',
					borderColor: '#FFD700',
					borderWidth: 1,
					padding: 12,
					displayColors: false,
					callbacks: {
						title: function (context) {
							return context[0].label;
						},
						label: function (context) {
							return `${context.parsed.y} habit${context.parsed.y !== 1 ? 's' : ''} completed`;
						}
					}
				}
			},
			scales: {
				x: {
					grid: {
						color: 'rgba(255, 255, 255, 0.05)',
						drawBorder: false
					},
					ticks: {
						color: 'rgba(255, 255, 255, 0.7)',
						maxRotation: 45,
						minRotation: 45
					}
				},
				y: {
					beginAtZero: true,
					grid: {
						color: 'rgba(255, 255, 255, 0.05)',
						drawBorder: false
					},
					ticks: {
						color: 'rgba(255, 255, 255, 0.7)',
						stepSize: 1
					}
				}
			},
			interaction: {
				intersect: false,
				mode: 'index'
			}
		}
	});
}

/**
 * График целей (горизонтальный bar chart)
 */
function initGoalsChart() {
	const ctx = document.getElementById('goalsChart');
	if (!ctx) {
		console.warn('⚠️ Goals chart canvas not found');
		return;
	}

	const data = window.STATISTICS_DATA?.goals || [];

	if (data.length === 0) {
		ctx.parentElement.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 2rem;">No active goals</p>';
		return;
	}

	const labels = data.map(item => item.name);
	const values = data.map(item => item.progress);
	const goalIds = data.map(item => item.id);

	const goalsChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: labels,
			datasets: [{
				label: 'Progress %',
				data: values,
				backgroundColor: 'rgba(76, 175, 80, 0.8)',
				borderColor: '#4CAF50',
				borderWidth: 2,
				borderRadius: 8,
				hoverBackgroundColor: '#4CAF50',
				hoverBorderColor: '#fff',
				barThickness: 25,
				maxBarThickness: 30
			}]
		},
		options: {
			indexAxis: 'y',
			responsive: true,
			maintainAspectRatio: false,
			layout: {
				padding: {
					right: 50
				}
			},
			plugins: {
				legend: {
					display: false
				},
				tooltip: {
					backgroundColor: 'rgba(20, 20, 20, 0.95)',
					titleColor: '#4CAF50',
					bodyColor: '#fff',
					borderColor: '#4CAF50',
					borderWidth: 1,
					padding: 12,
					displayColors: false,
					callbacks: {
						label: function (context) {
							return `${context.parsed.x}% completed`;
						},
						afterLabel: function () {
							return 'Click to view goal';
						}
					}
				},
				datalabels: {
					anchor: 'end',
					align: 'end',
					color: '#fff',
					font: {
						weight: 'bold',
						size: 12
					},
					formatter: function (value) {
						return value + '%';
					}
				}
			},
			scales: {
				x: {
					beginAtZero: true,
					max: 100,
					grid: {
						color: 'rgba(255, 255, 255, 0.05)',
						drawBorder: false
					},
					ticks: {
						color: 'rgba(255, 255, 255, 0.7)',
						callback: function (value) {
							return value + '%';
						}
					}
				},
				y: {
					grid: {
						display: false,
						drawBorder: false
					},
					ticks: {
						color: 'rgba(255, 255, 255, 0.7)',
						crossAlign: 'far'
					}
				}
			},
			onClick: (event, activeElements) => {
				if (activeElements.length > 0) {
					const index = activeElements[0].index;
					const goalId = goalIds[index];
					// Переход на страницу целей с якорем к конкретной цели
					window.location.href = `/goals/#goal-${goalId}`;
				}
			},
			onHover: (event, activeElements) => {
				event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
			}
		}
	});
}

/**
 * График активности (area chart)
 */
function initActivityChart() {
	const ctx = document.getElementById('activityChart');
	if (!ctx) {
		console.warn('⚠️ Activity chart canvas not found');
		return;
	}

	const data = window.STATISTICS_DATA?.activity || [];

	if (data.length === 0) {
		ctx.parentElement.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 2rem;">No activity data</p>';
		return;
	}

	const labels = data.map(item => item.day);
	const values = data.map(item => item.count);

	new Chart(ctx, {
		type: 'line',
		data: {
			labels: labels,
			datasets: [{
				label: 'Activity Points',
				data: values,
				borderColor: '#2196F3',
				backgroundColor: 'rgba(33, 150, 243, 0.2)',
				borderWidth: 3,
				fill: true,
				tension: 0.4,
				pointRadius: 5,
				pointHoverRadius: 7,
				pointBackgroundColor: '#2196F3',
				pointBorderColor: '#fff',
				pointBorderWidth: 2,
				pointHoverBackgroundColor: '#fff',
				pointHoverBorderColor: '#2196F3',
				pointHoverBorderWidth: 2
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					display: false
				},
				tooltip: {
					backgroundColor: 'rgba(20, 20, 20, 0.95)',
					titleColor: '#2196F3',
					bodyColor: '#fff',
					borderColor: '#2196F3',
					borderWidth: 1,
					padding: 12,
					displayColors: false,
					callbacks: {
						label: function (context) {
							return `${context.parsed.y} activity point${context.parsed.y !== 1 ? 's' : ''}`;
						}
					}
				},
				filler: {
					propagate: true
				}
			},
			scales: {
				x: {
					grid: {
						color: 'rgba(255, 255, 255, 0.05)',
						drawBorder: false
					},
					ticks: {
						color: 'rgba(255, 255, 255, 0.7)'
					}
				},
				y: {
					beginAtZero: true,
					grid: {
						color: 'rgba(255, 255, 255, 0.05)',
						drawBorder: false
					},
					ticks: {
						color: 'rgba(255, 255, 255, 0.7)',
						stepSize: 1
					}
				}
			},
			interaction: {
				intersect: false,
				mode: 'index'
			}
		}
	});
}

/**
 * Инициализация анимаций при скролле
 */
function initScrollAnimations() {
	const observerOptions = {
		threshold: 0.1,
		rootMargin: '0px 0px -50px 0px'
	};

	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.style.opacity = '1';
				entry.target.style.transform = 'translateY(0)';
			}
		});
	}, observerOptions);

	// Наблюдаем за всеми элементами с анимациями
	const animatedElements = document.querySelectorAll('.animate-slide-up, .animate-slide-up-delay-1, .animate-slide-up-delay-2, .animate-slide-up-delay-3');
	animatedElements.forEach(el => {
		el.style.opacity = '0';
		el.style.transform = 'translateY(30px)';
		observer.observe(el);
	});
}

// Экспорт функций для возможности повторной инициализации
window.statisticsCharts = {
	initHabitsChart,
	initGoalsChart,
	initActivityChart,
	initProgressRings
};

console.log('✅ Statistics page scripts initialized');
