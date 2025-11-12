/**
 * Create modal component for TaskForge
 * Handles goal and habit creation modals
 */
console.log('Create modal component initialized');

/**
 * Инициализирует модальные окна создания
 */
function initCreateModals() {
	console.log('🔧 Initializing create modals...');

	// Безопасно добавляем обработчики событий
	safeAddEventListener('#create-new-btn', 'click', handleCreateButtonClick, true);

	// Инициализируем обработчики только если элементы существуют
	initModalNavigation();
	initTemplateSelection();
	initFormSubmissions();
	initSubgoalManagement();

	console.log('✅ Create modals initialized');
}

/**
 * Обрабатывает нажатие кнопки создания
 */
function handleCreateButtonClick(e) {
	console.log('🔘 Create button clicked!');
	e.preventDefault();

	if (!isAuthenticated()) {
		console.log('🔘 User not authenticated, showing login prompt');
		showNotification('Please log in to create goals and habits', 'info');
		showLoginForm();
		return;
	}

	console.log('🔘 Opening create modal...');
	openCreateModal();
}

/**
 * Открывает модальное окно создания
 */
function openCreateModal() {
	console.log('🔘 openCreateModal called');
	const modal = document.getElementById('create-modal');
	console.log('🔘 Modal element found:', !!modal);

	if (modal) {
		// Сначала сбрасываем состояние
		resetModalState();

		console.log('🔘 Adding show class to modal');
		modal.classList.add('show');

		// Принудительно устанавливаем display через JavaScript
		modal.style.display = 'flex';
		modal.style.justifyContent = 'center';
		modal.style.alignItems = 'center';

		console.log('🔘 Modal should now be visible');
		console.log('🔘 Modal classes:', modal.className);
		console.log('🔘 Modal display style:', getComputedStyle(modal).display);

		// Показываем первый шаг
		showCreateStep('main');

		// Загружаем шаблоны если их еще нет
		loadTemplates();
	} else {
		console.error('❌ Create modal not found in DOM!');
		console.log('🔍 Current page:', window.location.pathname);

		// Попробуем найти любые модальные окна
		const allModals = document.querySelectorAll('[id*="modal"]');
		console.log('🔍 Found modals:', Array.from(allModals).map(m => m.id));

		// Если модального окна нет, покажем уведомление
		showNotification('Create modal not available on this page. Try going to the home page.', 'info');

		// Перенаправляем на главную страницу
		setTimeout(() => {
			window.location.href = '/';
		}, 2000);
	}
}

/**
 * Закрывает модальное окно создания
 */
function closeCreateModal() {
	const modal = document.getElementById('create-modal');
	if (modal) {
		modal.classList.remove('show');

		// Принудительно скрываем модальное окно
		modal.style.display = 'none';

		// Сбрасываем состояние модального окна
		resetModalState();

		console.log('✅ Create modal closed');
	}
}

/**
 * Сбрасывает состояние модального окна при закрытии
 */
function resetModalState() {
	// Скрываем все шаги
	const allSteps = document.querySelectorAll('.create-step');
	allSteps.forEach(step => step.style.display = 'none');

	// Сбрасываем выбранные шаблоны
	const allTemplates = document.querySelectorAll('.template-item');
	allTemplates.forEach(item => item.classList.remove('selected'));

	// Отключаем кнопки шаблонов
	const templateButtons = document.querySelectorAll('#confirm-habit-template, #confirm-goal-template, #edit-habit-template, #edit-goal-template');
	templateButtons.forEach(btn => {
		if (btn) {
			btn.disabled = true;
			btn.classList.remove('visible');
		}
	});
}

/**
 * Инициализирует навигацию модального окна
 */
