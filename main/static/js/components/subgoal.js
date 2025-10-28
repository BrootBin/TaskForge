/**
 * Обробник для перемикання статусу підцілі
 */

// Функція для анімації та відправки запиту на зміну статусу підцілі
function initSubgoalHandlers() {
	console.log('Ініціалізація обробників підцілей...');
	const subgoalCheckboxes = document.querySelectorAll('.subgoal-checkbox');
	console.log('Знайдено підцілей:', subgoalCheckboxes.length);

	// Перевіряємо, чи не були обробники вже додані
	if (subgoalCheckboxes.length > 0 && subgoalCheckboxes[0].hasAttribute('data-handler-attached')) {
		console.log('Обробники вже додані, виходимо');
		return; // Обробники вже додані, виходимо
	}

	// Ініціалізуємо правильний стан для вже завершених підцілей
	console.log('=== ІНІЦІАЛІЗАЦІЯ СТАНУ ПІДЦІЛЕЙ ===');
	subgoalCheckboxes.forEach(checkbox => {
		const completedValue = checkbox.dataset.completed ? checkbox.dataset.completed.trim() : 'false';
		const isCompleted = completedValue === 'true';
		const subgoalElement = checkbox.parentElement;
		const nameElement = subgoalElement.querySelector('.subgoal-name');
		const iconElement = checkbox.querySelector('i');

		console.log(`Підціль ${checkbox.dataset.subgoalId}: completed="${completedValue}", isCompleted=${isCompleted}`);

		if (isCompleted) {
			iconElement.className = 'fa-solid fa-square-check';
			nameElement.classList.add('completed');
			console.log(`✅ Підціль ${checkbox.dataset.subgoalId} позначена як завершена`);
		} else {
			iconElement.className = 'fa-regular fa-square';
			nameElement.classList.remove('completed');
			console.log(`⬜ Підціль ${checkbox.dataset.subgoalId} позначена як незавершена`);
		}
	});
	console.log('=== КІНЕЦЬ ІНІЦІАЛІЗАЦІЇ ===');

	// Ініціалізуємо прогрес для всіх цілей при завантаженні сторінки
	console.log('=== ІНІЦІАЛІЗАЦІЯ ПРОГРЕСУ ЦІЛЕЙ ===');
	const goalCards = document.querySelectorAll('.goal-card');
	goalCards.forEach(goalCard => {
		updateGoalProgressLocal(goalCard);
	});
	console.log('=== КІНЕЦЬ ІНІЦІАЛІЗАЦІЇ ПРОГРЕСУ ===');

	// Ініціалізуємо обробники для кнопок "Показати всі"
	initShowAllSubgoalsHandlers();

	// Ініціалізуємо обробники для карток цілей (запобігання згортанню при кліку всередині)
	initGoalCardHandlers();

	subgoalCheckboxes.forEach(checkbox => {
		addSubgoalClickHandler(checkbox);
	});
}

