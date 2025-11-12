/**
 * Authentication modal component for TaskForge
 * Handles login, registration and 2FA modals
 */
console.log('Auth modal component initialized');

/**
 * Инициализирует модальные окна авторизации
 */
function initAuthModals() {
	console.log('🔧 Initializing auth modals...');

	// Инициализируем обработчики модального окна
	initAuthModalHandlers();

	// Инициализируем обработчики форм
	initLoginForm();
	initRegisterForm();
	initTelegramSettings();

	// Инициализируем обработчики уведомлений
	initNotificationsHandlers();

	console.log('✅ Auth modals initialized');
}

/**
 * Инициализирует обработчики модального окна авторизации
 */
function initAuthModalHandlers() {
	console.log('🔧 Initializing auth modal handlers...');

	const authModal = document.getElementById("auth-modal");
	const profileBtn = document.getElementById("profile-btn");
	const closeAuth = authModal ? authModal.querySelector(".close") : null;

	console.log('🔧 Auth modal elements found:', {
		authModal: !!authModal,
		profileBtn: !!profileBtn,
		closeAuth: !!closeAuth
	});

	// Обработчики кнопок авторизации
	const authButtons = document.querySelectorAll(".auth-button");
	authButtons.forEach(button => {
		button.addEventListener("click", function () {
			console.log('🔧 Auth button clicked');
			if (authModal) {
				showModal(authModal);
			}
		});
	});

	// Обработчик кнопки профиля - ВСЕГДА показывает модал
	if (profileBtn) {
		profileBtn.addEventListener("click", function () {
			console.log('🔧 Profile button clicked - showing auth modal');
			if (authModal) {
				showModal(authModal);
			}
		});
	}

	// Обработчики закрытия модального окна
	if (closeAuth) {
		closeAuth.addEventListener("click", function () {
			console.log('🔧 Close auth modal clicked');
			if (authModal) {
				hideModal(authModal);
			}
		});
	}

	// Закрытие модального окна при клике поза ним
	if (authModal) {
		authModal.addEventListener("click", function (event) {
			if (event.target === authModal) {
				console.log('🔧 Auth modal overlay clicked');
				hideModal(authModal);
			}
		});
	}

	// Обработчики переключения между формами
	const signUpBtn = document.getElementById("sign-up-btn");
	const signInBtn = document.getElementById("sign-in-btn");
	const showRegister = document.getElementById("show-register");
	const showLogin = document.getElementById("show-login");

	if (signUpBtn) {
		signUpBtn.addEventListener("click", function () {
			showRegisterForm();
		});
	}

	if (signInBtn) {
		signInBtn.addEventListener("click", function () {
			showLoginForm();
		});
	}

	if (showRegister) {
		showRegister.addEventListener("click", function (e) {
			e.preventDefault();
			showRegisterForm();
		});
	}

	if (showLogin) {
		showLogin.addEventListener("click", function (e) {
			e.preventDefault();
			showLoginForm();
		});
	}

	console.log('✅ Auth modal handlers initialized');
}

/**
 * Инициализирует форму входа
 */
function initLoginForm() {
	const loginForm = document.getElementById('login-form');
	if (loginForm) {
		loginForm.addEventListener('submit', function (e) {
			e.preventDefault();
			handleLoginSubmit(this);
		});
		console.log('✅ Login form initialized');
	}
}

/**
 * Инициализирует форму регистрации
 */
function initRegisterForm() {
	const registerForm = document.getElementById('register-form');
	if (registerForm) {
		registerForm.addEventListener('submit', function (e) {
			e.preventDefault();
			handleRegisterSubmit(this);
		});
		console.log('✅ Register form initialized');
	}
}

/**
 * Обрабатывает отправку формы входа
 * @param {HTMLFormElement} form - Форма входа
 */
