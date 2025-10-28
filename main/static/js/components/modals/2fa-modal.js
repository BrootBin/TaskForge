/**
 * 2FA modal component for TaskForge
 * Handles two-factor authentication modal window
 */
console.log('2FA modal component initialized');

// Глобальные переменные для 2FA
let authPollingInterval = null;
let countdownInterval = null;
let countdownTime = 300; // 5 минут в секундах

/**
 * Показывает модальное окно 2FA
 */
function show2FAModal() {
	console.log('🔄 show2FAModal called');
	const modal = document.getElementById('twofa-modal');
	if (modal) {
		console.log('🔄 Modal found, showing and initializing handlers');
		modal.classList.add('active');
		init2FAModalHandlers();
		startCountdownTimer();
	} else {
		console.error('❌ 2FA modal not found!');
	}
}

/**
 * Скрывает модальное окно 2FA
 */
function hide2FAModal() {
	const modal = document.getElementById('twofa-modal');
	if (modal) {
		modal.classList.remove('active');
		clearCountdownTimer();

		// Останавливаем polling если он активен
		if (authPollingInterval) {
			console.log('Stopping auth polling interval on modal hide');
			clearInterval(authPollingInterval);
			authPollingInterval = null;
		}
	}
}

/**
 * Инициализирует обработчики событий для модального окна 2FA
 */
function init2FAModalHandlers() {
	console.log('🔧 Initializing 2FA modal handlers...');

	const cancelBtn = document.getElementById('cancel-2fa');
	const helpLink = document.getElementById('2fa-help');
	const modalOverlay = document.querySelector('.modal-2fa-overlay');

	console.log('🔧 Elements found:', {
		cancelBtn: !!cancelBtn,
		helpLink: !!helpLink,
		modalOverlay: !!modalOverlay
	});

	// Обработчик для кнопки отмены
	if (cancelBtn) {
		console.log('🔧 Adding click handler to cancel button');

		// Удаляем старые обработчики если есть
		const newCancelBtn = cancelBtn.cloneNode(true);
		cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

		// Добавляем новый обработчик
		newCancelBtn.addEventListener('click', async (e) => {
			console.log('🚫 Cancel button clicked!');
			e.preventDefault();
			e.stopPropagation();
			try {
				await decline2FA();
			} catch (error) {
				console.error('Error in cancel handler:', error);
			}
		});
	} else {
		console.error('❌ Cancel button not found!');
	}

	// Ссылка помощи
	if (helpLink) {
		helpLink.addEventListener('click', (e) => {
			e.preventDefault();
			showHelpInfo();
		});
	}

	// Закрытие по клику на оверлей
	if (modalOverlay) {
		console.log('🔧 Adding click handler to overlay');
		modalOverlay.addEventListener('click', async (e) => {
			console.log('🚫 Overlay clicked!');
			await decline2FA();
		});
	}
}

/**
 * Отклоняет запрос 2FA
 */
async function decline2FA() {
	console.log('🚫 decline2FA called');
	console.log('🚫 show2faUser:', window.show2faUser);
	console.log('🚫 authPollingInterval:', authPollingInterval);

	// Останавливаем polling если он активен
	if (authPollingInterval) {
		console.log('🚫 Stopping auth polling interval');
		clearInterval(authPollingInterval);
		authPollingInterval = null;
		console.log('🚫 Auth polling stopped');
	} else {
		console.log('🚫 No active polling to stop');
	}

	if (!window.show2faUser) {
		console.log('🚫 No show2faUser, hiding modal and redirecting');
		hide2FAModal();
		window.location.href = '/';
		return;
	}

	try {
		console.log('🚫 Sending decline request to API for user:', window.show2faUser);
		const csrfToken = getCSRFToken();
		console.log('🚫 CSRF token obtained:', !!csrfToken);

		console.log('🚫 Making POST request to /api/decline_2fa/');
		const response = await fetch('/api/decline_2fa/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': csrfToken,
			},
			body: JSON.stringify({
				username: window.show2faUser
			})
		});

		console.log('🚫 Response received - status:', response.status);
		const result = await response.json();
		console.log('🚫 Response data:', result);

		if (result.status === 'success') {
			console.log('🚫 Decline successful, showing message');
			showDeclineMessage();
			setTimeout(() => {
				hide2FAModal();
				window.location.href = '/';
			}, 2000);
		} else {
			console.error('🚫 Failed to decline 2FA:', result.message);
			hide2FAModal();
			window.location.href = '/';
		}
	} catch (error) {
		console.error('🚫 Error declining 2FA:', error);
		hide2FAModal();
		window.location.href = '/';
	}
}

/**
 * Запускает таймер обратного отсчета
 */
function startCountdownTimer() {
	const timerElement = document.getElementById('countdown-timer');
	if (!timerElement) return;

	clearCountdownTimer(); // Очищаем предыдущий таймер

	countdownInterval = setInterval(() => {
		const minutes = Math.floor(countdownTime / 60);
		const seconds = countdownTime % 60;

		if (timerElement) {
			timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
		}

		if (countdownTime <= 0) {
			clearCountdownTimer();
			handle2FATimeout(); // Используем новую функцию для обработки истечения времени
			return;
		}

		countdownTime--;
	}, 1000);
}

/**
 * Очищает таймер обратного отсчета
 */
function clearCountdownTimer() {
	if (countdownInterval) {
		clearInterval(countdownInterval);
		countdownInterval = null;
	}
	countdownTime = 300; // Сброс времени
}

