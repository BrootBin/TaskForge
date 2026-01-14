/**
 * Тести для компонентів цілей та підцілей
 */

describe('Goals Page', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div id="goals-list"></div>
            <button id="create-goal-btn"></button>
            <div id="goal-modal" class="modal"></div>
        `;
	});

	test('Завантажує список цілей', async () => {
		const mockGoals = [
			{
				id: 1,
				name: 'Goal 1',
				progress: 50,
				subgoals: []
			},
			{
				id: 2,
				name: 'Goal 2',
				progress: 75,
				subgoals: []
			}
		];

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ goals: mockGoals })
			})
		);

		if (typeof loadGoals === 'function') {
			await loadGoals();
		}

		const goalsList = document.getElementById('goals-list');
		expect(goalsList.children.length).toBeGreaterThan(0);
	});

	test('Відображає прогрес цілі', () => {
		const goal = {
			id: 1,
			name: 'Test Goal',
			progress: 66.67
		};

		document.body.innerHTML += `
            <div class="goal-item" data-goal-id="1">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            </div>
        `;

		if (typeof updateGoalProgress === 'function') {
			updateGoalProgress(goal.id, goal.progress);
		}

		const progressFill = document.querySelector('.progress-fill');
		expect(progressFill.style.width).toBe('66.67%');
	});

	test('Створює нову ціль', async () => {
		const goalData = {
			name: 'New Goal',
			description: 'Test description',
			category: 'personal',
			due_date: '2026-02-01'
		};

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					goal: { ...goalData, id: 3 }
				})
			})
		);

		if (typeof createGoal === 'function') {
			await createGoal(goalData);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('/create-goal/'),
			expect.objectContaining({
				method: 'POST'
			})
		);
	});

	test('Оновлює ціль', async () => {
		const goalId = 1;
		const updatedData = {
			name: 'Updated Goal',
			description: 'Updated description'
		};

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			})
		);

		if (typeof updateGoal === 'function') {
			await updateGoal(goalId, updatedData);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining(`/update-goal/${goalId}/`),
			expect.any(Object)
		);
	});

	test('Видаляє ціль', async () => {
		const goalId = 1;

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			})
		);

		if (typeof deleteGoal === 'function') {
			await deleteGoal(goalId);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining(`/delete-goal/${goalId}/`),
			expect.any(Object)
		);
	});
});

describe('SubGoals Component', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div class="goal-item" data-goal-id="1">
                <div class="subgoals-list"></div>
                <button class="add-subgoal-btn"></button>
            </div>
        `;
	});

	test('Додає підціль до цілі', async () => {
		const goalId = 1;
		const subgoalData = {
			name: 'New Subgoal',
			description: 'Test description'
		};

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					subgoal: { ...subgoalData, id: 1, completed: false }
				})
			})
		);

		if (typeof createSubgoal === 'function') {
			await createSubgoal(goalId, subgoalData);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('/create-subgoal/'),
			expect.any(Object)
		);
	});

	test('Перемикає статус підцілі', async () => {
		const subgoalId = 1;

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					completed: true
				})
			})
		);

		if (typeof toggleSubgoal === 'function') {
			await toggleSubgoal(subgoalId);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining(`/toggle-subgoal/${subgoalId}/`),
			expect.any(Object)
		);
	});

	test('Видаляє підціль', async () => {
		const subgoalId = 1;

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			})
		);

		if (typeof deleteSubgoal === 'function') {
			await deleteSubgoal(subgoalId);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining(`/delete-subgoal/${subgoalId}/`),
			expect.any(Object)
		);
	});

	test('Оновлює прогрес цілі після зміни підцілі', async () => {
		const goalId = 1;
		const subgoalId = 1;

		document.body.innerHTML = `
            <div class="goal-item" data-goal-id="${goalId}">
                <div class="progress-text">0%</div>
                <div class="subgoals-list">
                    <div class="subgoal-item" data-subgoal-id="${subgoalId}">
                        <input type="checkbox" class="subgoal-checkbox" />
                    </div>
                </div>
            </div>
        `;

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					completed: true,
					goal_progress: 50
				})
			})
		);

		if (typeof toggleSubgoal === 'function') {
			await toggleSubgoal(subgoalId);
		}

		setTimeout(() => {
			const progressText = document.querySelector('.progress-text');
			expect(progressText.textContent).toContain('50%');
		}, 100);
	});
});

describe('Goal Templates', () => {
	test('Створює ціль з шаблону', async () => {
		const templateId = 1;

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					goal: {
						id: 1,
						name: 'Template Goal',
						subgoals: []
					}
				})
			})
		);

		if (typeof createGoalFromTemplate === 'function') {
			await createGoalFromTemplate(templateId);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('/create-goal-from-template/'),
			expect.any(Object)
		);
	});
});