function initModalNavigation() {
	// Обработчики для закрытия модального окна
	safeAddEventListener('.create-modal-close', 'click', closeCreateModal);
	safeAddEventListener('#create-modal', 'click', function (e) {
		if (e.target.id === 'create-modal') {
			closeCreateModal();
		}
	});

	// Обработчики выбора типа (привычка/цель)
	document.addEventListener('click', function (e) {
		if (e.target.closest('.create-option')) {
			const option = e.target.closest('.create-option');
			const type = option.dataset.option;
			showCreateStep(type);
		}
	});

	// Обработчики кнопок "Назад"
	document.addEventListener('click', function (e) {
		if (e.target.closest('.back-btn')) {
			e.preventDefault();
			showCreateStep('main');
		}
	});

	// Обработчики переключения между шаблонами и кастомом
	document.addEventListener('click', function (e) {
		if (e.target.classList.contains('template-btn')) {
			const button = e.target;
			const type = button.dataset.templateType;
			const isHabit = button.closest('#create-step-2-habit');

			// Переключаем активную кнопку
			button.parentElement.querySelectorAll('.template-btn').forEach(btn => {
				btn.classList.remove('active');
			});
			button.classList.add('active');

			// Показываем соответствующий контейнер
			if (isHabit) {
				const templatesContainer = document.getElementById('habit-templates');
				const customContainer = document.getElementById('habit-custom');

				if (type === 'predefined') {
					templatesContainer.style.display = 'block';
					customContainer.style.display = 'none';
				} else {
					templatesContainer.style.display = 'none';
					customContainer.style.display = 'block';
				}
			} else {
				const templatesContainer = document.getElementById('goal-templates');
				const customContainer = document.getElementById('goal-custom');

				if (type === 'predefined') {
					templatesContainer.style.display = 'block';
					customContainer.style.display = 'none';
				} else {
					templatesContainer.style.display = 'none';
					customContainer.style.display = 'block';
				}
			}
		}
	});

	console.log('✅ Modal navigation initialized');
}

/**
 * Показывает определенный шаг создания
 */
function showCreateStep(step) {
	// Скрываем все шаги
	document.querySelectorAll('.create-step').forEach(stepEl => {
		stepEl.style.display = 'none';
	});

	// Сбрасываем состояние кнопок
	resetTemplateButtons();

	// Показываем нужный шаг
	if (step === 'main') {
		const mainStep = document.getElementById('create-step-1');
		if (mainStep) mainStep.style.display = 'block';
	} else if (step === 'habit') {
		const habitStep = document.getElementById('create-step-2-habit');
		if (habitStep) habitStep.style.display = 'block';
	} else if (step === 'goal') {
		const goalStep = document.getElementById('create-step-2-goal');
		if (goalStep) goalStep.style.display = 'block';
	}

	console.log(`✅ Показан шаг: ${step}`);
}

/**
 * Сбрасывает состояние кнопок шаблонов
 */
function resetTemplateButtons() {
	// Сбрасываем кнопки привычек
	const confirmHabitBtn = document.querySelector('#confirm-habit-template');
	const editHabitBtn = document.querySelector('#edit-habit-template');

	if (confirmHabitBtn) confirmHabitBtn.disabled = true;
	if (editHabitBtn) {
		editHabitBtn.disabled = true;
		editHabitBtn.classList.remove('visible');
	}

	// Сбрасываем кнопки целей
	const confirmGoalBtn = document.querySelector('#confirm-goal-template');
	const editGoalBtn = document.querySelector('#edit-goal-template');

	if (confirmGoalBtn) confirmGoalBtn.disabled = true;
	if (editGoalBtn) {
		editGoalBtn.disabled = true;
		editGoalBtn.classList.remove('visible');
	}

	// Убираем выделение с шаблонов
	document.querySelectorAll('.template-item').forEach(item => {
		item.classList.remove('selected');
	});
}

/**
 * Инициализирует выбор шаблонов
 */
function initTemplateSelection() {
	// Обработка выбора шаблонов привычек
	document.addEventListener('click', function (e) {
		if (e.target.closest('#habit-templates .template-item')) {
			handleTemplateSelection(e.target.closest('.template-item'), 'habit');
		}
	});

	// Обработка выбора шаблонов целей
	document.addEventListener('click', function (e) {
		if (e.target.closest('#goal-templates .template-item')) {
			handleTemplateSelection(e.target.closest('.template-item'), 'goal');
		}
	});

	// Кнопки подтверждения шаблонов
	safeAddEventListener('#confirm-habit-template', 'click', handleHabitTemplateConfirm);
	safeAddEventListener('#confirm-goal-template', 'click', handleGoalTemplateConfirm);

	// Кнопки редактирования шаблонов
	safeAddEventListener('#edit-habit-template', 'click', handleHabitTemplateEdit);
	safeAddEventListener('#edit-goal-template', 'click', handleGoalTemplateEdit);
}

/**
 * Обрабатывает выбор шаблона
 */
