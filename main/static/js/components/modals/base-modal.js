/**
 * Base modal functionality for TaskForge
 * Provides common functions for all modal windows
 */
console.log('Base modal component initialized');

/**
 * Показывает модальное окно
 * @param {string|HTMLElement} modal - ID модального окна или DOM элемент
 */
function showModal(modal) {
	let modalElement;

	if (typeof modal === 'string') {
		modalElement = document.getElementById(modal);
		if (modalElement) {
			// Используем класс active для модалей, display для остальных
			if (modalElement.id === 'auth-modal' || modalElement.classList.contains('modal-2fa')) {
				modalElement.classList.add('active');

				// Если это auth-modal, обновляем статус Telegram
				if (modalElement.id === 'auth-modal' && typeof checkAndUpdateTelegramStatus === 'function') {
					setTimeout(() => {
						checkAndUpdateTelegramStatus();

						// Запускаем polling только если аккаунт не подключен
						if (typeof startTelegramStatusPolling === 'function') {
							fetch('/api/check_telegram_status/')
								.then(response => response.json())
								.then(data => {
									if (!data.connected) {
										startTelegramStatusPolling();
									}
								})
								.catch(error => console.error('❌ Error checking initial status:', error));
						}
					}, 100); // Небольшая задержка для полного открытия модала
				}
			} else {
				modalElement.style.display = 'block';
			}
			console.log(`✅ Modal ${modal} shown`);
		} else {
			console.warn(`⚠️ Modal ${modal} not found`);
		}
	} else if (modal && modal.nodeType === Node.ELEMENT_NODE) {
		// Это DOM элемент
		modalElement = modal;
		const modalId = modalElement.id || 'unknown';

		// Используем класс active для модалей, display для остальных
		if (modalElement.id === 'auth-modal' || modalElement.classList.contains('modal-2fa')) {
			modalElement.classList.add('active');

			// Если это auth-modal, обновляем статус Telegram
			if (modalElement.id === 'auth-modal' && typeof checkAndUpdateTelegramStatus === 'function') {
				setTimeout(() => {
					checkAndUpdateTelegramStatus();

					// Запускаем polling только если аккаунт не подключен
					if (typeof startTelegramStatusPolling === 'function') {
						fetch('/api/check_telegram_status/')
							.then(response => response.json())
							.then(data => {
								if (!data.connected) {
									startTelegramStatusPolling();
								}
							})
							.catch(error => console.error('❌ Error checking initial status:', error));
					}
				}, 100); // Небольшая задержка для полного открытия модала
			}
		} else {
			modalElement.style.display = 'block';
		}
		console.log(`✅ Modal ${modalId} shown`);
	} else {
		console.warn(`⚠️ Modal ${modal} not found`);
	}
}

/**
 * Скрывает модальное окно
 * @param {string|HTMLElement} modal - ID модального окна или DOM элемент
 */
function hideModal(modal) {
	let modalElement;

	if (typeof modal === 'string') {
		modalElement = document.getElementById(modal);
		if (modalElement) {
			// Используем класс active для модалей, display для остальных
			if (modalElement.id === 'auth-modal' || modalElement.classList.contains('modal-2fa')) {
				modalElement.classList.remove('active');
			} else {
				modalElement.style.display = 'none';
			}
			console.log(`✅ Modal ${modal} hidden`);
		}
	} else if (modal && modal.nodeType === Node.ELEMENT_NODE) {
		// Это DOM элемент
		modalElement = modal;
		const modalId = modalElement.id || 'unknown';

		// Используем класс active для модалей, display для остальных
		if (modalElement.id === 'auth-modal' || modalElement.classList.contains('modal-2fa')) {
			modalElement.classList.remove('active');
		} else {
			modalElement.style.display = 'none';
		}
		console.log(`✅ Modal ${modalId} hidden`);
	}
}/**
 * Переключает состояние модального окна
 * @param {string} modalId - ID модального окна
 */
function toggleModal(modalId) {
	const modal = document.getElementById(modalId);
	if (modal) {
		const isVisible = modal.style.display === 'block';
		modal.style.display = isVisible ? 'none' : 'block';
		console.log(`✅ Modal ${modalId} toggled to ${isVisible ? 'hidden' : 'shown'}`);
	}
}

/**
 * Инициализирует общие обработчики для всех модальных окон
 */
function initBaseModalHandlers() {
	console.log('🔧 Initializing base modal handlers...');

	// Закрытие по клику на overlay
	document.addEventListener('click', function (e) {
		if (e.target.classList.contains('modal') || e.target.classList.contains('modal-overlay')) {
			e.target.style.display = 'none';
			console.log('✅ Modal closed by overlay click');
		}
	});

	// Закрытие по кнопкам закрытия
	document.addEventListener('click', function (e) {
		if (e.target.classList.contains('close') || e.target.classList.contains('modal-close')) {
			const modal = e.target.closest('.modal');
			if (modal) {
				modal.style.display = 'none';
				console.log('✅ Modal closed by close button');
			}
		}
	});

	// Закрытие по Escape
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') {
			const openModals = document.querySelectorAll('.modal[style*="block"]');
			openModals.forEach(modal => {
				modal.style.display = 'none';
			});
			if (openModals.length > 0) {
				console.log('✅ Modals closed by Escape key');
			}
		}
	});

	console.log('✅ Base modal handlers initialized');
}

/**
 * Получает CSRF токен
 * @returns {string}
 */
function getCSRFToken() {
	const token = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
		document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
		getCookie('csrftoken');
	return token;
}

