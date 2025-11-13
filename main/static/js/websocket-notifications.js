/**
 * WebSocket для получения уведомлений в реальном времени
 */

(function () {
	'use strict';

	// Экспортируем в window для доступа из debug.js
	window.notificationSocket = null;
	let reconnectAttempts = 0;
	const MAX_RECONNECT_ATTEMPTS = 5;
	const RECONNECT_DELAY = 3000;

	/**
	 * Подключение к WebSocket серверу
	 */
	function connectNotificationWebSocket() {
		// Проверяем авторизацию
		if (!document.body.classList.contains('authenticated')) {
			console.log('User not authenticated, skipping WebSocket connection');
			return;
		}

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/ws/notifications/`;

		console.log('🔌 Connecting to WebSocket:', wsUrl);

		try {
			window.notificationSocket = new WebSocket(wsUrl);

			window.notificationSocket.onopen = function (e) {
				console.log('✅ WebSocket connected');
				reconnectAttempts = 0;
			};

			window.notificationSocket.onmessage = function (e) {
				const data = JSON.parse(e.data);
				console.log('📨 WebSocket message received:', data);

				if (data.type === 'notification') {
					// Обновляем список уведомлений из API (загружаем свежие данные с сервера)
					// refreshNotifications автоматически обновит и badge
					if (window.NotificationsDropdown && typeof window.NotificationsDropdown.refreshNotifications === 'function') {
						window.NotificationsDropdown.refreshNotifications();
					} else {
						console.error('❌ NotificationsDropdown.refreshNotifications not found!');
					}

					console.log('🔔 Notification received, list refreshed from API');
				}
			}; window.notificationSocket.onerror = function (error) {
				console.error('❌ WebSocket error:', error);
			};

			window.notificationSocket.onclose = function (e) {
				console.log('🔌 WebSocket disconnected:', e.code, e.reason);
				window.notificationSocket = null;

				// Попытка переподключения
				if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
					reconnectAttempts++;
					console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
					setTimeout(connectNotificationWebSocket, RECONNECT_DELAY);
				} else {
					console.error('❌ Max reconnection attempts reached');
				}
			};
		} catch (error) {
			console.error('❌ Failed to create WebSocket:', error);
		}
	}

	/**
	 * Отключение от WebSocket
	 */
	function disconnectNotificationWebSocket() {
		if (window.notificationSocket) {
			window.notificationSocket.close();
			window.notificationSocket = null;
		}
	}

	/**
	 * Удаляет прочитанные уведомления из списка
	 */
	function removeReadNotifications() {
		const notificationsList = document.getElementById('notifications-list');
		if (!notificationsList) {
			console.warn('⚠️ Notifications list not found');
			return;
		}

		const readItems = notificationsList.querySelectorAll('.notification-item[data-read="true"]');

		if (readItems.length === 0) {
			console.log('ℹ️ No read notifications to remove');
			// Если нет прочитанных, просто обновляем индикатор
			updateNotificationBadge();
			return;
		}

		console.log(`🗑️ Removing ${readItems.length} read notification(s)...`);

		// Запускаем анимацию для всех прочитанных элементов
		readItems.forEach(item => {
			item.style.transition = 'opacity 0.3s, transform 0.3s';
			item.style.opacity = '0';
			item.style.transform = 'translateX(20px)';
		});

		// После завершения анимации удаляем элементы
		setTimeout(() => {
			readItems.forEach(item => {
				if (item.parentNode) {
					item.remove();
					console.log('🗑️ Removed notification item');
				}
			});

			// Проверяем, остались ли уведомления
			const remainingItems = notificationsList.querySelectorAll('.notification-item');
			console.log(`📋 Remaining notifications: ${remainingItems.length}`);

			if (remainingItems.length === 0) {
				// Удаляем старое сообщение "No notifications" если есть
				const oldNoMsg = notificationsList.querySelector('.no-notifications');
				if (oldNoMsg) oldNoMsg.remove();

				// Добавляем новое
				const noMsg = document.createElement('li');
				noMsg.className = 'no-notifications';
				noMsg.style.cssText = 'padding: 20px; text-align: center; color: var(--text-secondary, #888);';
				noMsg.textContent = 'Немає сповіщень';
				notificationsList.appendChild(noMsg);
				console.log('📝 Added "No notifications" message');
			}

			// Обновляем индикатор после удаления
			console.log('📊 Updating notification badge...');
			updateNotificationBadge();
		}, 350); // Даем время на завершение анимации
	}

	/**
	 * Обновляет индикатор непрочитанных уведомлений
	 */
	function updateNotificationBadge() {
		const bell = document.getElementById('bell');
		if (!bell) {
			console.warn('⚠️ Bell element not found');
			return;
		}

		const container = bell.parentElement;
		if (!container) {
			console.warn('⚠️ Bell container not found');
			return;
		}

		console.log('📊 Fetching unread count from server...');

		// Получаем количество непрочитанных уведомлений
		fetch('/api/notifications/unread-count/', {
			method: 'GET',
			cache: 'no-cache', // Принудительно получаем свежие данные
			headers: {
				'Cache-Control': 'no-cache'
			}
		})
			.then(response => response.json())
			.then(data => {
				console.log(`📊 Server returned unread count: ${data.count}`);

				// Находим текущий индикатор
				let badge = container.querySelector('.notification-badge');
				console.log(`🔴 Current badge exists: ${!!badge}`);

				if (data.count > 0) {
					// Создаем индикатор если его нет
					if (!badge) {
						badge = document.createElement('div');
						badge.className = 'notification-badge';
						container.appendChild(badge);
						console.log('🔴 Badge created for count:', data.count);
					} else {
						console.log('🔴 Badge already exists, keeping it');
					}

					// Анимируем колокольчик только при новом уведомлении
					if (!bell.classList.contains('has-new')) {
						bell.classList.add('ringing', 'has-new');
						setTimeout(() => {
							bell.classList.remove('ringing');
						}, 800);
					}
				} else {
					// Удаляем индикатор если нет непрочитанных
					if (badge) {
						console.log('🗑️ Removing badge (count = 0)');
						badge.remove();

						// Проверяем что удалили
						const checkBadge = container.querySelector('.notification-badge');
						console.log(`✅ Badge removed successfully: ${!checkBadge}`);
					} else {
						console.log('ℹ️ No badge to remove');
					}

					bell.classList.remove('has-new');
					console.log('✅ Bell classes cleared');
				}
			})
			.catch(error => console.error('❌ Error fetching unread count:', error));
	}

	// Обновляем индикатор при загрузке страницы
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', updateNotificationBadge);
	} else {
		updateNotificationBadge();
	}

	// Подключаемся при загрузке страницы
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', connectNotificationWebSocket);
	} else {
		connectNotificationWebSocket();
	}

	// Отключаемся при закрытии страницы
	window.addEventListener('beforeunload', disconnectNotificationWebSocket);

	// Экспортируем функции
	window.connectNotificationWebSocket = connectNotificationWebSocket;
	window.disconnectNotificationWebSocket = disconnectNotificationWebSocket;
	window.updateNotificationBadge = updateNotificationBadge;
	window.removeReadNotifications = removeReadNotifications;

})();
