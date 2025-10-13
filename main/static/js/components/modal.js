/**
 * Компонент модальных окон
 * TaskForge - ініціалізація та управління модальними вікнами
 * 
 * @module components/modal
 */

// Публічний API компоненту
function initModals() {
	console.log('Modal component initialized');
	initializeModalHandlers();
}
/**
 * Ініціалізує обробники для модальних вікон
 * @private
 */
function initializeModalHandlers() {
	// --- Модальне вікно аутентифікації ---
	const authModal = document.getElementById("auth-modal");
	const profileBtn = document.getElementById("profile-btn");
	const closeAuth = authModal ? authModal.querySelector(".close") : null;
	const loginForm = document.getElementById("login-form");
	const registerForm = document.getElementById("register-form");
	const showRegister = document.getElementById("show-register");
	const showLogin = document.getElementById("show-login");

	// --- Модальне вікно двофакторної аутентифікації ---
	function show2FAModal(username) {
		// Код для показу модального вікна 2FA
		const twoFAModal = document.getElementById('twofa-modal');
		if (!twoFAModal) return;

		twoFAModal.style.display = 'block';

		// Перевіряємо статус 2FA авторизації кожні 3 секунди
		const interval = setInterval(() => {
			fetch(`/api/check_2fa_status/?username=${username}`)
				.then(response => response.json())
				.then(data => {
					if (data.status === 'approved') {
						clearInterval(interval);
						twoFAModal.style.display = 'none';
						// Авторизуємо користувача
						fetch('/api/complete_2fa_login/', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'X-CSRFToken': getCSRFToken()
							},
							body: JSON.stringify({ username: username })
						})
							.then(response => response.json())
							.then(data => {
								if (data.status === 'success') {
									window.location.reload();
								}
							});
					}
				});
		}, 3000);
	}

	// Викликати цю функцію, якщо Django встановлює JS-змінну `window.show2faUser` з ім'ям користувача
	if (window.show2faUser) {
		show2FAModal(window.show2faUser);
	}

	// Перевірка автентифікації користувача за наявністю привітального повідомлення
	const greetingBlock = authModal ? authModal.querySelector("h2") : null;
	const isAuthenticated = greetingBlock && greetingBlock.textContent.startsWith("Hi,") || document.body.classList.contains('authenticated');

	if (authModal) {
		// Показувати або приховувати відповідну форму при завантаженні
		if (showRegister && showLogin) {
			showRegister.addEventListener("click", (e) => {
				e.preventDefault();
				loginForm.style.display = "none";
				registerForm.style.display = "block";
			});

			showLogin.addEventListener("click", (e) => {
				e.preventDefault();
				registerForm.style.display = "none";
				loginForm.style.display = "block";
			});
		}
	}

	const openAuthModal = () => authModal ? authModal.classList.add("active") : null;
	const closeAuthModal = () => authModal ? authModal.classList.remove("active") : null;

	if (profileBtn) profileBtn.addEventListener("click", openAuthModal);
	if (closeAuth) closeAuth.addEventListener("click", closeAuthModal);
	if (authModal) {
		authModal.addEventListener("click", (e) => {
			if (e.target === authModal) closeAuthModal();
		});
	}

	if (!isAuthenticated) {
		// Обробники форми входу та реєстрації
		if (loginForm) {
			loginForm.addEventListener('submit', function (e) {
				// Відправка даних форми обробляється сервером Django
			});
		}

		if (registerForm) {
			registerForm.addEventListener('submit', function (e) {
				// Перевірка паролів
				const password = registerForm.querySelector('input[name="password"]').value;
				const confirm = registerForm.querySelector('input[name="confirm"]').value;

				if (password !== confirm) {
					e.preventDefault();
					alert("Паролі не збігаються");
				}
			});
		}
	}

	// --- Випадаюче меню сповіщень ---
	const bellBtn = document.getElementById("bell");
	const notificationsDropdown = document.querySelector(".notifications-dropdown");
	const notificationsList = document.getElementById("notifications-list");

	// --- Перемикач сповіщень Telegram ---
	const tgNotifySwitch = document.getElementById("tg-notify-switch");
	if (tgNotifySwitch) {
		tgNotifySwitch.addEventListener('change', function () {
			// Перевіряємо чи не вимкнений перемикач
			if (this.disabled) {
				this.checked = !this.checked; // Повертаємо у попереднє положення
				showMessage('Please connect your Telegram bot first', 'error');
				return;
			}

			const enabled = this.checked;
			const switchElement = this;

			// Позначаємо що перемикач оновлюється, щоб уникнути конфліктів з періодичними перевірками
			switchElement.setAttribute('data-updating', 'true');
			// Блокуємо перемикач під час запиту для запобігання race condition
			switchElement.disabled = true;

			fetch('/api/tg_notify_toggle/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCSRFToken()
				},
				body: JSON.stringify({ enabled: enabled })
			})
				.then(response => response.json())
				.then(data => {
					if (data.status === 'ok') {
						showMessage(`Telegram notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
						// Переконуємося що стан збережено правильно
						switchElement.checked = enabled;
					} else {
						showMessage(data.msg || 'Failed to update notification settings', 'error');
						// Повертаємо перемикач у попереднє положення
						switchElement.checked = !enabled;
					}
				})
				.catch(error => {
					showMessage('Connection error occurred', 'error');
					// Повертаємо перемикач у попереднє положення
					switchElement.checked = !enabled;
				})
				.finally(() => {
					// Завжди розблоковуємо перемикач та знімаємо позначку оновлення
					switchElement.disabled = false;
					switchElement.removeAttribute('data-updating');
				});
		});
	}

	// --- Перемикач двофакторної аутентифікації ---
	const tg2faSwitch = document.getElementById("tg-2fa-switch");
	if (tg2faSwitch) {
		tg2faSwitch.addEventListener('change', function () {
			// Перевіряємо чи не вимкнений перемикач
			if (this.disabled) {
				this.checked = !this.checked; // Повертаємо у попереднє положення
				showMessage('Please connect your Telegram bot first', 'error');
				return;
			}

			const enabled = this.checked;
			const switchElement = this;

			// Позначаємо що перемикач оновлюється, щоб уникнути конфліктів з періодичними перевірками
			switchElement.setAttribute('data-updating', 'true');
			// Блокуємо перемикач під час запиту для запобігання race condition
			switchElement.disabled = true;

			fetch('/api/tg_2fa_toggle/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCSRFToken()
				},
				body: JSON.stringify({ enabled: enabled })
			})
				.then(response => response.json())
				.then(data => {
					if (data.status === 'ok') {
						showMessage(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`, 'success');
						// Переконуємося що стан збережено правильно
						switchElement.checked = enabled;
					} else {
						showMessage(data.msg || 'Failed to update 2FA settings', 'error');
						// Повертаємо перемикач у попереднє положення
						switchElement.checked = !enabled;
					}
				})
				.catch(error => {
					showMessage('Connection error occurred', 'error');
					// Повертаємо перемикач у попереднє положення
					switchElement.checked = !enabled;
				})
				.finally(() => {
					// Завжди розблоковуємо перемикач та знімаємо позначку оновлення
					switchElement.disabled = false;
					switchElement.removeAttribute('data-updating');
				});
		});
	}

	if (notificationsList && notificationsList.children.length === 0) {
		const noNotificationsItem = document.createElement('li');
		noNotificationsItem.className = 'no-notifications';
		noNotificationsItem.textContent = 'No notifications';
		notificationsList.appendChild(noNotificationsItem);
	}

	const toggleNotifications = () => {
		notificationsDropdown.classList.toggle("active");
	};

	if (bellBtn) {
		bellBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			toggleNotifications();
		});
	}

	window.addEventListener("click", () => {
		notificationsDropdown?.classList.remove("active");
	});

	if (notificationsDropdown) notificationsDropdown.addEventListener("click", (e) => e.stopPropagation());

	// Ініціалізація модального вікна створення
	initCreateModal();
}

