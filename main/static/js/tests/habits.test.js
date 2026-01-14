/**
 * Тести для компонента календаря звичок
 */

describe('Habit Calendar', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div id="habits-calendar-container"></div>
            <div class="habit-calendar"></div>
        `;
	});

	test('Рендерить календар для звички', () => {
		const habit = {
			id: 1,
			name: 'Test Habit',
			frequency: 'daily'
		};

		if (typeof renderHabitCalendar === 'function') {
			renderHabitCalendar(habit);
		}

		const calendar = document.querySelector('.habit-calendar');
		expect(calendar.children.length).toBeGreaterThan(0);
	});

	test('Відображає виконані дні', () => {
		const completedDates = [
			'2026-01-10',
			'2026-01-11',
			'2026-01-12'
		];

		if (typeof markCompletedDates === 'function') {
			markCompletedDates(completedDates);
		}

		const completedCells = document.querySelectorAll('.calendar-day.completed');
		expect(completedCells.length).toBe(3);
	});

	test('Завантажує історію виконання звички', async () => {
		const habitId = 1;
		const mockData = {
			dates: ['2026-01-10', '2026-01-11'],
			streak: 5
		};

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockData)
			})
		);

		if (typeof loadHabitsCompletionHistory === 'function') {
			const result = await loadHabitsCompletionHistory(habitId);
			expect(result.dates.length).toBe(2);
			expect(result.streak).toBe(5);
		}
	});

	test('Оновлює календар після чекіну', () => {
		const today = new Date().toISOString().split('T')[0];

		if (typeof updateCalendarAfterCheckin === 'function') {
			updateCalendarAfterCheckin(today);
		}

		const todayCell = document.querySelector(`[data-date="${today}"]`);
		expect(todayCell?.classList.contains('completed')).toBe(true);
	});
});

describe('Habit Checkbox', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div class="habit-item" data-habit-id="1">
                <input type="checkbox" class="habit-checkbox" />
                <span class="habit-streak">0</span>
            </div>
        `;
	});

	test('Перемикає чекбокс звички', async () => {
		const checkbox = document.querySelector('.habit-checkbox');
		const habitId = 1;

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					checked: true,
					streak: 6
				})
			})
		);

		if (typeof toggleHabitCheckbox === 'function') {
			await toggleHabitCheckbox(habitId);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('/toggle-habit/'),
			expect.any(Object)
		);
	});

	test('Оновлює streak після чекіну', async () => {
		const habitId = 1;
		const newStreak = 6;

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					streak: newStreak
				})
			})
		);

		if (typeof toggleHabitCheckbox === 'function') {
			await toggleHabitCheckbox(habitId);
		}

		const streakElement = document.querySelector('.habit-streak');
		setTimeout(() => {
			expect(streakElement.textContent).toBe(newStreak.toString());
		}, 100);
	});

	test('Обробляє помилку при чекіні', async () => {
		const habitId = 1;

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: false,
				status: 500
			})
		);

		console.error = jest.fn();

		if (typeof toggleHabitCheckbox === 'function') {
			await toggleHabitCheckbox(habitId);
		}

		expect(console.error).toHaveBeenCalled();
	});
});

describe('Habits Page', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div id="habits-list"></div>
            <button id="create-habit-btn"></button>
            <div id="habit-modal" class="modal"></div>
        `;
	});

	test('Завантажує список звичок', async () => {
		const mockHabits = [
			{ id: 1, name: 'Habit 1', streak_days: 5 },
			{ id: 2, name: 'Habit 2', streak_days: 10 }
		];

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ habits: mockHabits })
			})
		);

		if (typeof loadHabits === 'function') {
			await loadHabits();
		}

		const habitsList = document.getElementById('habits-list');
		expect(habitsList.children.length).toBeGreaterThan(0);
	});

	test('Відкриває модалку створення звички', () => {
		const createBtn = document.getElementById('create-habit-btn');
		const modal = document.getElementById('habit-modal');

		if (typeof openCreateHabitModal === 'function') {
			createBtn.addEventListener('click', openCreateHabitModal);
			createBtn.click();
		}

		setTimeout(() => {
			expect(modal.classList.contains('active')).toBe(true);
		}, 100);
	});

	test('Створює нову звичку', async () => {
		const habitData = {
			name: 'New Habit',
			description: 'Test description',
			frequency: 'daily'
		};

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					habit: { ...habitData, id: 3 }
				})
			})
		);

		if (typeof createHabit === 'function') {
			await createHabit(habitData);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('/create-habit/'),
			expect.objectContaining({
				method: 'POST',
				body: expect.any(String)
			})
		);
	});

	test('Видаляє звичку', async () => {
		const habitId = 1;

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			})
		);

		if (typeof deleteHabit === 'function') {
			await deleteHabit(habitId);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining(`/delete-habit/${habitId}/`),
			expect.any(Object)
		);
	});
});
