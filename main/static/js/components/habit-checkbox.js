/**
 * Модуль для работы с чекбоксами привычек на главной странице
 */

/**
 * Ініціалізує обработчики чекбоксов привычек на главной странице
 */
function initHabitCheckboxHandlers() {
	// Проверяем, что мы на главной странице, а не на странице привычек
	if (document.querySelector('.habits-page')) {
		console.log('🚫 Habits page detected, skipping habit-checkbox init');
		return;
	}

	const habitCheckboxes = document.querySelectorAll('.habit-check');
	const habitLabels = document.querySelectorAll('.checkbox-label');

	console.log('🔄 Initializing habit checkbox handlers for main page');
	console.log('📋 Found checkboxes:', habitCheckboxes.length);
	console.log('📋 Found labels:', habitLabels.length);

	// Обработчик для чекбоксов
	habitCheckboxes.forEach((checkbox, index) => {
		checkbox.addEventListener('change', async function () {
			// Проверяем, был ли это клик по лейблу
			if (this.dataset.labelClick === 'true') {
				delete this.dataset.labelClick;
				return; // Игнорируем событие change, так как обработчик уже вызван
			}

			await handleHabitCheckboxChange(this);
		});
	});

	// Обработчик для лейблов (если чекбокс скрыт)
	habitLabels.forEach((label, index) => {

		label.addEventListener('click', async function (e) {
			e.preventDefault(); // Предотвращаем дефолтное поведение лейбла
			console.log('🖱️ Label clicked!', this);

			// Находим связанный чекбокс
			const forId = this.getAttribute('for');
			const checkbox = document.getElementById(forId);

			if (checkbox && !checkbox.disabled) {
				console.log('📋 Found related checkbox:', checkbox);

				// Устанавливаем флаг, что это клик по лейблу
				checkbox.dataset.labelClick = 'true';

				// Переключаем состояние чекбокса
				checkbox.checked = !checkbox.checked;

				// Вызываем обработчик напрямую
				await handleHabitCheckboxChange(checkbox);
			} else {
				console.log('❌ Checkbox not found or disabled for label:', forId);
			}
		});
	});
}

/**
 * Обработчик изменения состояния чекбокса привычки
 */
async function handleHabitCheckboxChange(checkbox) {
	// Проверяем, не выполняется ли уже запрос для этой привычки
	const habitId = checkbox.dataset.habitId;
	if (checkbox.dataset.processing === 'true') {
		console.log('🔄 Request already in progress for habit:', habitId);
		return;
	}

	console.log('🔄 Handling habit checkbox change');
	console.log('🎯 Habit ID:', habitId);
	console.log('☑️ Is checked:', checkbox.checked);

	const isChecked = checkbox.checked;

	// Устанавливаем флаг обработки
	checkbox.dataset.processing = 'true';

	try {
		const response = await fetch('/api/habit-checkin/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': window.getCSRFToken(),
			},
			body: JSON.stringify({
				habit_id: habitId,
				checked: isChecked
			})
		});

		if (response.ok) {
			const data = await response.json();

			// Добавляем анимацию успеха
			const habitCard = checkbox.closest('.habit-card');
			habitCard.style.transition = 'all 0.3s ease';
			habitCard.style.transform = 'scale(1.02)';
			habitCard.style.boxShadow = isChecked ? '0 4px 20px rgba(0, 255, 0, 0.2)' : '0 4px 20px rgba(255, 165, 0, 0.2)';

			// Возвращаем в исходное состояние через 300ms
			setTimeout(() => {
				habitCard.style.transform = 'scale(1)';
				habitCard.style.boxShadow = '';
			}, 300);

			// Обновляем счетчик стрика в карточке с анимацией
			const streakText = habitCard.querySelector('.streak-text');
			if (streakText) {
				streakText.style.transition = 'color 0.3s ease';
				streakText.style.color = isChecked ? '#4CAF50' : '#FF9800';

				// Используем streak_days из ответа API
				const currentStreak = data.streak_days || 0;
				if (currentStreak > 0) {
					streakText.textContent = `🔥 ${currentStreak} day${currentStreak > 1 ? 's' : ''} streak`;
				} else {
					streakText.textContent = 'Start your streak today!';
				}

				// Возвращаем цвет через 1 секунду
				setTimeout(() => {
					streakText.style.color = '';
				}, 1000);
			}

			// Показываем сообщение об успехе
			if (window.showMessage) {
				window.showMessage(
					isChecked ? 'Habit marked as completed!' : 'Habit unchecked',
					isChecked ? 'success' : 'warning'
				);
			}

			// Перевіряємо статус всіх звичок за день для оновлення календаря
			if (typeof window.checkDailyHabitsStatus === 'function') {
				setTimeout(() => {
					window.checkDailyHabitsStatus();
				}, 500);
			}

			// Обновляем прогрессные круги активности
			if (typeof updateProgressCircles === 'function') {
				setTimeout(() => {
					updateProgressCircles();
				}, 100);
			}
		} else {
			// В случае ошибки возвращаем чекбокс в предыдущее состояние
			checkbox.checked = !isChecked;

			// Логируем ошибку для дебага
			console.error('HTTP Error:', response.status, response.statusText);

			// Получаем текст ошибки
			response.text().then(errorText => {
				console.error('Error response:', errorText);
			});

			if (window.showMessage) {
				window.showMessage('Error updating habit. Please try again.', 'error');
			}
		}
	} catch (error) {
		// В случае ошибки возвращаем чекбокс в предыдущее состояние
		checkbox.checked = !isChecked;

		if (window.showMessage) {
			window.showMessage('Network error. Please check your connection.', 'error');
		}
		console.error('Error updating habit:', error);
	} finally {
		// Снимаем флаг обработки
		checkbox.dataset.processing = 'false';
	}
}