/**
 * Ініціалізує модальне вікно створення нової цілі або звички
 * @private
 */
function initCreateModal() {
	const createModal = document.getElementById('create-modal');
	const createButton = document.getElementById('create-new-btn');
	const closeButtons = document.querySelectorAll('.create-modal-close');

	// Обробник кнопки створення
	if (createButton) {
		createButton.addEventListener('click', function (e) {
			e.preventDefault();

			// Перевіряємо авторизацію користувача перед відкриттям модального вікна
			if (!isAuthenticated()) {
				showLoginPrompt();
				return;
			}

			openCreateModal();
		});
	}

	// Обробники закриття модального вікна
	closeButtons.forEach(btn => {
		btn.addEventListener('click', closeCreateModal);
	});

	// Закриття по кліку поза модальним вікном
	window.addEventListener('click', function (event) {
		if (event.target === createModal) {
			closeCreateModal();
		}
	});

	// Крок 1: Вибір типу (ціль або звичка)
	const optionButtons = document.querySelectorAll('.create-option');
	optionButtons.forEach(button => {
		button.addEventListener('click', function () {
			// Знімаємо виділення з усіх опцій
			optionButtons.forEach(btn => btn.classList.remove('selected'));

			// Виділяємо вибрану опцію
			this.classList.add('selected');

			// Визначаємо вибраний тип
			const optionType = this.dataset.option;

			// Переходимо до відповідного другого кроку
			setTimeout(() => {
				document.getElementById('create-step-1').style.display = 'none';

				if (optionType === 'habit') {
					document.getElementById('create-step-2-habit').style.display = 'block';
				} else if (optionType === 'goal') {
					document.getElementById('create-step-2-goal').style.display = 'block';
				}
			}, 300);
		});
	});

	// Кнопки "Back"
	document.querySelectorAll('.back-btn').forEach(button => {
		button.addEventListener('click', function () {
			// Ховаємо поточний крок
			let currentStep = this.closest('.create-step');
			currentStep.style.display = 'none';

			// Показуємо перший крок
			document.getElementById('create-step-1').style.display = 'block';

			// Скидаємо вибір
			document.querySelectorAll('.create-option').forEach(option => {
				option.classList.remove('selected');
			});
		});
	});

	// Перемикання між шаблонами та власним створенням
	document.querySelectorAll('.template-btn').forEach(button => {
		button.addEventListener('click', function () {
			// Визначаємо, до якого типу належить кнопка (звичка або ціль)
			const parentContainer = this.closest('.create-template-option');
			const isHabit = parentContainer.closest('#create-step-2-habit');

			// Знімаємо виділення з усіх кнопок у цьому контейнері
			parentContainer.querySelectorAll('.template-btn').forEach(btn => {
				btn.classList.remove('active');
			});

			// Виділяємо натиснуту кнопку
			this.classList.add('active');

			// Визначаємо вибраний тип отображения
			const templateType = this.dataset.templateType;

			// Показуємо відповідний контейнер
			if (isHabit) {
				document.getElementById('habit-templates').style.display = templateType === 'predefined' ? 'block' : 'none';
				document.getElementById('habit-custom').style.display = templateType === 'custom' ? 'block' : 'none';
			} else {
				document.getElementById('goal-templates').style.display = templateType === 'predefined' ? 'block' : 'none';
				document.getElementById('goal-custom').style.display = templateType === 'custom' ? 'block' : 'none';
			}
		});
	});

	// Вибір шаблону звички
	document.querySelectorAll('#habit-templates .template-item').forEach(item => {
		item.addEventListener('click', function () {
			// Знімаємо виділення з усіх шаблонів
			document.querySelectorAll('#habit-templates .template-item').forEach(template => {
				template.classList.remove('selected');
			});

			// Виділяємо вибраний шаблон
			this.classList.add('selected');

			// Активуємо кнопку підтвердження
			document.getElementById('confirm-habit-template').disabled = false;
		});
	});

	// Вибір шаблону цілі
	document.querySelectorAll('#goal-templates .template-item').forEach(item => {
		item.addEventListener('click', function () {
			// Знімаємо виділення з усіх шаблонів
			document.querySelectorAll('#goal-templates .template-item').forEach(template => {
				template.classList.remove('selected');
			});

			// Виділяємо вибраний шаблон
			this.classList.add('selected');

			// Активуємо кнопку підтвердження
			document.getElementById('confirm-goal-template').disabled = false;
		});
	});

	// Створення звички з шаблону
	document.getElementById('confirm-habit-template').addEventListener('click', function () {
		// Знаходимо вибраний шаблон
		const selectedTemplate = document.querySelector('#habit-templates .template-item.selected');

		if (!selectedTemplate) {
			showMessage('Please select a habit template first', 'info');
			return;
		}

		const templateId = selectedTemplate.dataset.templateId;

		// Викликаємо функцію використання шаблону звички
		if (typeof useHabitTemplate === 'function') {
			useHabitTemplate(templateId);
		} else {
			// Якщо функція не знайдена, реалізуємо її тут
			fetch('/api/use-habit-template/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCSRFToken()
				},
				body: JSON.stringify({ template_id: templateId })
			})
				.then(response => {
					if (!response.ok) {
						throw new Error('Network response was not ok');
					}
					return response.json();
				})
				.then(data => {
					if (data.status === 'ok') {
						// Закриваємо модальне вікно
						closeCreateModal();
						// Показуємо повідомлення про успіх
						showMessage('Habit created successfully!', 'success');
						// Перезавантажуємо сторінку через невелику затримку
						setTimeout(() => {
							window.location.reload();
						}, 1000);
					} else {
						showMessage('Error creating habit: ' + data.message, 'error');
					}
				})
				.catch(error => {
					console.error('Error:', error);
					showMessage('An error occurred while communicating with the server', 'error');
				});
		}
	});

	// Створення цілі з шаблону
	document.getElementById('confirm-goal-template').addEventListener('click', function () {
		// Знаходимо вибраний шаблон
		const selectedTemplate = document.querySelector('#goal-templates .template-item.selected');

		if (!selectedTemplate) {
			showMessage('Please select a goal template first', 'info');
			return;
		}

		const templateId = selectedTemplate.dataset.templateId;

		// Викликаємо функцію використання шаблону цілі
		if (typeof useGoalTemplate === 'function') {
			useGoalTemplate(templateId);
		} else {
			// Якщо функція не знайдена, реалізуємо її тут
			fetch('/api/use-goal-template/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCSRFToken()
				},
				body: JSON.stringify({ template_id: templateId })
			})
				.then(response => {
					if (!response.ok) {
						throw new Error('Network response was not ok');
					}
					return response.json();
				})
				.then(data => {
					if (data.status === 'ok') {
						// Закриваємо модальне вікно
						closeCreateModal();
						// Показуємо повідомлення про успіх
						showMessage('Goal created successfully!', 'success');
						// Перезавантажуємо сторінку через невелику затримку
						setTimeout(() => {
							window.location.reload();
						}, 1000);
					} else {
						showMessage('Error creating goal: ' + data.message, 'error');
					}
				})
				.catch(error => {
					console.error('Error:', error);
					showMessage('An error occurred while communicating with the server', 'error');
				});
		}
	});

	// Форма створення власної звички
	document.getElementById('custom-habit-form').addEventListener('submit', function (e) {
		e.preventDefault();

		const habitData = {
			name: this.querySelector('input[name="name"]').value,
			description: this.querySelector('textarea[name="description"]').value,
			frequency: this.querySelector('select[name="frequency"]').value
		};

		// Створюємо звичку
		createCustomHabit(habitData);
	});

	// Форма створення власної цілі
	document.getElementById('custom-goal-form').addEventListener('submit', function (e) {
		e.preventDefault();

		// Збираємо дані про підзавдання
		const subgoals = [];
		this.querySelectorAll('input[name="subgoals[]"]').forEach(input => {
			if (input.value.trim()) {
				subgoals.push(input.value.trim());
			}
		});

		const goalData = {
			name: this.querySelector('input[name="name"]').value,
			description: this.querySelector('textarea[name="description"]').value,
			deadline: this.querySelector('input[name="deadline"]').value,
			subgoals: subgoals
		};

		// Створюємо ціль
		createCustomGoal(goalData);
	});

	// Додавання підзадачі
	document.getElementById('add-subgoal').addEventListener('click', function () {
		const container = document.getElementById('subgoal-container');

		// Створюємо новий елемент підзавдання
		const subgoalItem = document.createElement('div');
		subgoalItem.className = 'subgoal-item';

		subgoalItem.innerHTML = `
            <input type="text" name="subgoals[]" placeholder="Subtask" required>
            <button type="button" class="remove-subgoal"><i class="fa-solid fa-times"></i></button>
        `;

		// Додаємо елемент до контейнера
		container.appendChild(subgoalItem);

		// Ініціалізуємо кнопку видалення
		const removeButton = subgoalItem.querySelector('.remove-subgoal');
		removeButton.addEventListener('click', function () {
			subgoalItem.remove();
		});
	});

	// Ініціалізація обробників видалення підзадач
	document.querySelectorAll('.remove-subgoal').forEach(button => {
		button.addEventListener('click', function () {
			this.closest('.subgoal-item').remove();
		});
	});
}