function handleTemplateSelection(templateItem, type) {
	const containerId = type === 'habit' ? '#habit-templates' : '#goal-templates';
	const confirmBtnId = type === 'habit' ? '#confirm-habit-template' : '#confirm-goal-template';
	const editBtnId = type === 'habit' ? '#edit-habit-template' : '#edit-goal-template';

	// Снимаем выделение со всех элементов
	document.querySelectorAll(`${containerId} .template-item`).forEach(item => {
		item.classList.remove('selected');
	});

	// Добавляем выделение к выбранному элементу
	templateItem.classList.add('selected');

	// Активируем кнопки подтверждения и редактирования
	// Сначала убедимся, что правильный шаг видим
	const currentStepId = type === 'habit' ? 'create-step-2-habit' : 'create-step-2-goal';
	const currentStep = document.getElementById(currentStepId);

	// Если шаг не видим, показываем его
	if (currentStep && currentStep.style.display === 'none') {
		console.log('🔧 Making step visible for template selection...');
		// Скрываем все шаги
		const allSteps = document.querySelectorAll('.create-step');
		allSteps.forEach(step => step.style.display = 'none');

		// Показываем нужный шаг
		currentStep.style.display = 'block';
		console.log(`✅ Показан шаг: ${type}`);

		// Убедимся, что контейнер шаблонов видим (а не кастомная форма)
		const templatesContainer = document.getElementById(type === 'habit' ? 'habit-templates' : 'goal-templates');
		const customContainer = document.getElementById(type === 'habit' ? 'habit-custom' : 'goal-custom');

		if (templatesContainer) templatesContainer.style.display = 'block';
		if (customContainer) customContainer.style.display = 'none';

		// Также обновим состояние кнопок переключения
		const predefinedBtn = document.querySelector(`#${currentStepId} .template-btn[data-template-type="predefined"]`);
		const customBtn = document.querySelector(`#${currentStepId} .template-btn[data-template-type="custom"]`);

		if (predefinedBtn) predefinedBtn.classList.add('active');
		if (customBtn) customBtn.classList.remove('active');
	}	// Используем getElementById для более надежного поиска
	const confirmBtnElementId = type === 'habit' ? 'confirm-habit-template' : 'confirm-goal-template';
	const editBtnElementId = type === 'habit' ? 'edit-habit-template' : 'edit-goal-template';

	// Ждем немного для обновления DOM после показа шага
	setTimeout(() => {
		// Сначала попробуем найти кнопки по ID
		let confirmBtn = document.getElementById(confirmBtnElementId);
		let editBtn = document.getElementById(editBtnElementId);

		// Если не найдены, попробуем поиск в контексте текущего контейнера
		if (!confirmBtn || !editBtn) {
			const containerSelector = type === 'habit' ? '#habit-templates' : '#goal-templates';
			const container = document.querySelector(containerSelector);

			if (container) {
				confirmBtn = container.querySelector(`#${confirmBtnElementId}`);
				editBtn = container.querySelector(`#${editBtnElementId}`);
			}
		}

		// Активируем кнопки, если они найдены
		if (confirmBtn) {
			confirmBtn.disabled = false;
		}

		if (editBtn) {
			editBtn.disabled = false;
			editBtn.classList.add('visible'); // Добавляем класс для анимации
		}

		if (!confirmBtn || !editBtn) {
			console.error('❌ Template buttons not found:', {
				confirmBtnElementId,
				editBtnElementId,
				foundConfirm: !!confirmBtn,
				foundEdit: !!editBtn
			});
		} console.log(`✅ ${type} template selected:`, templateItem.dataset.templateId);
	}, 50); // Небольшая задержка для обновления DOM
}

/**
 * Обрабатывает подтверждение шаблона привычки
 */
function handleHabitTemplateConfirm() {
	const selectedTemplate = document.querySelector('#habit-templates .template-item.selected');
	if (!selectedTemplate) {
		showNotification('Please select a habit template first', 'warning');
		return;
	}

	const templateId = selectedTemplate.dataset.templateId;
	console.log('🔄 Using habit template:', templateId);
	useHabitTemplate(templateId);
}

/**
 * Обрабатывает подтверждение шаблона цели
 */
