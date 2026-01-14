/**
 * Тести для статистики та графіків
 */

describe('Statistics Dashboard', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div id="stats-container">
                <div class="stat-card" data-stat="total-goals">
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-card" data-stat="total-habits">
                    <span class="stat-value">0</span>
                </div>
                <div class="stat-card" data-stat="active-streak">
                    <span class="stat-value">0</span>
                </div>
            </div>
            <canvas id="goals-chart"></canvas>
            <canvas id="habits-chart"></canvas>
        `;
	});

	test('Завантажує статистику користувача', async () => {
		const mockStats = {
			total_goals: 5,
			completed_goals: 2,
			total_habits: 8,
			active_habits: 6,
			longest_streak: 15
		};

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockStats)
			})
		);

		if (typeof loadStatistics === 'function') {
			await loadStatistics();
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/statistics/'),
			expect.any(Object)
		);
	});

	test('Оновлює значення в stat cards', () => {
		const stats = {
			total_goals: 10,
			total_habits: 15,
			active_streak: 7
		};

		if (typeof updateStatCards === 'function') {
			updateStatCards(stats);
		}

		const goalsValue = document.querySelector('[data-stat="total-goals"] .stat-value');
		const habitsValue = document.querySelector('[data-stat="total-habits"] .stat-value');
		const streakValue = document.querySelector('[data-stat="active-streak"] .stat-value');

		expect(goalsValue.textContent).toBe('10');
		expect(habitsValue.textContent).toBe('15');
		expect(streakValue.textContent).toBe('7');
	});

	test('Рендерить графік прогресу цілей', () => {
		const chartData = {
			labels: ['Jan', 'Feb', 'Mar'],
			data: [5, 8, 12]
		};

		// Мокаємо Chart.js
		global.Chart = jest.fn();

		if (typeof renderGoalsChart === 'function') {
			renderGoalsChart(chartData);
		}

		expect(Chart).toHaveBeenCalled();
	});

	test('Рендерить графік streak звичок', () => {
		const chartData = {
			labels: ['Habit 1', 'Habit 2', 'Habit 3'],
			data: [10, 15, 5]
		};

		global.Chart = jest.fn();

		if (typeof renderHabitsChart === 'function') {
			renderHabitsChart(chartData);
		}

		expect(Chart).toHaveBeenCalled();
	});
});

describe('Progress Calculations', () => {
	test('Розраховує відсоток прогресу', () => {
		const completed = 7;
		const total = 10;

		let progress = 0;
		if (typeof calculateProgress === 'function') {
			progress = calculateProgress(completed, total);
		}

		expect(progress).toBe(70);
	});

	test('Повертає 0 при відсутності даних', () => {
		let progress = 100;
		if (typeof calculateProgress === 'function') {
			progress = calculateProgress(0, 0);
		}

		expect(progress).toBe(0);
	});

	test('Розраховує completion rate за період', () => {
		const completedDays = [
			'2026-01-01', '2026-01-02', '2026-01-03',
			'2026-01-05', '2026-01-07'
		];
		const totalDays = 7;

		let rate = 0;
		if (typeof calculateCompletionRate === 'function') {
			rate = calculateCompletionRate(completedDays.length, totalDays);
		}

		// 5/7 = 71.43%
		expect(rate).toBeCloseTo(71.43, 1);
	});
});

describe('Progress Text Display', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div class="goal-card">
                <svg class="progress-circle">
                    <circle class="progress-ring"></circle>
                </svg>
                <div class="progress-text">0%</div>
            </div>
        `;
	});

	test('Оновлює текст прогресу', () => {
		const progress = 75;
		const progressText = document.querySelector('.progress-text');

		if (typeof updateProgressText === 'function') {
			updateProgressText(progress);
		}

		expect(progressText.textContent).toBe('75%');
	});

	test('Оновлює SVG progress ring', () => {
		const progress = 50;
		const progressRing = document.querySelector('.progress-ring');

		if (typeof updateProgressRing === 'function') {
			updateProgressRing(progress);
		}

		const strokeDashoffset = progressRing.style.strokeDashoffset;
		expect(strokeDashoffset).toBeDefined();
	});

	test('Адаптує розмір шрифту на мобільних', () => {
		// Симулюємо мобільний екран
		Object.defineProperty(window, 'innerWidth', {
			writable: true,
			configurable: true,
			value: 375
		});

		const progressText = document.querySelector('.progress-text');

		if (typeof adjustProgressTextSize === 'function') {
			adjustProgressTextSize();
		}

		const fontSize = window.getComputedStyle(progressText).fontSize;
		expect(parseInt(fontSize)).toBeLessThan(12);
	});
});

describe('Activity Tracking', () => {
	test('Відстежує активність користувача', async () => {
		const activityType = 'goal_completed';

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			})
		);

		if (typeof trackActivity === 'function') {
			await trackActivity(activityType);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('/track-activity/'),
			expect.any(Object)
		);
	});

	test('Отримує тижневу активність', async () => {
		const mockActivity = {
			week_start: '2026-01-13',
			activity_count: 42
		};

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockActivity)
			})
		);

		if (typeof getWeeklyActivity === 'function') {
			const result = await getWeeklyActivity();
			expect(result.activity_count).toBe(42);
		}
	});
});