function openCreateModal() {
	const createModal = document.getElementById('create-modal');

	// Скидання стану модального вікна
	document.getElementById('create-step-1').style.display = 'block';
	document.getElementById('create-step-2-habit').style.display = 'none';
	document.getElementById('create-step-2-goal').style.display = 'none';

	document.querySelectorAll('.create-option').forEach(btn => btn.classList.remove('selected'));
	document.querySelectorAll('.template-item').forEach(item => item.classList.remove('selected'));

	document.getElementById('confirm-habit-template').disabled = true;
	document.getElementById('confirm-goal-template').disabled = true;

	// Скидання форм
	document.getElementById('custom-habit-form').reset();
	document.getElementById('custom-goal-form').reset();

	// Завантаження актуальних шаблонів при відкритті модального вікна
	fetchTemplates();

	// Показати модальне вікно
	createModal.classList.add('active');
}

function closeCreateModal() {
	document.getElementById('create-modal').classList.remove('active');
}

function isAuthenticated() {
	return document.body.classList.contains('authenticated');
}

function showLoginPrompt() {
	const profileBtn = document.getElementById('profile-btn');
	if (profileBtn) {
		profileBtn.click();
	}
	showMessage('Please sign in or register to create a goal or habit', 'info');
}

function createCustomHabit(habitData) {
	fetch('/api/create-custom-habit/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify(habitData)
	})
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		})
		.then(data => {
			if (data.status === 'ok') {
				// Закриваємо модальне вікно
				closeCreateModal();
				// Показуємо повідомлення про успіх
				showMessage('Habit created successfully!', 'success');
				// Перезавантажуємо сторінку через невелику затримку
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				showMessage('Error creating habit: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while communicating with the server', 'error');
		});
}

