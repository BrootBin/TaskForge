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
		showMessage('Please log in to create goals and habits', 'info');
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
		console.log('🔘 Setting modal display to block');
		modal.style.display = 'block';
		console.log('🔘 Modal should now be visible');

		// Загружаем шаблоны если их еще нет
		loadTemplates();
	} else {
		console.error('❌ Create modal not found in DOM!');
		console.log('🔍 Current page:', window.location.pathname);

		// Попробуем найти любые модальные окна
		const allModals = document.querySelectorAll('[id*="modal"]');
		console.log('🔍 Found modals:', Array.from(allModals).map(m => m.id));

		// Если модального окна нет, покажем уведомление
		showMessage('Create modal not available on this page. Try going to the home page.', 'info');

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
		modal.style.display = 'none';
		console.log('✅ Create modal closed');
	}
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
}

/**
 * Обрабатывает выбор шаблона
 */
function handleTemplateSelection(templateItem, type) {
	const containerId = type === 'habit' ? '#habit-templates' : '#goal-templates';
	const confirmBtnId = type === 'habit' ? '#confirm-habit-template' : '#confirm-goal-template';

	// Снимаем выделение со всех элементов
	document.querySelectorAll(`${containerId} .template-item`).forEach(item => {
		item.classList.remove('selected');
	});

	// Добавляем выделение к выбранному элементу
	templateItem.classList.add('selected');

	// Активируем кнопку подтверждения
	const confirmBtn = document.querySelector(confirmBtnId);
	if (confirmBtn) {
		confirmBtn.disabled = false;
	}

	console.log(`✅ ${type} template selected:`, templateItem.dataset.templateId);
}

/**
 * Обрабатывает подтверждение шаблона привычки
 */
function handleHabitTemplateConfirm() {
	const selectedTemplate = document.querySelector('#habit-templates .template-item.selected');
	if (!selectedTemplate) {
		showMessage('Please select a habit template first', 'warning');
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
		showMessage('Please select a goal template first', 'warning');
		return;
	}

	const templateId = selectedTemplate.dataset.templateId;
	console.log('🔄 Using goal template:', templateId);
	useGoalTemplate(templateId);
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
		frequency: form.querySelector('select[name="frequency"]').value,
		icon: form.querySelector('select[name="icon"]').value || 'fas fa-check',
		color: form.querySelector('input[name="color"]').value || '#007bff'
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
	const goalData = {
		name: form.querySelector('input[name="name"]').value,
		description: form.querySelector('textarea[name="description"]').value,
		icon: form.querySelector('select[name="icon"]').value || 'fas fa-target',
		color: form.querySelector('input[name="color"]').value || '#28a745',
		subgoals: Array.from(form.querySelectorAll('.subgoal-input')).map(input => input.value).filter(value => value.trim())
	};

	console.log('🔄 Creating custom goal:', goalData);
	createCustomGoal(goalData);
}

/**
 * Инициализирует управление подцелями
 */
function initSubgoalManagement() {
	safeAddEventListener('#add-subgoal', 'click', handleAddSubgoal);
}

/**
 * Добавляет новую подцель
 */
function handleAddSubgoal() {
	const subgoalsContainer = document.querySelector('.subgoals-container');
	if (!subgoalsContainer) {
		console.warn('Subgoals container not found');
		return;
	}

	const subgoalGroup = document.createElement('div');
	subgoalGroup.className = 'subgoal-group';
	subgoalGroup.innerHTML = `
		<input type="text" class="subgoal-input" placeholder="Enter subgoal" required>
		<button type="button" class="remove-subgoal">
			<i class="fas fa-times"></i>
		</button>
	`;

	subgoalsContainer.appendChild(subgoalGroup);

	// Добавляем обработчик для кнопки удаления
	const removeBtn = subgoalGroup.querySelector('.remove-subgoal');
	if (removeBtn) {
		removeBtn.addEventListener('click', function () {
			subgoalGroup.remove();
		});
	}

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
				container.innerHTML = data.templates.map(template => `
					<div class="template-item" data-template-id="${template.id}">
						<div class="template-icon" style="color: ${template.color}">
							<i class="${template.icon}"></i>
						</div>
						<div class="template-details">
							<h4>${template.name}</h4>
							<p>${template.description}</p>
						</div>
					</div>
				`).join('');
				console.log('✅ Habit templates loaded');
			}
		})
		.catch(error => console.error('Error loading habit templates:', error));

	// Загружаем шаблоны целей
	fetch('/api/get-goal-templates/')
		.then(response => response.json())
		.then(data => {
			const container = document.getElementById('goal-templates');
			if (container && data.templates) {
				container.innerHTML = data.templates.map(template => `
					<div class="template-item" data-template-id="${template.id}">
						<div class="template-icon" style="color: ${template.color}">
							<i class="${template.icon}"></i>
						</div>
						<div class="template-details">
							<h4>${template.name}</h4>
							<p>${template.description}</p>
						</div>
					</div>
				`).join('');
				console.log('✅ Goal templates loaded');
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
			if (data.status === 'ok') {
				closeCreateModal();
				showMessage('Habit created successfully!', 'success');
				setTimeout(() => window.location.reload(), 1000);
			} else {
				showMessage('Error creating habit: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while creating habit', 'error');
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
			if (data.status === 'ok') {
				closeCreateModal();
				showMessage('Goal created successfully!', 'success');
				setTimeout(() => window.location.reload(), 1000);
			} else {
				showMessage('Error creating goal: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while creating goal', 'error');
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
				showMessage('Custom habit created successfully!', 'success');
				setTimeout(() => window.location.reload(), 1000);
			} else {
				showMessage('Error creating habit: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while creating habit', 'error');
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
				showMessage('Custom goal created successfully!', 'success');
				setTimeout(() => window.location.reload(), 1000);
			} else {
				showMessage('Error creating goal: ' + data.message, 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred while creating goal', 'error');
		});
}