/**
 * Получает cookie по имени
 * @param {string} name - имя cookie
 * @returns {string|null}
 */
function getCookie(name) {
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

// Добавляем тестовую функцию для проверки истечения 2FA
window.test2FATimeout = async function () {
	console.log('🧪 Testing 2FA timeout functionality...');

	// Симулируем пользователя
	window.show2faUser = 'test_user';

	// Показываем 2FA модал с коротким таймером для теста
	if (typeof show2FAModal === 'function') {
		show2FAModal();

		// Устанавливаем короткий таймер для демонстрации (10 секунд)
		if (typeof countdownTime !== 'undefined') {
			countdownTime = 10;
		}

		console.log('✅ 2FA modal shown with 10-second timeout for testing');
		console.log('⏰ Wait 10 seconds to see timeout handling...');
	} else {
		console.error('❌ show2FAModal function not found');
	}
};

// Тестовая функция для симуляции отмены 2FA
window.test2FACancel = async function () {
	console.log('🧪 Testing 2FA cancel functionality...');

	if (typeof decline2FA === 'function') {
		window.show2faUser = 'test_user';
		await decline2FA();
		console.log('✅ 2FA cancel test completed');
	} else {
		console.error('❌ decline2FA function not found');
	}
};

// Тестовая функция для обновления Telegram сообщений
window.testTelegramUpdate = async function () {
	console.log('🧪 Testing Telegram message update...');

	try {
		const csrfToken = getCSRFToken();
		const response = await fetch('/api/test_telegram_update/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': csrfToken,
			},
			body: JSON.stringify({
				test_type: 'update_message',
				telegram_id: '123456789', // тестовый ID
				username: 'test_user',
				message_id: null // будет создано новое сообщение
			})
		});

		const result = await response.json();
		console.log('📱 Telegram update response:', result);

		if (result.status === 'success') {
			console.log('✅ Telegram update task started successfully');
			alert('✅ Telegram message update test started! Check console for details.');
		} else {
			console.error('❌ Telegram update failed:', result.message);
			alert('❌ Test failed: ' + result.message);
		}

	} catch (error) {
		console.error('❌ Error testing Telegram update:', error);
		alert('❌ Test error: ' + error.message);
	}
};

// Тестовая функция для проверки модала авторизации
window.testAuthModal = function () {
	console.log('🧪 Testing auth modal...');

	if (typeof window.openAuthModal === 'function') {
		window.openAuthModal();
		console.log('✅ Auth modal opened successfully');
	} else {
		console.error('❌ openAuthModal function not found');
		// Fallback
		if (typeof showModal === 'function') {
			showModal('auth-modal');
			console.log('✅ Auth modal opened via fallback');
		} else {
			console.error('❌ No modal functions available');
		}
	}
};

/**
 * Показывает уведомление
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип сообщения ('success', 'error', 'info', 'warning')
 * @param {number} duration - Длительность показа в миллисекундах
 */
function showMessage(message, type = 'info', duration = 3000) {
	console.log(`${type.toUpperCase()}: ${message}`);

	// Создаем элемент уведомления
	const notification = document.createElement('div');
	notification.className = `notification notification-${type}`;
	notification.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		padding: 15px 20px;
		background: ${getNotificationColor(type)};
		color: white;
		border-radius: 8px;
		z-index: 10000;
		box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		font-weight: 500;
		max-width: 400px;
		word-wrap: break-word;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	`;
	notification.textContent = message;

	document.body.appendChild(notification);

	// Автоматическое удаление
	setTimeout(() => {
		if (notification.parentNode) {
			notification.parentNode.removeChild(notification);
		}
	}, duration);
}

/**
 * Получает цвет для уведомления по типу
 * @param {string} type - Тип уведомления
 * @returns {string} Цвет в формате CSS
 */
function getNotificationColor(type) {
	const colors = {
		success: '#4CAF50',
		error: '#f44336',
		warning: '#ff9800',
		info: '#2196F3'
	};
	return colors[type] || colors.info;
}

/**
 * Проверяет аутентификацию пользователя
 * @returns {boolean} true если пользователь аутентифицирован
 */
function isAuthenticated() {
	// Проверяем несколько способов определения аутентификации
	const metaAuth = document.querySelector('meta[name="user-authenticated"]')?.content === 'true';
	const bodyAuth = document.body.classList.contains('authenticated');
	const userMenu = !!document.querySelector('.user-menu, .user-avatar, .logout-btn');
	const notLoginPage = window.location.pathname !== '/login/';

	// Проверяем есть ли элементы, которые указывают на аутентификацию
	const hasAuthElements = !!document.querySelector('[data-user], .user-profile, #user-menu');

	return metaAuth || bodyAuth || userMenu || hasAuthElements || notLoginPage;
}

/**
 * Безопасно добавляет event listener к элементу
 * @param {string} selector - CSS селектор элемента
 * @param {string} event - Тип события
 * @param {Function} handler - Обработчик события
 * @param {boolean} debug - Включить отладочные сообщения
 */
function safeAddEventListener(selector, event, handler, debug = false) {
	const element = document.querySelector(selector);
	if (debug) {
		console.log(`🔧 Looking for element: ${selector}, found:`, !!element);
	}
	if (element) {
		element.addEventListener(event, handler);
		if (debug) {
			console.log(`✅ Added ${event} listener to ${selector}`);
		}
	} else if (debug) {
		console.warn(`⚠️ Element not found: ${selector}`);
	}
	return !!element;
}