function createCustomGoal(goalData) {
	fetch('/api/create-custom-goal/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify(goalData)
	})
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		})
		.then(data => {
			if (data.status === 'ok') {
				// Закриваємо модальне вікно
				closeCreateModal();
				// Показуємо повідомлення про успіх
				showMessage('Goal created successfully!', 'success');
				// Перезавантажуємо сторінку через невелику затримку
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				showMessage('Error creating goal: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while communicating with the server', 'error');
		});
}

function useHabitTemplate(templateId) {
	fetch('/api/use-habit-template/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify({ template_id: templateId })
	})
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		})
		.then(data => {
			if (data.status === 'ok') {
				// Закриваємо модальне вікно
				closeCreateModal();
				// Показуємо повідомлення про успіх
				showMessage('Habit created successfully!', 'success');
				// Перезавантажуємо сторінку через невелику затримку
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				showMessage('Error creating habit: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while communicating with the server', 'error');
		});
}

function useGoalTemplate(templateId) {
	fetch('/api/use-goal-template/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify({ template_id: templateId })
	})
		.then(response => {
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		})
		.then(data => {
			if (data.status === 'ok') {
				// Закриваємо модальне вікно
				closeCreateModal();
				// Показуємо повідомлення про успіх
				showMessage('Goal created successfully!', 'success');
				// Перезавантажуємо сторінку через невелику затримку
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			} else {
				showMessage('Error creating goal: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while communicating with the server', 'error');
		});
}