/**
 * Обрабатывает истечение времени 2FA запроса
 */
async function handle2FATimeout() {
	console.log('⏰ 2FA request timed out');

	// Останавливаем polling если он активен
	if (authPollingInterval) {
		console.log('⏰ Stopping auth polling due to timeout');
		clearInterval(authPollingInterval);
		authPollingInterval = null;
	}

	// Отправляем запрос на сервер об истечении времени
	if (window.show2faUser) {
		try {
			console.log('⏰ Sending timeout request to server for user:', window.show2faUser);
			const csrfToken = getCSRFToken();

			const response = await fetch('/api/decline_2fa/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': csrfToken,
				},
				body: JSON.stringify({
					username: window.show2faUser
				})
			});

			const result = await response.json();
			console.log('⏰ Timeout response:', result);
		} catch (error) {
			console.error('⏰ Error sending timeout request:', error);
		}
	}

	hide2FAModal();
	showTimeoutMessage();

	// Перенаправление с задержкой
	setTimeout(() => {
		window.location.href = '/';
	}, 3000);
}

/**
 * Показывает сообщение об истечении времени
 */
function showTimeoutMessage() {
	const notification = document.createElement('div');
	notification.style.cssText = `
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: linear-gradient(135deg, #ff9800, #f57c00);
		color: white;
		padding: 20px 30px;
		border-radius: 12px;
		z-index: 1001;
		font-size: 16px;
		font-weight: 500;
		box-shadow: 0 8px 32px rgba(255, 152, 0, 0.3);
		text-align: center;
		min-width: 250px;
	`;
	notification.innerHTML = `
		<div style="margin-bottom: 10px;">
			<i class="fas fa-clock" style="font-size: 24px; margin-bottom: 8px;"></i>
		</div>
		<div>2FA Request Timed Out</div>
		<div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Please try logging in again</div>
		<div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">Redirecting...</div>
	`;

	document.body.appendChild(notification);

	setTimeout(() => {
		if (notification.parentNode) {
			notification.parentNode.removeChild(notification);
		}
	}, 4000);
}

/**
 * Опитування сервера для перевірки статусу 2FA автентифікації
 * @param {string} username - имя пользователя для проверки
 */
function startPollingForAuth(username) {
	console.log('🔄 Starting polling for user:', username);

	// Останавливаем предыдущий polling если он есть
	if (authPollingInterval) {
		clearInterval(authPollingInterval);
	}

	authPollingInterval = setInterval(() => {
		fetch(`/api/check_2fa_status/?username=${encodeURIComponent(username)}`)
			.then(response => response.json())
			.then(data => {
				console.log('🔄 Polling response:', data);
				if (data.authenticated && data.status === 'approved') {
					console.log('✅ Authentication approved!');
					clearInterval(authPollingInterval);
					authPollingInterval = null;
					hide2FAModal();
					showSuccessMessage();
					// Перенаправление на главную страницу с задержкой
					setTimeout(() => {
						window.location.href = '/';
					}, 1500);
				} else if (data.status === 'declined') {
					console.log('🚫 Authentication declined!');
					clearInterval(authPollingInterval);
					authPollingInterval = null;
					hide2FAModal();
					showDeclineMessage();
					// Перенаправление с задержкой
					setTimeout(() => {
						window.location.href = '/';
					}, 2000);
				}
				// Если status === 'pending', продолжаем polling
			})
			.catch(error => {
				console.error('Error checking 2FA status:', error);
			});
	}, 3000);
}

/**
 * Показывает сообщение об успешной аутентификации
 */
function showSuccessMessage() {
	const notification = document.createElement('div');
	notification.style.cssText = `
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: linear-gradient(135deg, #4CAF50, #45a049);
		color: white;
		padding: 20px 30px;
		border-radius: 12px;
		z-index: 1001;
		font-size: 16px;
		font-weight: 500;
		box-shadow: 0 8px 32px rgba(76, 175, 80, 0.3);
		text-align: center;
		min-width: 200px;
	`;
	notification.innerHTML = `
		<div style="margin-bottom: 10px;">
			<i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 8px;"></i>
		</div>
		<div>Authentication Successful!</div>
		<div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Redirecting...</div>
	`;

	document.body.appendChild(notification);

	setTimeout(() => {
		if (notification.parentNode) {
			notification.parentNode.removeChild(notification);
		}
	}, 3000);
}

/**
 * Показывает сообщение об отклонении 2FA
 */
function showDeclineMessage() {
	const notification = document.createElement('div');
	notification.style.cssText = `
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: linear-gradient(135deg, #ff6b6b, #ff5252);
		color: white;
		padding: 20px 30px;
		border-radius: 12px;
		z-index: 1001;
		font-size: 16px;
		font-weight: 500;
		box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
		text-align: center;
		min-width: 200px;
	`;
	notification.innerHTML = `
		<div style="margin-bottom: 10px;">
			<i class="fas fa-times-circle" style="font-size: 24px; margin-bottom: 8px;"></i>
		</div>
		<div>Authentication Declined</div>
		<div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">Redirecting...</div>
	`;

	document.body.appendChild(notification);

	setTimeout(() => {
		if (notification.parentNode) {
			notification.parentNode.removeChild(notification);
		}
	}, 3000);
}

/**
 * Показывает информацию о помощи
 */
function showHelpInfo() {
	showMessage('Check your Telegram for the 2FA request. Click "Approve" to continue or "Decline" to cancel.', 'info', 5000);
}