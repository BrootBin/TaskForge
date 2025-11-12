/**
 * Модуль для работы с модальным окном технической поддержки
 */

// Инициализация модуля поддержки
function initSupportModal() {
	console.log('Support modal component initialized');

	// Обработчик клика на плавающую кнопку поддержки
	const supportFab = document.getElementById('support-fab');
	if (supportFab) {
		supportFab.addEventListener('click', function (e) {
			e.preventDefault();
			console.log('Support FAB clicked');

			// Убираем пульсацию при клике
			supportFab.classList.remove('pulse');

			// Убираем badge при первом клике
			const badge = document.getElementById('support-badge');
			if (badge) {
				badge.style.display = 'none';
				localStorage.setItem('support-badge-hidden', 'true');
			}

			openSupportModal();
		});

		// Добавляем анимацию появления кнопки
		setTimeout(() => {
			supportFab.classList.add('fade-in');

			// Проверяем, нужно ли показывать badge
			const badgeHidden = localStorage.getItem('support-badge-hidden');
			const badge = document.getElementById('support-badge');
			if (badgeHidden === 'true' && badge) {
				badge.style.display = 'none';
			}

			// Добавляем пульсацию через 2 секунды после появления
			setTimeout(() => {
				supportFab.classList.add('pulse');

				// Убираем пульсацию через 10 секунд
				setTimeout(() => {
					supportFab.classList.remove('pulse');
				}, 10000);
			}, 2000);
		}, 1000); // Показываем кнопку через секунду после загрузки страницы
	}

	// Обработчик клика на "Need help?" в 2FA модальном окне
	const helpLink = document.getElementById('2fa-help');
	if (helpLink) {
		helpLink.addEventListener('click', function (e) {
			e.preventDefault();
			console.log('2FA help link clicked');
			openSupportModal('2fa_problem');
		});
	}

	// Обработчики кнопок помощи в модалке авторизации
	const authHelpLogin = document.getElementById('auth-help-login');
	if (authHelpLogin) {
		authHelpLogin.addEventListener('click', function (e) {
			e.preventDefault();
			console.log('Auth help login clicked');
			openSupportModal('login_problem');
		});
	}

	const authHelpRegister = document.getElementById('auth-help-register');
	if (authHelpRegister) {
		authHelpRegister.addEventListener('click', function (e) {
			e.preventDefault();
			console.log('Auth help register clicked');
			openSupportModal('login_problem'); // Используем ту же категорию
		});
	}

	// Обработчики для закрытия модального окна
	const closeBtn = document.getElementById('close-support-modal');
	const cancelBtn = document.getElementById('cancel-support');
	const modal = document.getElementById('support-modal');

	if (closeBtn) {
		closeBtn.addEventListener('click', closeSupportModal);
	}

	if (cancelBtn) {
		cancelBtn.addEventListener('click', closeSupportModal);
	}


	// Обработчик изменения категории
	const categorySelect = document.getElementById('support-category');
	if (categorySelect) {
		categorySelect.addEventListener('change', updateDynamicFields);
	}

	// Обработчик отправки формы
	const form = document.getElementById('support-form');
	if (form) {
		form.addEventListener('submit', handleSupportFormSubmit);
	}

	// Счетчик символов для textarea
	const messageField = document.getElementById('support-message');
	const counter = document.getElementById('message-counter');

	if (messageField && counter) {
		messageField.addEventListener('input', function () {
			const length = this.value.length;
			counter.textContent = length;

			// Меняем цвет при приближении к лимиту
			if (length > 1800) {
				counter.style.color = 'var(--error)';
			} else if (length > 1500) {
				counter.style.color = 'var(--warning)';
			} else {
				counter.style.color = 'var(--text-secondary)';
			}
		});
	}
}

/**
 * Обновляет динамические поля в зависимости от выбранной категории
 */