/**
 * Завантажує актуальні шаблони звичок та цілей з сервера
 */
function fetchTemplates() {
	// Завантаження шаблонів звичок
	fetch('/api/get-habit-templates/')
		.then(response => response.json())
		.then(data => {
			if (data.status === 'ok' && data.templates && data.templates.length > 0) {
				// Очистимо контейнер шаблонів звичок
				const habitTemplatesContainer = document.querySelector('#habit-templates .template-list');
				habitTemplatesContainer.innerHTML = '';

				// Додамо кожен шаблон
				data.templates.forEach(template => {
					const templateItem = document.createElement('div');
					templateItem.className = 'template-item';
					templateItem.dataset.templateId = template.id;

					let iconClass = 'fa-solid fa-check-circle';
					if (template.name.toLowerCase().includes('read') || template.name.toLowerCase().includes('reading')) {
						iconClass = 'fa-solid fa-book-open';
					} else if (template.name.toLowerCase().includes('exercise') ||
						template.name.toLowerCase().includes('workout') ||
						template.name.toLowerCase().includes('gym')) {
						iconClass = 'fa-solid fa-dumbbell';
					} else if (template.name.toLowerCase().includes('meditate') ||
						template.name.toLowerCase().includes('meditation')) {
						iconClass = 'fa-solid fa-spa';
					} else if (template.name.toLowerCase().includes('water') ||
						template.name.toLowerCase().includes('hydrate')) {
						iconClass = 'fa-solid fa-glass-water';
					} else if (template.name.toLowerCase().includes('sleep')) {
						iconClass = 'fa-solid fa-bed';
					}

					templateItem.innerHTML = `
                        <i class="${iconClass}"></i>
                        <h3>${template.name}</h3>
                        <p>${template.description || ''}</p>
                        <p>Frequency: ${template.frequency}</p>
                    `;

					habitTemplatesContainer.appendChild(templateItem);

					// Додаємо обробник кліку
					templateItem.addEventListener('click', function () {
						document.querySelectorAll('#habit-templates .template-item').forEach(item => {
							item.classList.remove('selected');
						});
						this.classList.add('selected');
						document.getElementById('confirm-habit-template').disabled = false;
					});
				});
			}
		})
		.catch(error => {
			console.error('Error loading habit templates:', error);
		});

	// Завантаження шаблонів цілей
	fetch('/api/get-goal-templates/')
		.then(response => response.json())
		.then(data => {
			if (data.status === 'ok' && data.templates && data.templates.length > 0) {
				// Очистимо контейнер шаблонів цілей
				const goalTemplatesContainer = document.querySelector('#goal-templates .template-list');
				goalTemplatesContainer.innerHTML = '';

				// Додамо кожен шаблон
				data.templates.forEach(template => {
					const templateItem = document.createElement('div');
					templateItem.className = 'template-item';
					templateItem.dataset.templateId = template.id;

					templateItem.innerHTML = `
                        <i class="fa-solid fa-bullseye"></i>
                        <h3>${template.name}</h3>
                        <p>${template.description || ''}</p>
                    `;

					goalTemplatesContainer.appendChild(templateItem);

					// Додаємо обробник кліку
					templateItem.addEventListener('click', function () {
						document.querySelectorAll('#goal-templates .template-item').forEach(item => {
							item.classList.remove('selected');
						});
						this.classList.add('selected');
						document.getElementById('confirm-goal-template').disabled = false;
					});
				});
			}
		})
		.catch(error => {
			console.error('Error loading goal templates:', error);
		});
}