// Загальна функція для додавання обробника кліку на підціль
function addSubgoalClickHandler(checkbox) {
	// Якщо обробник вже додано, пропускаємо
	if (checkbox.hasAttribute('data-handler-attached')) {
		return;
	}

	// Позначаємо, що обробник додано
	checkbox.setAttribute('data-handler-attached', 'true');
	console.log('Додаємо обробник для підцілі:', checkbox.dataset.subgoalId);

	// Ініціалізуємо стан
	const completedValue = checkbox.dataset.completed ? checkbox.dataset.completed.trim() : 'false';
	const isCompleted = completedValue === 'true';
	const subgoalElement = checkbox.parentElement;
	const nameElement = subgoalElement.querySelector('.subgoal-name');
	const iconElement = checkbox.querySelector('i');

	console.log(`Ініціалізація підцілі ${checkbox.dataset.subgoalId}: completed="${completedValue}", isCompleted=${isCompleted}`);

	if (isCompleted) {
		iconElement.className = 'fa-solid fa-square-check';
		nameElement.classList.add('completed');
	} else {
		iconElement.className = 'fa-regular fa-square';
		nameElement.classList.remove('completed');
	}

	// Додаємо обробник кліку
	checkbox.addEventListener('click', async function (event) {
		console.log('Клік по підцілі:', this.dataset.subgoalId);

		// Запобігаємо множинним клікам
		if (this.hasAttribute('data-processing')) {
			console.log('Запит вже обробляється, ігноруємо клік');
			return;
		}
		this.setAttribute('data-processing', 'true');
		console.log('Починаємо обробку кліку');

		const subgoalId = this.dataset.subgoalId;
		const currentCompleted = (this.dataset.completed ? this.dataset.completed.trim() : 'false') === 'true';
		const subgoalElement = this.parentElement;
		const nameElement = subgoalElement.querySelector('.subgoal-name');
		const iconElement = this.querySelector('i');

		// Оптимістичний UI - одразу змінюємо зовнішній вигляд
		if (currentCompleted) {
			// Змінюємо на невиконану
			iconElement.className = 'fa-regular fa-square';
			nameElement.classList.remove('completed');
			this.dataset.completed = 'false';
			this.classList.add('just-unchecked');
			// Видаляємо клас анімації через деякий час
			setTimeout(() => {
				this.classList.remove('just-unchecked');
			}, 200);
		} else {
			// Змінюємо на виконану
			iconElement.className = 'fa-solid fa-square-check';
			nameElement.classList.add('completed');
			this.dataset.completed = 'true';
			this.classList.add('just-checked');
			// Видаляємо клас анімації через деякий час
			setTimeout(() => {
				this.classList.remove('just-checked');
			}, 300);
		}

		// Відправляємо запит на сервер
		try {
			const response = await fetch('/api/toggle-subgoal/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCSRFToken(),
				},
				body: JSON.stringify({ subgoal_id: subgoalId })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'An error occurred while updating subgoal');
			}

			// Оновлюємо dataset з актуальним станом
			this.dataset.completed = data.completed.toString();

			// Оновлюємо прогрес цілі
			updateGoalProgress(subgoalElement);

			// Плануємо переупорядкування підцілей через 15 секунд
			const goalCard = subgoalElement.closest('.goal-card');
			if (goalCard) {
				scheduleSubgoalReordering(goalCard);
			}

			// Якщо ціль була повністю завершена, можна оновити її відображення
			if (data.goal_completed !== undefined) {
				// Знайдемо блок цілі та оновимо його статус
				const goalCard = subgoalElement.closest('.goal-card');
				if (goalCard) {
					const goalStatus = goalCard.querySelector('.goal-status');
					if (goalStatus) {
						if (data.goal_completed) {
							goalStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> Completed';
							goalStatus.classList.add('completed');
							goalCard.classList.add('completed');
							goalCard.classList.add('just-completed');

							// Видаляємо клас анімації через деякий час
							setTimeout(() => {
								goalCard.classList.remove('just-completed');
							}, 1000);

							// Показуємо спеціальне сповіщення про завершення цілі
							showNotification('Congratulations! Goal completed! 🎉', 'success');
						} else {
							goalStatus.innerHTML = '<i class="fa-regular fa-circle"></i> In progress';
							goalStatus.classList.remove('completed');
							goalCard.classList.remove('completed');
						}
					}
				}
			} else {
				// Звичайне сповіщення про оновлення підцілі (показуємо тільки якщо ціль не завершена)
				showNotification('Статус підцілі оновлено', 'success');
			}

			// Обновляем чарт активности если функция доступна
			if (typeof updateActivityChart === 'function') {
				updateActivityChart();
			}
		} catch (error) {
			console.error('Помилка при оновленні підцілі:', error);

			// Повертаємо UI у вихідний стан у випадку помилки
			if (currentCompleted) {
				iconElement.className = 'fa-solid fa-square-check';
				nameElement.classList.add('completed');
				this.dataset.completed = 'true';
			} else {
				iconElement.className = 'fa-regular fa-square';
				nameElement.classList.remove('completed');
				this.dataset.completed = 'false';
			}

			// Показуємо сповіщення про помилку
			showNotification('Помилка при оновленні підцілі: ' + error.message, 'error');
		} finally {
			// Прибираємо прапор обробки
			this.removeAttribute('data-processing');
		}
	});
}