function updateDynamicFields() {
	const category = document.getElementById('support-category').value;
	const dynamicFieldsContainer = document.getElementById('dynamic-fields');

	if (!dynamicFieldsContainer) return;

	// Clear container
	dynamicFieldsContainer.innerHTML = '';

	if (!category) return;

	let fieldsHTML = '';

	switch (category) {
		case '2fa_problem':
			fieldsHTML = `
				<div class="form-row">
					<div class="form-group">
						<label for="username">Username*</label>
						<input type="text" id="username" name="username" required 
							   placeholder="Your username in the system">
					</div>
					<div class="form-group">
						<label for="last_login">When did you last log in?</label>
						<input type="text" id="last_login" name="last_login" 
							   placeholder="e.g.: yesterday, 3 days ago">
					</div>
				</div>
				<div class="form-group">
					<label for="error_message">Error message (if any)</label>
					<input type="text" id="error_message" name="error_message" 
						   placeholder="Copy the exact error text">
				</div>
			`;
			break;

		case 'login_problem':
			fieldsHTML = `
				<div class="form-row">
					<div class="form-group">
						<label for="username">Username or email*</label>
						<input type="text" id="username" name="username" required 
							   placeholder="Your username or email">
					</div>
					<div class="form-group">
						<label for="last_login">When did you last log in?</label>
						<input type="text" id="last_login" name="last_login" 
							   placeholder="e.g.: a week ago">
					</div>
				</div>
				<div class="form-group">
					<label for="error_message">What happens when you try to log in?</label>
					<input type="text" id="error_message" name="error_message" 
						   placeholder="Describe what you see on screen">
				</div>
				<div class="form-group">
					<label for="email">Contact email (for response)*</label>
					<input type="email" id="email" name="email" required 
						   placeholder="your.email@example.com">
					<small class="form-help">We'll use this email to send you the solution</small>
				</div>
				<div class="form-note">
					<p><strong>Password Recovery:</strong> If you have Telegram connected, you can reset your password using the command <code>/reset_password</code> in our bot.</p>
				</div>
			`;
			break;

		case 'telegram_problem':
			fieldsHTML = `
				<div class="form-row">
					<div class="form-group">
						<label for="username">TaskForge username*</label>
						<input type="text" id="username" name="username" required 
							   placeholder="Your username">
					</div>
					<div class="form-group">
						<label for="device_info">Telegram device</label>
						<input type="text" id="device_info" name="device_info" 
							   placeholder="iPhone, Android, Desktop">
					</div>
				</div>
			`;
			break;

		case 'technical_issue':
			fieldsHTML = `
				<div class="form-row">
					<div class="form-group">
						<label for="device_info">Device and browser</label>
						<input type="text" id="device_info" name="device_info" 
							   placeholder="Chrome on Windows, Safari on Mac">
					</div>
					<div class="form-group">
						<label for="error_message">Error message</label>
						<input type="text" id="error_message" name="error_message" 
							   placeholder="Copy the error text">
					</div>
				</div>
				<div class="form-group">
					<label for="email">Contact email (for response)*</label>
					<input type="email" id="email" name="email" required 
						   placeholder="your.email@example.com">
					<small class="form-help">We'll use this email to send you the solution</small>
				</div>
			`;
			break;

		case 'feature_request':
			fieldsHTML = `
				<div class="form-group">
					<label for="email">Contact email (for updates)*</label>
					<input type="email" id="email" name="email" required 
						   placeholder="your.email@example.com">
					<small class="form-help">We'll notify you about the feature development</small>
				</div>
				<div class="form-group">
					<p><strong>Describe your desired feature in the "Problem Description" field below</strong></p>
				</div>
			`;
			break;
	}

	dynamicFieldsContainer.innerHTML = fieldsHTML;
}

/**
 * Открывает модальное окно поддержки
 * @param {string} problemType - Тип проблемы для предзаполнения
 */
function openSupportModal(problemType = '') {
	console.log('Opening support modal with problem type:', problemType);

	// Закрываем авторизационную модалку, если она открыта
	const authModal = document.getElementById('auth-modal');
	if (authModal && authModal.classList.contains('active')) {
		authModal.classList.remove('active');
		console.log('Closed auth modal to show support modal');
	}

	const modal = document.getElementById('support-modal');
	const categorySelect = document.getElementById('support-category');

	if (modal) {
		modal.classList.add('show');
		modal.style.display = 'flex';

		// Предзаполняем категорию в зависимости от типа проблемы
		if (categorySelect && problemType) {
			categorySelect.value = problemType;
			updateDynamicFields(); // Обновляем поля сразу
		}

		// Фокус на первое поле
		const firstField = categorySelect || document.getElementById('support-message');
		if (firstField) {
			setTimeout(() => firstField.focus(), 100);
		}
	}
}

/**
 * Закрывает модальное окно поддержки
 */