function getCSRFToken() {
	// Отримуємо CSRF токен з cookie
	const name = 'csrftoken';
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
	return '';
}

function showMessage(message, type = 'info') {
	// Перевіряємо, чи існує контейнер для повідомлень
	let messageContainer = document.getElementById('message-container');

	if (!messageContainer) {
		// Створюємо контейнер, якщо його немає
		messageContainer = document.createElement('div');
		messageContainer.id = 'message-container';
		messageContainer.style.position = 'fixed';
		messageContainer.style.top = '20px';
		messageContainer.style.right = '20px';
		messageContainer.style.zIndex = '9999';
		document.body.appendChild(messageContainer);
	}

	// Створюємо елемент повідомлення
	const messageElement = document.createElement('div');
	messageElement.className = `message ${type}`;
	messageElement.textContent = message;

	// Стилізація повідомлення
	messageElement.style.backgroundColor = type === 'error' ? 'rgba(220, 53, 69, 0.9)' :
		type === 'success' ? 'rgba(40, 167, 69, 0.9)' :
			'rgba(212, 175, 55, 0.9)';
	messageElement.style.color = '#fff';
	messageElement.style.padding = '10px 15px';
	messageElement.style.borderRadius = '5px';
	messageElement.style.marginBottom = '10px';
	messageElement.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
	messageElement.style.transition = 'opacity 0.5s ease-in-out';

	// Додаємо повідомлення до контейнера
	messageContainer.appendChild(messageElement);

	// Видаляємо повідомлення через 5 секунд
	setTimeout(() => {
		messageElement.style.opacity = '0';
		setTimeout(() => {
			messageElement.remove();
		}, 500);
	}, 5000);
}

// --- Функція для перевірки статусу Telegram та оновлення інтерфейсу ---
let isConnectedToTelegram = false;