function handleLoginSubmit(form) {
	console.log('🔐 Login form submitted');

	const formData = new FormData(form);
	const username = formData.get('username');
	const password = formData.get('password');

	if (!username || !password) {
		showMessage('Please fill in all fields', 'error');
		return;
	}

	// Отправляем данные на сервер
	fetch('/login/', {
		method: 'POST',
		headers: {
			'X-CSRFToken': getCSRFToken(),
			'X-Requested-With': 'XMLHttpRequest', // Указываем, что это AJAX запрос
			'Accept': 'application/json', // Указываем, что ожидаем JSON
		},
		body: formData
	})
		.then(response => {
			console.log('📡 Login response status:', response.status);
			// Проверяем Content-Type ответа
			const contentType = response.headers.get('content-type');
			if (contentType && contentType.includes('application/json')) {
				return response.json();
			} else {
				return response.text();
			}
		})
		.then(data => {
			console.log('📡 Login response data:', data);

			// Если ответ в формате JSON
			if (typeof data === 'object') {
				if (data.success) {
					showMessage(data.message || 'Login successful!', 'success');
					hideModal('auth-modal');
					setTimeout(() => {
						window.location.reload();
					}, 1000);
				} else {
					showMessage(data.error || 'Login failed', 'error');
				}
				return;
			}

			// Если ответ в формате HTML (для 2FA)
			if (data.includes('twofa-modal') || data.includes('show2faUser')) {
				// Парсим username из ответа для 2FA
				const match = data.match(/show2faUser\s*=\s*["']([^"']+)["']/);
				if (match) {
					window.show2faUser = match[1];
					hideModal('auth-modal'); // Закрываем окно логина
					show2FAModal(); // Показываем 2FA
					startPollingForAuth(window.show2faUser);
				}
			} else if (data.includes('error') || data.includes('Invalid') || data.includes('incorrect')) {
				showMessage('Invalid username or password', 'error');
			} else {
				// Успешный вход без 2FA (если не JSON)
				showMessage('Login successful!', 'success');
				hideModal('auth-modal');
				setTimeout(() => {
					window.location.reload();
				}, 1000);
			}
		})
		.catch(error => {
			console.error('❌ Login error:', error);
			showMessage('An error occurred during login', 'error');
		});
}

/**
 * Обрабатывает отправку формы регистрации
 * @param {HTMLFormElement} form - Форма регистрации
 */
function handleRegisterSubmit(form) {
	console.log('🔐 Register form submitted');

	const formData = new FormData(form);
	const username = formData.get('username');
	const password = formData.get('password');
	const confirm = formData.get('confirm');

	console.log('🔐 Form data:', { username, password: !!password, confirm: !!confirm });

	// Базовые проверки
	if (!username || !password || !confirm) {
		showMessage('Please fill in all fields', 'error');
		return;
	}

	if (password !== confirm) {
		showMessage('Passwords do not match', 'error');
		return;
	}

	// Отправляем данные на сервер
	fetch('/register/', {
		method: 'POST',
		headers: {
			'X-CSRFToken': getCSRFToken(),
			'X-Requested-With': 'XMLHttpRequest', // Указываем, что это AJAX запрос
			'Accept': 'application/json', // Указываем, что ожидаем JSON
		},
		body: formData
	})
		.then(response => {
			console.log('📡 Registration response status:', response.status);
			// Проверяем Content-Type ответа
			const contentType = response.headers.get('content-type');
			if (contentType && contentType.includes('application/json')) {
				return response.json();
			} else {
				return response.text();
			}
		})
		.then(data => {
			console.log('📡 Registration response data:', data);

			// Если ответ в формате JSON
			if (typeof data === 'object') {
				if (data.success) {
					showMessage(data.message || 'Registration successful! You are now logged in.', 'success');
					hideModal('auth-modal');
					setTimeout(() => {
						window.location.reload();
					}, 1500);
				} else {
					showMessage(data.error || 'Registration failed', 'error');
				}
				return;
			}

			// Если ответ в формате HTML (старая логика)
			if (data.includes('error') || data.includes('taken') || data.includes('match')) {
				let errorMessage = 'Registration failed. Please try again.';
				if (data.includes('taken')) {
					errorMessage = 'Username already taken. Please choose another one.';
				} else if (data.includes('match')) {
					errorMessage = 'Passwords do not match.';
				}
				showMessage(errorMessage, 'error');
			} else {
				showMessage('Registration successful! You are now logged in.', 'success');
				hideModal('auth-modal');
				setTimeout(() => {
					window.location.reload();
				}, 1500);
			}
		})
		.catch(error => {
			console.error('❌ Registration error:', error);
			showMessage('An error occurred during registration. Please try again.', 'error');
		});
}/**
 * Инициализирует настройки Telegram
 */