function handleGoalTemplateConfirm() {
	const selectedTemplate = document.querySelector('#goal-templates .template-item.selected');
	if (!selectedTemplate) {
		showNotification('Please select a goal template first', 'warning');
		return;
	}

	const templateId = selectedTemplate.dataset.templateId;
	console.log('🔄 Using goal template:', templateId);
	useGoalTemplate(templateId);
}

/**
 * Обрабатывает редактирование шаблона привычки
 */
function handleHabitTemplateEdit() {
	console.log('🔘 Edit habit template button clicked!');
	const selectedTemplate = document.querySelector('#habit-templates .template-item.selected');
	if (!selectedTemplate) {
		console.log('⚠️ No habit template selected');
		showNotification('Please select a habit template first', 'warning');
		return;
	}

	const templateId = selectedTemplate.dataset.templateId;
	console.log('🔄 Editing habit template:', templateId);

	// Загружаем данные шаблона и переключаемся на кастомную форму
	loadTemplateForEdit(templateId, 'habit');
}

/**
 * Обрабатывает редактирование шаблона цели
 */
function handleGoalTemplateEdit() {
	console.log('🔘 Edit goal template button clicked!');
	const selectedTemplate = document.querySelector('#goal-templates .template-item.selected');
	if (!selectedTemplate) {
		console.log('⚠️ No goal template selected');
		showNotification('Please select a goal template first', 'warning');
		return;
	}

	const templateId = selectedTemplate.dataset.templateId;
	console.log('🔄 Editing goal template:', templateId);

	// Загружаем данные шаблона и переключаемся на кастомную форму
	loadTemplateForEdit(templateId, 'goal');
}

/**
 * Загружает шаблон для редактирования
 */