// Функція для отримання CSRF-токену з cookie
function getCSRFToken() {
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

// Функція для відображення сповіщень
function showNotification(message, type = 'info') {
	console.log('Намагаємося показати сповіщення:', message, type);

	// Используем ТОЛЬКО глобальный компонент уведомлений
	if (window.notifications && typeof window.notifications.show === 'function') {
		console.log('Використовуємо window.notifications.show');
		window.notifications.show(message, type, 3000);
	} else {
		console.log('window.notifications недоступний, створюємо сповіщення напряму');
		// Створюємо сповіщення напрямую, если компонент не загрузился
		createDirectNotification(message, type);
	}
}

// Функція для створення сповіщення напряму
function createDirectNotification(message, type) {
	// Створюємо або знаходимо контейнер
	let container = document.getElementById('notification-container');
	if (!container) {
		container = document.createElement('div');
		container.id = 'notification-container';
		container.style.position = 'fixed';
		container.style.top = '20px';
		container.style.right = '20px';
		container.style.zIndex = '9999';
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.gap = '10px';
		container.style.maxWidth = '350px';
		document.body.appendChild(container);
	}

	// Створюємо сповіщення
	const notification = document.createElement('div');
	notification.className = `notification notification-${type}`;

	// Визначаємо іконку
	let icon;
	switch (type) {
		case 'success':
			icon = '<i class="fa-solid fa-circle-check"></i>';
			break;
		case 'error':
			icon = '<i class="fa-solid fa-circle-xmark"></i>';
			break;
		default:
			icon = '<i class="fa-solid fa-circle-info"></i>';
			break;
	}

	notification.innerHTML = `
		<div class="notification-icon">${icon}</div>
		<div class="notification-content">${message}</div>
		<button class="notification-close"><i class="fa-solid fa-xmark"></i></button>
	`;

	// Додаємо до контейнера
	container.appendChild(notification);

	// Анімація появи
	setTimeout(() => {
		notification.classList.add('show');
	}, 10);

	// Кнопка закриття
	const closeButton = notification.querySelector('.notification-close');
	closeButton.addEventListener('click', () => {
		notification.classList.add('hide');
		setTimeout(() => {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		}, 300);
	});

	// Автоматичне закриття через 3 секунди
	setTimeout(() => {
		if (notification.parentNode) {
			notification.classList.add('hide');
			setTimeout(() => {
				if (notification.parentNode) {
					notification.parentNode.removeChild(notification);
				}
			}, 300);
		}
	}, 3000);
}

// Функція для оновлення прогресу цілі
function updateGoalProgress(subgoalElement) {
	const goalCard = subgoalElement.closest('.goal-card');
	if (!goalCard) return;

	// Отримуємо ID цілі та запитуємо з сервера актуальні дані про всі підцілі
	const goalId = goalCard.dataset.goalId;
	if (goalId) {
		// Запитуємо актуальні дані про ціль
		fetch(`/api/goal-progress/${goalId}/`)
			.then(response => response.json())
			.then(data => {
				if (data.status === 'success') {
					const progressPercent = data.progress_percent || 0;

					// Оновлюємо прогрес-бар
					const progressBar = goalCard.querySelector('.progress');
					if (progressBar) {
						progressBar.style.width = `${progressPercent}%`;
					}

					// Оновлюємо відсоток
					const percentElement = goalCard.querySelector('.percent');
					if (percentElement) {
						percentElement.textContent = `${progressPercent}%`;
					}
				}
			})
			.catch(error => {
				console.error('Помилка при отриманні прогресу цілі:', error);
				// Fallback до локального підрахунку
				updateGoalProgressLocal(goalCard);
			});
	} else {
		// Fallback до локального підрахунку, если нет ID цели
		updateGoalProgressLocal(goalCard);
	}
}

// Функція для локального оновлення прогресу (fallback)
function updateGoalProgressLocal(goalCard) {
	// Знаходимо всі видимі підцілі в картці цілі
	const allSubgoals = goalCard.querySelectorAll('.subgoal-checkbox');

	// Підраховуємо завершені підцілі більш надійним способом
	let completedCount = 0;
	allSubgoals.forEach(checkbox => {
		const completedValue = checkbox.dataset.completed ? checkbox.dataset.completed.trim() : 'false';
		if (completedValue === 'true') {
			completedCount++;
		}
	});

	const totalSubgoals = allSubgoals.length;
	const progressPercent = totalSubgoals > 0 ? Math.round((completedCount / totalSubgoals) * 100) : 0;

	console.log(`Оновлення прогресу цілі: завершено ${completedCount} з ${totalSubgoals} (${progressPercent}%)`);

	// Оновлюємо прогрес-бар
	const progressBar = goalCard.querySelector('.progress');
	if (progressBar) {
		progressBar.style.width = `${progressPercent}%`;
	}

	// Оновлюємо відсоток
	const percentElement = goalCard.querySelector('.percent');
	if (percentElement) {
		percentElement.textContent = `${progressPercent}%`;
	}
}

// Функція для планування переупорядкування підцілей
function scheduleSubgoalReordering(goalCard) {
	// Очищуємо попередній таймер, якщо він є
	if (goalCard.reorderingTimer) {
		clearTimeout(goalCard.reorderingTimer);
	}

	// Встановлюємо новий таймер на 15 секунд
	goalCard.reorderingTimer = setTimeout(() => {
		reorderSubgoals(goalCard);
	}, 15000); // 15 секунд
}

// Функція для переупорядкування підцілей (невиконані нагору, виконані вниз)
function reorderSubgoals(goalCard) {
	const subgoalsList = goalCard.querySelector('.subgoals-list');
	if (!subgoalsList) return;

	// Отримуємо всі елементи підцілей (виключаючи "+ X more...")
	const subgoalItems = Array.from(subgoalsList.querySelectorAll('li')).filter(li => {
		return li.querySelector('.subgoal-checkbox') !== null;
	});

	// Зберігаємо поточні позиції елементів
	const currentOrder = subgoalItems.map(item => ({
		element: item,
		completed: item.querySelector('.subgoal-checkbox').dataset.completed === 'true',
		originalIndex: Array.from(subgoalsList.children).indexOf(item)
	}));

	// Сортуємо: невиконані спочатку, потім виконані
	const sortedOrder = [...currentOrder].sort((a, b) => {
		if (a.completed === b.completed) return 0;
		return a.completed ? 1 : -1; // невиконані (false) йдуть першими
	});

	// Перевіряємо, чи потрібно взагалі переупорядковувати
	const needsReorder = currentOrder.some((item, index) =>
		item.element !== sortedOrder[index].element
	);

	if (!needsReorder) {
		console.log('Переупорядкування не потрібне');
		return;
	}

	// Перевіряємо, чи згорнутий список
	const isExpanded = goalCard.classList.contains('selected');

	// Якщо список згорнутий, показуємо анімацію "peek" для прихованих елементів
	if (!isExpanded) {
		showReorderingPreview(goalCard, currentOrder, sortedOrder);
		return;
	}

	// Отримуємо елемент "+ X more..." якщо він є
	const moreElement = Array.from(subgoalsList.querySelectorAll('li')).find(li => {
		return li.querySelector('.subgoal-checkbox') === null &&
			(li.textContent.includes('more') || li.classList.contains('more-subgoals-indicator'));
	});

	// Додаємо класи анімації
	currentOrder.forEach((item, index) => {
		const newIndex = sortedOrder.findIndex(sorted => sorted.element === item.element);

		if (newIndex !== index) {
			if (newIndex < index) {
				// Елемент рухається вгору
				item.element.classList.add('moving-up');
			} else {
				// Елемент рухається вниз
				item.element.classList.add('moving-down');
			}
		}
	});

	// Чекаємо трохи, потім переупорядковуємо DOM
	setTimeout(() => {
		// Очищуємо список
		subgoalsList.innerHTML = '';

		// Додаємо відсортовані елементи
		sortedOrder.forEach(item => {
			subgoalsList.appendChild(item.element);
		});

		// Додаємо "+ X more..." в кінець, якщо він був
		if (moreElement) {
			subgoalsList.appendChild(moreElement);
		}

		// Прибираємо класи анімації через деякий час
		setTimeout(() => {
			sortedOrder.forEach(item => {
				item.element.classList.remove('moving-up', 'moving-down');
			});
		}, 400);

		console.log('Підцілі переупорядковані: невиконані нагору, виконані вниз');
	}, 50);
}

// Функція для показу попереднього перегляду переупорядкування у згорнутому списку
function showReorderingPreview(goalCard, currentOrder, sortedOrder) {
	const subgoalsList = goalCard.querySelector('.subgoals-list');

	// Знаходимо елементи, які будуть переміщені, але зараз приховані
	const hiddenMovingItems = sortedOrder.slice(0, 3).filter((item, index) => {
		const currentIndex = currentOrder.findIndex(current => current.element === item.element);
		return currentIndex >= 3; // Елемент був прихований, але тепер буде в топ-3
	});

	// Показуємо анімацію "peek" для прихованих елементів, які піднімаються
	hiddenMovingItems.forEach((item, index) => {
		// Тимчасово показуємо елемент з анімацією
		item.element.classList.add('reordering-hidden');

		setTimeout(() => {
			item.element.classList.remove('reordering-hidden');
		}, 600);
	});

	// Виконуємо звичайне переупорядкування після попереднього перегляду
	setTimeout(() => {
		performActualReordering(subgoalsList, currentOrder, sortedOrder);
	}, 300);
}

// Функція для виконання фактичного переупорядкування
function performActualReordering(subgoalsList, currentOrder, sortedOrder) {
	// Отримуємо елемент "+ X more..." якщо він є
	const moreElement = Array.from(subgoalsList.querySelectorAll('li')).find(li => {
		return li.querySelector('.subgoal-checkbox') === null &&
			(li.textContent.includes('more') || li.classList.contains('more-subgoals-indicator'));
	});

	// Додаємо класи анімації тільки для видимих елементів (перші 3)
	currentOrder.slice(0, 3).forEach((item, index) => {
		const newIndex = sortedOrder.findIndex(sorted => sorted.element === item.element);

		if (newIndex !== index && newIndex < 3) {
			if (newIndex < index) {
				// Елемент рухається вгору
				item.element.classList.add('moving-up');
			} else {
				// Елемент рухається вниз
				item.element.classList.add('moving-down');
			}
		}
	});

	// Чекаємо трохи, потім переупорядковуємо DOM
	setTimeout(() => {
		// Очищуємо список
		subgoalsList.innerHTML = '';

		// Додаємо відсортовані елементи
		sortedOrder.forEach(item => {
			subgoalsList.appendChild(item.element);
		});

		// Додаємо "+ X more..." в кінець, якщо він був
		if (moreElement) {
			subgoalsList.appendChild(moreElement);
		}

		// Прибираємо класи анімації через деякий час
		setTimeout(() => {
			sortedOrder.forEach(item => {
				item.element.classList.remove('moving-up', 'moving-down');
			});
		}, 400);

		console.log('Підцілі переупорядковані: невиконані нагору, виконані вниз');
	}, 50);
}

// Функція для ініціалізації обробників кнопок "Показати всі"
function initShowAllSubgoalsHandlers() {
	const showAllButtons = document.querySelectorAll('.show-all-subgoals-btn');

	showAllButtons.forEach(button => {
		// Перевіряємо, чи не додано вже обробник
		if (button.hasAttribute('data-handler-attached')) {
			return;
		}

		button.setAttribute('data-handler-attached', 'true');
		button.addEventListener('click', function (event) {
			event.preventDefault();
			event.stopPropagation();

			const goalCard = this.closest('.goal-card');
			const subgoalsList = goalCard.querySelector('.subgoals-list');

			if (subgoalsList) {
				// Перемикаємо клас expanded
				subgoalsList.classList.toggle('expanded');

				// Керуємо станом "вибраної" цілі
				if (subgoalsList.classList.contains('expanded')) {
					// Розгортаємо: робимо ціль вибраною
					this.textContent = 'Приховати';
					goalCard.classList.add('selected');

					// Додаємо обробник кліку по документу для згортання
					setTimeout(() => {
						document.addEventListener('click', handleOutsideClick);
					}, 10);
				} else {
					// Згортаємо: прибираємо вибраний стан
					this.textContent = 'Show all';
					goalCard.classList.remove('selected');

					// Прибираємо обробник кліку по документу
					document.removeEventListener('click', handleOutsideClick);
				}

				// Повторно ініціалізуємо обробники для нових видимих підцілей
				initSubgoalHandlersForGoal(goalCard);
			}
		});
	});
}

// Функція для обробки кліку поза вибраною ціллю
function handleOutsideClick(event) {
	const selectedGoalCard = document.querySelector('.goal-card.selected');

	if (selectedGoalCard) {
		// Перевіряємо, що клік був не по самій вибраній цілі
		if (!selectedGoalCard.contains(event.target)) {
			// Згортаємо ціль
			const subgoalsList = selectedGoalCard.querySelector('.subgoals-list');
			const showAllButton = selectedGoalCard.querySelector('.show-all-subgoals-btn');

			if (subgoalsList && showAllButton) {
				subgoalsList.classList.remove('expanded');
				showAllButton.textContent = 'Show all';
				selectedGoalCard.classList.remove('selected');

				// Прибираємо обробник
				document.removeEventListener('click', handleOutsideClick);
			}
		}
	}
}

// Функція для ініціалізації обробників карток цілей
function initGoalCardHandlers() {
	const goalCards = document.querySelectorAll('.goal-card');

	goalCards.forEach(goalCard => {
		// Перевіряємо, чи не додано вже обробник
		if (goalCard.hasAttribute('data-click-handler-attached')) {
			return;
		}

		goalCard.setAttribute('data-click-handler-attached', 'true');

		// Додаємо обробник кліку для запобігання випадкового згортання
		goalCard.addEventListener('click', function (event) {
			// Зупиняємо спливання події, щоб вона не дійшла до document
			event.stopPropagation();
		});
	});
}

// Функція для ініціалізації обробників підцілей у конкретній цілі
function initSubgoalHandlersForGoal(goalCard) {
	const subgoalCheckboxes = goalCard.querySelectorAll('.subgoal-checkbox');

	subgoalCheckboxes.forEach(checkbox => {
		addSubgoalClickHandler(checkbox);
	});
}

// Ініціалізація викликається з main.js, не потрібно дублювати тут