function initTelegramSettings() {
	// Проверяем, не инициализировано ли уже
	if (window._telegramSettingsInitialized) {
		console.log('🔄 Telegram settings already initialized, skipping...');
		// Только обновляем статус
		checkAndUpdateTelegramStatus();
		return;
	}

	console.log('🔧 Initializing Telegram settings...');
	window._telegramSettingsInitialized = true;

	// Сначала проверяем текущий статус
	checkAndUpdateTelegramStatus();

	// Telegram уведомления
	const tgNotifySwitch = document.getElementById('tg-notify-switch');
	if (tgNotifySwitch) {
		// Удаляем старые обработчики перед добавлением новых
		tgNotifySwitch.removeEventListener('change', tgNotifySwitch._telegramHandler);

		// Создаем новый обработчик и сохраняем ссылку на него
		tgNotifySwitch._telegramHandler = function () {
			console.log('🔔 Telegram notify toggle changed:', this.checked);
			toggleTelegramNotifications(this.checked);
		};

		tgNotifySwitch.addEventListener('change', tgNotifySwitch._telegramHandler);
	}

	// Telegram 2FA
	const tg2faSwitch = document.getElementById('tg-2fa-switch');
	if (tg2faSwitch) {
		// Удаляем старые обработчики перед добавлением новых
		tg2faSwitch.removeEventListener('change', tg2faSwitch._telegramHandler);

		// Создаем новый обработчик и сохраняем ссылку на него
		tg2faSwitch._telegramHandler = function () {
			console.log('🔐 Telegram 2FA toggle changed:', this.checked);
			toggleTelegram2FA(this.checked);
		};

		tg2faSwitch.addEventListener('change', tg2faSwitch._telegramHandler);
	}
}

/**
 * Запускает периодическую проверку для непривязанных аккаунтов
 */
function startTelegramStatusPolling() {
	const pollInterval = setInterval(() => {
		fetch('/api/check_telegram_status/')
			.then(response => response.json())
			.then(data => {
				if (data.connected) {
					// Если подключился, обновляем статус и останавливаем опрос
					console.log('🎉 Telegram connected! Stopping polling...');
					checkAndUpdateTelegramStatus();
					clearInterval(pollInterval);
				}
			})
			.catch(error => {
				console.error('❌ Error during polling:', error);
			});
	}, 3000); // Проверяем каждые 3 секунды

	console.log('🔄 Started Telegram status polling for unconnected accounts');

	// Останавливаем опрос через 5 минут для экономии ресурсов
	setTimeout(() => {
		clearInterval(pollInterval);
		console.log('⏰ Stopped Telegram polling after 5 minutes');
	}, 5 * 60 * 1000);
}

/**
 * Переключает уведомления Telegram
 * @param {boolean} enabled - Включить или выключить
 */