function loadTemplateForEdit(templateId, type) {
	const apiUrl = type === 'habit' ? '/api/get-habit-template/' : '/api/get-goal-template/';

	fetch(`${apiUrl}?id=${templateId}`)
		.then(response => response.json())
		.then(data => {
			if (data.status === 'ok') {
				// Переключаемся на кастомную форму
				switchToCustomForm(type);

				// Заполняем форму данными шаблона
				fillFormWithTemplate(data.template, type);

				showNotification(`Template loaded for editing: ${data.template.name}`, 'info');
			} else {
				showNotification('Error loading template: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('An error occurred while loading template', 'error');
		});
}

/**
 * Переключается на кастомную форму
 */
function switchToCustomForm(type) {
	if (type === 'habit') {
		// Переключаем кнопки
		const predefinedBtn = document.querySelector('#create-step-2-habit .template-btn[data-template-type="predefined"]');
		const customBtn = document.querySelector('#create-step-2-habit .template-btn[data-template-type="custom"]');

		if (predefinedBtn) predefinedBtn.classList.remove('active');
		if (customBtn) customBtn.classList.add('active');

		// Переключаем контейнеры
		const templatesContainer = document.getElementById('habit-templates');
		const customContainer = document.getElementById('habit-custom');

		if (templatesContainer) templatesContainer.style.display = 'none';
		if (customContainer) customContainer.style.display = 'block';
	} else {
		// Переключаем кнопки
		const predefinedBtn = document.querySelector('#create-step-2-goal .template-btn[data-template-type="predefined"]');
		const customBtn = document.querySelector('#create-step-2-goal .template-btn[data-template-type="custom"]');

		if (predefinedBtn) predefinedBtn.classList.remove('active');
		if (customBtn) customBtn.classList.add('active');

		// Переключаем контейнеры
		const templatesContainer = document.getElementById('goal-templates');
		const customContainer = document.getElementById('goal-custom');

		if (templatesContainer) templatesContainer.style.display = 'none';
		if (customContainer) customContainer.style.display = 'block';
	}
}

/**
 * Заполняет форму данными шаблона
 */
function fillFormWithTemplate(template, type) {
	if (type === 'habit') {
		const form = document.getElementById('custom-habit-form');
		if (form) {
			const nameField = form.querySelector('input[name="name"]');
			const descField = form.querySelector('textarea[name="description"]');
			const freqField = form.querySelector('select[name="frequency"]');

			if (nameField) nameField.value = template.name || '';
			if (descField) descField.value = template.description || '';
			if (freqField) freqField.value = template.frequency || 'daily';
		}
	} else {
		const form = document.getElementById('custom-goal-form');
		if (form) {
			const nameField = form.querySelector('input[name="name"]');
			const descField = form.querySelector('textarea[name="description"]');
			const deadlineField = form.querySelector('input[name="deadline"]');

			if (nameField) nameField.value = template.name || '';
			if (descField) descField.value = template.description || '';
			if (deadlineField && template.deadline) deadlineField.value = template.deadline;

			// Заполняем подцели если есть
			if (template.subgoals && template.subgoals.length > 0) {
				const subgoalContainer = document.getElementById('subgoal-container');
				if (subgoalContainer) {
					// Очищаем существующие подцели
					subgoalContainer.innerHTML = '';

					// Добавляем подцели из шаблона
					template.subgoals.forEach(subgoal => {
						const subgoalItem = document.createElement('div');
						subgoalItem.className = 'subgoal-item';
						subgoalItem.innerHTML = `
							<input type="text" name="subgoals[]" placeholder="Subtask" required value="${subgoal.name || subgoal}" />
							<button type="button" class="remove-subgoal"><i class="fa-solid fa-times"></i></button>
						`;
						subgoalContainer.appendChild(subgoalItem);
					});
				}
			}
		}
	}
}

/**
 * Инициализирует отправку форм
 */
function initFormSubmissions() {
	// Форма создания пользовательской привычки
	const customHabitForm = document.getElementById('custom-habit-form');
	if (customHabitForm) {
		customHabitForm.addEventListener('submit', handleCustomHabitSubmit);
		console.log('✅ Custom habit form initialized');
	}

	// Форма создания пользовательской цели
	const customGoalForm = document.getElementById('custom-goal-form');
	if (customGoalForm) {
		customGoalForm.addEventListener('submit', handleCustomGoalSubmit);
		console.log('✅ Custom goal form initialized');
	}
}

/**
 * Обрабатывает отправку формы пользовательской привычки
 */
function handleCustomHabitSubmit(e) {
	e.preventDefault();

	const form = e.target;
	const habitData = {
		name: form.querySelector('input[name="name"]').value,
		description: form.querySelector('textarea[name="description"]')?.value || '',
		frequency: form.querySelector('select[name="frequency"]').value
	};

	console.log('🔄 Creating custom habit:', habitData);
	createCustomHabit(habitData);
}

/**
 * Обрабатывает отправку формы пользовательской цели
 */
function handleCustomGoalSubmit(e) {
	e.preventDefault();

	const form = e.target;
	const subgoalInputs = form.querySelectorAll('input[name="subgoals[]"]');
	const subgoals = Array.from(subgoalInputs)
		.map(input => input.value.trim())
		.filter(value => value.length > 0);

	const goalData = {
		name: form.querySelector('input[name="name"]').value,
		description: form.querySelector('textarea[name="description"]')?.value || '',
		deadline: form.querySelector('input[name="deadline"]')?.value || '',
		subgoals: subgoals
	};

	console.log('🔄 Creating custom goal:', goalData);
	createCustomGoal(goalData);
}

/**
 * Инициализирует управление подцелями
 */
function initSubgoalManagement() {
	safeAddEventListener('#add-subgoal', 'click', handleAddSubgoal);

	// Обработчик для кнопок удаления подцелей
	document.addEventListener('click', function (e) {
		if (e.target.closest('.remove-subgoal')) {
			const subgoalItem = e.target.closest('.subgoal-item');
			if (subgoalItem) {
				subgoalItem.remove();
			}
		}
	});
}

/**
 * Добавляет новую подцель
 */
function handleAddSubgoal() {
	const subgoalContainer = document.getElementById('subgoal-container');
	if (!subgoalContainer) {
		console.warn('Subgoal container not found');
		return;
	}

	const subgoalItem = document.createElement('div');
	subgoalItem.className = 'subgoal-item';
	subgoalItem.innerHTML = `
		<input type="text" name="subgoals[]" placeholder="Subtask" required />
		<button type="button" class="remove-subgoal"><i class="fa-solid fa-times"></i></button>
	`;

	subgoalContainer.appendChild(subgoalItem);
	console.log('✅ Subgoal added');
}

/**
 * Загружает шаблоны с сервера
 */
function loadTemplates() {
	console.log('🔄 Loading templates...');

	// Загружаем шаблоны привычек
	fetch('/api/get-habit-templates/')
		.then(response => response.json())
		.then(data => {
			const container = document.getElementById('habit-templates');
			if (container && data.templates) {
				container.innerHTML = `
					<div class="template-list">
						${data.templates.map(template => `
							<div class="template-item" data-template-id="${template.id}">
								<div class="template-icon" style="color: ${template.color}">
									<i class="${template.icon}"></i>
								</div>
								<div class="template-details">
									<h4>${template.name}</h4>
									<p>${template.description}</p>
								</div>
							</div>
						`).join('')}
					</div>
					<div class="template-actions">
						<button class="confirm-btn" id="confirm-habit-template" disabled>Create Habit</button>
						<button class="edit-btn" id="edit-habit-template" disabled>Edit</button>
					</div>
				`;
				console.log('✅ Habit templates loaded');

				// Добавляем обработчики событий для кнопок после загрузки
				const confirmBtn = document.getElementById('confirm-habit-template');
				const editBtn = document.getElementById('edit-habit-template');

				if (confirmBtn) {
					confirmBtn.addEventListener('click', handleHabitTemplateConfirm);
				}
				if (editBtn) {
					editBtn.addEventListener('click', handleHabitTemplateEdit);
				}
			}
		})
		.catch(error => console.error('Error loading habit templates:', error));

	// Загружаем шаблоны целей
	fetch('/api/get-goal-templates/')
		.then(response => response.json())
		.then(data => {
			const container = document.getElementById('goal-templates');
			if (container && data.templates) {
				container.innerHTML = `
					<div class="template-list">
						${data.templates.map(template => `
							<div class="template-item" data-template-id="${template.id}">
								<div class="template-icon" style="color: ${template.color}">
									<i class="${template.icon}"></i>
								</div>
								<div class="template-details">
									<h4>${template.name}</h4>
									<p>${template.description}</p>
								</div>
							</div>
						`).join('')}
					</div>
					<div class="template-actions">
						<button class="confirm-btn" id="confirm-goal-template" disabled>Create Goal</button>
						<button class="edit-btn" id="edit-goal-template" disabled>Edit</button>
					</div>
				`;
				console.log('✅ Goal templates loaded');

				// Добавляем обработчики событий для кнопок после загрузки
				const confirmBtn = document.getElementById('confirm-goal-template');
				const editBtn = document.getElementById('edit-goal-template');

				if (confirmBtn) {
					confirmBtn.addEventListener('click', handleGoalTemplateConfirm);
				}
				if (editBtn) {
					editBtn.addEventListener('click', handleGoalTemplateEdit);
				}
			}
		})
		.catch(error => console.error('Error loading goal templates:', error));
}

/**
 * Использует шаблон привычки
 */
function useHabitTemplate(templateId) {
	fetch('/api/use-habit-template/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify({ template_id: templateId })
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				closeCreateModal();
				showNotification('Habit created successfully!', 'success');
				setTimeout(() => window.location.reload(), 1000);
			} else {
				showNotification('Error creating habit: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('An error occurred while creating habit', 'error');
		});
}

/**
 * Использует шаблон цели
 */
function useGoalTemplate(templateId) {
	fetch('/api/use-goal-template/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify({ template_id: templateId })
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'success') {
				closeCreateModal();
				showNotification('Goal created successfully!', 'success');
				setTimeout(() => window.location.reload(), 1000);
			} else {
				showNotification('Error creating goal: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('An error occurred while creating goal', 'error');
		});
}

/**
 * Создает пользовательскую привычку
 */
function createCustomHabit(habitData) {
	fetch('/api/create-custom-habit/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify(habitData)
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'ok') {
				closeCreateModal();
				showNotification('Custom habit created successfully!', 'success');
				setTimeout(() => window.location.reload(), 1000);
			} else {
				showNotification('Error creating habit: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('An error occurred while creating habit', 'error');
		});
}

/**
 * Создает пользовательскую цель
 */
function createCustomGoal(goalData) {
	fetch('/api/create-custom-goal/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCSRFToken()
		},
		body: JSON.stringify(goalData)
	})
		.then(response => response.json())
		.then(data => {
			if (data.status === 'ok') {
				closeCreateModal();
				showNotification('Custom goal created successfully!', 'success');
				setTimeout(() => window.location.reload(), 1000);
			} else {
				showNotification('Error creating goal: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showNotification('An error occurred while creating goal', 'error');
		});
}