function checkTelegramStatusAndUpdate() {
	fetch('/api/check_telegram_status/', {
		method: 'GET',
		headers: {
			'X-CSRFToken': getCSRFToken()
		}
	})
		.then(response => response.json())
		.then(data => {
			const tgNotifySwitch = document.getElementById("tg-notify-switch");
			const tg2faSwitch = document.getElementById("tg-2fa-switch");
			const tgCodeBlock = document.querySelector(".tg-code-block");

			if (data.connected) {
				// Telegram підключений - активуємо перемикачі
				if (tgNotifySwitch && !tgNotifySwitch.hasAttribute('data-updating')) {
					tgNotifySwitch.disabled = false;
					tgNotifySwitch.checked = data.notify_enabled;
					tgNotifySwitch.nextElementSibling.classList.remove('disabled');
					tgNotifySwitch.parentElement.removeAttribute('title');
				}

				if (tg2faSwitch && !tg2faSwitch.hasAttribute('data-updating')) {
					tg2faSwitch.disabled = false;
					tg2faSwitch.checked = data.two_factor_enabled;
					tg2faSwitch.nextElementSibling.classList.remove('disabled');
					tg2faSwitch.parentElement.removeAttribute('title');
				}

				// Оновлюємо блок коду підключення
				if (tgCodeBlock) {
					tgCodeBlock.innerHTML = '<p>✅ Your Telegram account has been successfully linked!</p>';
				}

				// Якщо тільки що підключилися, зупиняємо часті перевірки
				if (!isConnectedToTelegram) {
					isConnectedToTelegram = true;
					// Переходимо на рідші перевірки (кожні 30 секунд)
					if (telegramCheckInterval) {
						clearInterval(telegramCheckInterval);
						telegramCheckInterval = setInterval(checkTelegramStatusAndUpdate, 30000);
					}
				}
			} else {
				// Telegram не підключений - деактивуємо перемикачі
				if (tgNotifySwitch && !tgNotifySwitch.hasAttribute('data-updating')) {
					tgNotifySwitch.disabled = true;
					tgNotifySwitch.checked = false;
					tgNotifySwitch.nextElementSibling.classList.add('disabled');
					tgNotifySwitch.parentElement.setAttribute('title', 'At least you need to connect to Telegram');
				}

				if (tg2faSwitch && !tg2faSwitch.hasAttribute('data-updating')) {
					tg2faSwitch.disabled = true;
					tg2faSwitch.checked = false;
					tg2faSwitch.nextElementSibling.classList.add('disabled');
					tg2faSwitch.parentElement.setAttribute('title', 'At least you need to connect to Telegram');
				}

				// Оновлюємо блок коду підключення
				if (tgCodeBlock && data.bind_code) {
					tgCodeBlock.innerHTML = `
					<p>This is your key: <strong>${data.bind_code}</strong></p>
					<p>Send this key to our bot, to connect your account.</p>
				`;
				}

				// Якщо відключилися, відновлюємо часті перевірки
				if (isConnectedToTelegram) {
					isConnectedToTelegram = false;
					// Повертаємося до частих перевірок (кожні 5 секунд)
					if (telegramCheckInterval) {
						clearInterval(telegramCheckInterval);
						telegramCheckInterval = setInterval(checkTelegramStatusAndUpdate, 5000);
					}
				}
			}
		})
		.catch(error => {
			console.error('Error checking Telegram status:', error);
		});
}

// Ініціалізація перевірки статусу Telegram
document.addEventListener('DOMContentLoaded', function () {
	// Перевіряємо статус при завантаженні сторінки
	if (document.querySelector('.tg-section')) {
		checkTelegramStatusAndUpdate();

		// Періодично перевіряємо статус (кожні 5 секунд) коли модал відкритий
		let telegramCheckInterval;

		const profileBtn = document.getElementById('profile-btn');
		const authModal = document.getElementById('auth-modal');

		// Запускаємо інтервал при відкритті модала
		if (profileBtn) {
			profileBtn.addEventListener('click', function () {
				if (telegramCheckInterval) {
					clearInterval(telegramCheckInterval);
				}
				telegramCheckInterval = setInterval(checkTelegramStatusAndUpdate, 5000);
			});
		}

		// Зупиняємо інтервал при закритті модала
		const authModalCloseButtons = document.querySelectorAll('#auth-modal .close');
		authModalCloseButtons.forEach(closeBtn => {
			closeBtn.addEventListener('click', function () {
				if (telegramCheckInterval) {
					clearInterval(telegramCheckInterval);
				}
			});
		});

		// Зупиняємо інтервал при кліку поза модалом
		if (authModal) {
			window.addEventListener('click', function (event) {
				if (event.target === authModal && telegramCheckInterval) {
					clearInterval(telegramCheckInterval);
				}
			});
		}
	}
});