function toggleTelegramNotifications(enabled) {
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
			if (data.status === 'success') {
				showMessage(`Telegram notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
			} else {
				showMessage('Failed to update Telegram notifications', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred', 'error');
		});
}

/**
 * Переключает 2FA в Telegram
 * @param {boolean} enabled - Включить или выключить
 */
function toggleTelegram2FA(enabled) {
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
			if (data.status === 'success') {
				showMessage(`Telegram 2FA ${enabled ? 'enabled' : 'disabled'}`, 'success');
			} else {
				showMessage('Failed to update Telegram 2FA', 'error');
			}
		})
		.catch(error => {
			console.error('Error:', error);
			showMessage('An error occurred', 'error');
		});
}

/**
 * Показывает форму входа
 */
function showLoginForm() {
	console.log('🔐 Showing login form');
	showModal('auth-modal');

	// Переключаемся на вкладку входа
	const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
	const registerTab = document.querySelector('.tab-btn[data-tab="register"]');
	const loginForm = document.getElementById('login-form');
	const registerForm = document.getElementById('register-form');

	if (loginTab && registerTab) {
		loginTab.classList.add('active');
		registerTab.classList.remove('active');
	}

	if (loginForm && registerForm) {
		loginForm.style.display = 'block';
		registerForm.style.display = 'none';
	}
}

/**
 * Показывает форму регистрации
 */
function showRegisterForm() {
	console.log('🔐 Showing register form');
	showModal('auth-modal');

	// Переключаемся на вкладку регистрации
	const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
	const registerTab = document.querySelector('.tab-btn[data-tab="register"]');
	const loginForm = document.getElementById('login-form');
	const registerForm = document.getElementById('register-form');

	if (loginTab && registerTab) {
		loginTab.classList.remove('active');
		registerTab.classList.add('active');
	}

	if (loginForm && registerForm) {
		loginForm.style.display = 'none';
		registerForm.style.display = 'block';
	}
}

/**
 * Глобальная функция для открытия модала авторизации
 */
window.openAuthModal = function () {
	console.log('🔐 Opening auth modal globally');
	showModal('auth-modal');
	showLoginForm(); // По умолчанию показываем форму входа
};

/**
 * Глобальная функция для открытия формы регистрации
 */
window.openRegisterModal = function () {
	console.log('🔐 Opening register modal globally');
	showModal('auth-modal');
	showRegisterForm();
};

/**
 * Инициализирует обработчики уведомлений
 * Обработка перенесена в dropdown-modal.js
 */
function initNotificationsHandlers() {
	console.log('� Notifications handlers moved to dropdown-modal.js');
}


/**
 * Проверяет и обновляет статус Telegram подключения
 */
function checkAndUpdateTelegramStatus() {
	console.log('🔍 Checking Telegram status...');

	fetch('/api/check_telegram_status/')
		.then(response => response.json())
		.then(data => {
			console.log('📡 Telegram status:', data);

			// Обновляем переключатели
			const tgNotifyToggle = document.getElementById('tg-notify-switch');
			const tg2faToggle = document.getElementById('tg-2fa-switch');

			console.log('🔍 Toggle elements found:', {
				notify: !!tgNotifyToggle,
				twoFA: !!tg2faToggle
			});

			// Обновляем текст подключения
			const tgCodeBlock = document.querySelector('.tg-code-block');
			if (tgCodeBlock) {
				if (data.connected) {
					tgCodeBlock.innerHTML = '<p>✅ Your Telegram account has been successfully linked!</p>';
					console.log('📝 Updated connection text: Connected');
				} else if (data.bind_code) {
					tgCodeBlock.innerHTML = `
						<p>This is your key: <strong>${data.bind_code}</strong></p>
						<p>Send this key to our bot, to connect your account.</p>
					`;
					console.log('📝 Updated connection text: Bind code shown');
				} else {
					tgCodeBlock.innerHTML = '<p>No key available.<br>Try again later or contact our admins.</p>';
					console.log('📝 Updated connection text: No key');
				}
			}

			// Обновляем состояния переключателей и их label элементов
			const tgNotifyLabel = tgNotifyToggle ? tgNotifyToggle.closest('label') : null;
			const tg2faLabel = tg2faToggle ? tg2faToggle.closest('label') : null;

			if (tgNotifyToggle) {
				console.log('🔔 Before update - Notify:', {
					checked: tgNotifyToggle.checked,
					disabled: tgNotifyToggle.disabled
				});

				tgNotifyToggle.checked = data.notify_enabled;
				tgNotifyToggle.disabled = !data.connected;

				// Обновляем label и slider
				if (tgNotifyLabel) {
					const slider = tgNotifyLabel.querySelector('.slider');
					if (data.connected) {
						tgNotifyLabel.removeAttribute('title');
						if (slider) slider.classList.remove('disabled');
					} else {
						tgNotifyLabel.setAttribute('title', 'At least you need to connect to Telegram');
						if (slider) slider.classList.add('disabled');
					}
				}

				console.log('🔔 After update - Notify:', {
					checked: tgNotifyToggle.checked,
					disabled: tgNotifyToggle.disabled,
					expected: data.notify_enabled
				});
			} else {
				console.warn('⚠️ Notify toggle element not found!');
			}

			if (tg2faToggle) {
				console.log('🔐 Before update - 2FA:', {
					checked: tg2faToggle.checked,
					disabled: tg2faToggle.disabled
				});

				tg2faToggle.checked = data.two_factor_enabled;
				tg2faToggle.disabled = !data.connected;

				// Обновляем label и slider
				if (tg2faLabel) {
					const slider = tg2faLabel.querySelector('.slider');
					if (data.connected) {
						tg2faLabel.removeAttribute('title');
						if (slider) slider.classList.remove('disabled');
					} else {
						tg2faLabel.setAttribute('title', 'At least you need to connect to Telegram');
						if (slider) slider.classList.add('disabled');
					}
				}

				console.log('🔐 After update - 2FA:', {
					checked: tg2faToggle.checked,
					disabled: tg2faToggle.disabled,
					expected: data.two_factor_enabled
				});
			} else {
				console.warn('⚠️ 2FA toggle element not found!');
			}

			// Обновляем bind code если нужно
			const bindCodeElement = document.querySelector('[data-bind-code]');
			if (bindCodeElement && data.bind_code) {
				bindCodeElement.textContent = data.bind_code;
				bindCodeElement.setAttribute('data-bind-code', data.bind_code);
			}

			console.log('✅ Telegram status updated successfully');
		})
		.catch(error => {
			console.error('❌ Error checking Telegram status:', error);
		});
}