function closeSupportModal() {
	console.log('Closing support modal');

	const modal = document.getElementById('support-modal');
	if (modal) {
		modal.classList.remove('show');
		modal.style.display = 'none';

		// Сбрасываем форму
		const form = document.getElementById('support-form');
		if (form) {
			form.reset();

			// Сбрасываем счетчик символов
			const counter = document.getElementById('message-counter');
			if (counter) {
				counter.textContent = '0';
				counter.style.color = 'var(--text-secondary)';
			}
		}
	}
}

/**
 * Обрабатывает отправку формы поддержки
 */
async function handleSupportFormSubmit(e) {
	e.preventDefault();
	console.log('Support form submitted');

	const form = e.target;
	const submitBtn = document.getElementById('submit-support');
	const categorySelect = document.getElementById('support-category');
	const messageField = document.getElementById('support-message');

	// Validation of main fields
	if (!categorySelect.value.trim()) {
		showSupportMessage('Please select a problem category', 'error');
		categorySelect.focus();
		return;
	}

	if (!messageField.value.trim()) {
		showSupportMessage('Please describe your problem', 'error');
		messageField.focus();
		return;
	}

	if (messageField.value.length > 2000) {
		showSupportMessage('Message too long (maximum 2000 characters)', 'error');
		messageField.focus();
		return;
	}

	// Check required fields for each category
	const category = categorySelect.value;
	const username = document.getElementById('username')?.value || '';
	const email = document.getElementById('email')?.value || '';

	if (category === '2fa_problem' && !username.trim()) {
		showSupportMessage('For 2FA problems, please provide your username', 'error');
		document.getElementById('username').focus();
		return;
	}

	if (category === 'login_problem' && !username.trim() && !email.trim()) {
		showSupportMessage('Please provide username or email to resolve login issues', 'error');
		document.getElementById('username').focus();
		return;
	}

	// For login_problem, technical_issue, and feature_request, email is required
	if ((category === 'login_problem' || category === 'technical_issue' || category === 'feature_request') && !email.trim()) {
		showSupportMessage(`Email is required for ${category.replace('_', ' ')} requests`, 'error');
		document.getElementById('email').focus();
		return;
	}

	if (category === 'telegram_problem' && !username.trim()) {
		showSupportMessage('For Telegram problems, please provide your username', 'error');
		document.getElementById('username').focus();
		return;
	}

	// Block submit button
	if (submitBtn) {
		submitBtn.disabled = true;
		submitBtn.textContent = 'Sending...';
	}

	try {
		// Собираем все данные формы
		const formData = {
			category: category,
			message: messageField.value,
			username: username,
			email: email,
			phone: document.getElementById('phone')?.value || '',
			device_info: document.getElementById('device_info')?.value || '',
			error_message: document.getElementById('error_message')?.value || '',
			last_login: document.getElementById('last_login')?.value || ''
		};

		const response = await fetch('/api/support/send-message/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCsrfToken()
			},
			body: JSON.stringify(formData)
		});

		const data = await response.json();

		if (data.status === 'success') {
			showSupportMessage(data.message, 'success');
			closeSupportModal();
		} else {
			showSupportMessage(data.message || 'An error occurred while sending the message', 'error');
		}

	} catch (error) {
		console.error('Error sending support message:', error);
		showSupportMessage('Network error occurred. Please try again later.', 'error');
	} finally {
		// Unlock button
		if (submitBtn) {
			submitBtn.disabled = false;
			submitBtn.textContent = 'Send';
		}
	}
}

/**
 * Показывает уведомление пользователю
 */
function showSupportMessage(message, type = 'info') {
	// Используем существующую систему уведомлений если она есть
	if (typeof showMessage === 'function') {
		showMessage(message, type);
	} else {
		// Простое уведомление через alert
		alert(message);
	}
}

/**
 * Получает CSRF токен
 */
function getCsrfToken() {
	const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
	if (csrfToken) {
		return csrfToken.value;
	}

	// Попытка получить из cookies
	const cookies = document.cookie.split(';');
	for (let cookie of cookies) {
		const [name, value] = cookie.trim().split('=');
		if (name === 'csrftoken') {
			return value;
		}
	}

	return '';
}

// Автоинициализация при загрузке DOM
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initSupportModal);
} else {
	initSupportModal();
}

// Экспорт функций для глобального использования
window.openSupportModal = openSupportModal;
window.closeSupportModal = closeSupportModal;