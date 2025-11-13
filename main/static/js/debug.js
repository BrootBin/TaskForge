/**
 * Debug functions for TaskForge
 * Используйте эти функции в консоли браузера для тестирования
 */

// Добавляем глобальные функции для отладки
window.testAuthModal = function () {
	console.log('🧪 Testing auth modal...');
	const authModal = document.getElementById("auth-modal");
	if (authModal) {
		if (typeof showModal === 'function') {
			showModal(authModal);
			console.log('✅ Auth modal should be visible now');
		} else {
			authModal.style.display = 'block';
			console.log('✅ Auth modal opened manually');
		}
	} else {
		console.error('❌ Auth modal not found');
	}
};

window.testNotifications = function () {
	console.log('🧪 Testing notifications...');
	if (window.notifications && typeof window.notifications.show === 'function') {
		window.notifications.show('Test notification', 'success', 3000);
		console.log('✅ Notification sent');
	} else if (window.showMessage && typeof window.showMessage === 'function') {
		window.showMessage('Test message via showMessage', 'success');
		console.log('✅ Message sent via showMessage');
	} else {
		console.error('❌ No notification system available');
	}
};

window.testProfileBtn = function () {
	console.log('🧪 Testing profile button...');
	const profileBtn = document.getElementById("profile-btn");
	if (profileBtn) {
		profileBtn.click();
		console.log('✅ Profile button clicked');
	} else {
		console.error('❌ Profile button not found');
	}
};

window.testBellBtn = function () {
	console.log('🧪 Testing bell button...');
	const bellBtn = document.getElementById("bell");
	if (bellBtn) {
		bellBtn.click();
		console.log('✅ Bell button clicked');
	} else {
		console.error('❌ Bell button not found');
	}
};

window.testDropdowns = function () {
	console.log('🧪 Testing dropdowns...');
	if (window.NotificationsDropdown) {
		console.log('✅ NotificationsDropdown object found');
		console.log('Available methods:', Object.keys(window.NotificationsDropdown));

		// Тестируем методы
		if (typeof window.NotificationsDropdown.checkForNewNotifications === 'function') {
			console.log('🔄 Testing checkForNewNotifications...');
			window.NotificationsDropdown.checkForNewNotifications();
		}

		if (typeof window.NotificationsDropdown.refreshNotifications === 'function') {
			console.log('🔄 Testing refreshNotifications...');
			window.NotificationsDropdown.refreshNotifications();
		}

		if (typeof window.NotificationsDropdown.updateBadge === 'function') {
			console.log('🔄 Testing updateBadge...');
			window.NotificationsDropdown.updateBadge();
		}
	} else {
		console.error('❌ NotificationsDropdown not found');
	}
};

window.testPolling = function () {
	console.log('🧪 Testing polling system...');
	if (window.NotificationsDropdown) {
		console.log('Polling interval:', window.NotificationsDropdown.pollingInterval);
		console.log('Last unread count:', window.NotificationsDropdown.lastUnreadCount);
		console.log('Is active hours:', window.NotificationsDropdown.isActiveHours);

		if (typeof window.NotificationsDropdown.checkActiveHours === 'function') {
			const isActive = window.NotificationsDropdown.checkActiveHours();
			console.log('✅ Active hours check:', isActive ? '🌙 Active (21:00-00:01)' : '☀️ Inactive');
		}
	} else {
		console.error('❌ NotificationsDropdown not found');
	}
};

window.testWebSocket = function () {
	console.log('🧪 Testing WebSocket connection...');
	if (window.notificationSocket) {
		console.log('✅ WebSocket found');
		console.log('State:', window.notificationSocket.readyState);
		console.log('0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED');

		if (window.notificationSocket.readyState === 1) {
			console.log('✅ WebSocket is OPEN and ready');
		} else {
			console.warn('⚠️ WebSocket is not ready. State:', window.notificationSocket.readyState);
		}
	} else {
		console.error('❌ WebSocket not found. Check if websocket-notifications.js is loaded');
	}
};

window.testNotificationAPI = async function () {
	console.log('🧪 Testing Notification APIs...');

	try {
		// Test unread count
		console.log('📡 Fetching unread count...');
		const countResponse = await fetch('/api/notifications/unread-count/');
		const countData = await countResponse.json();
		console.log('✅ Unread count:', countData);

		// Test latest notifications
		console.log('📡 Fetching latest notifications...');
		const latestResponse = await fetch('/api/notifications/latest/');
		const latestData = await latestResponse.json();
		console.log('✅ Latest notifications:', latestData);

		return { count: countData, notifications: latestData };
	} catch (error) {
		console.error('❌ API test failed:', error);
	}
};

window.testMarkAsRead = function (notificationId) {
	console.log('🧪 Testing mark as read for notification:', notificationId);

	if (!notificationId) {
		console.error('❌ Please provide notification ID: testMarkAsRead(123)');
		return;
	}

	if (window.NotificationsDropdown && typeof window.NotificationsDropdown.getCookie === 'function') {
		const csrfToken = window.NotificationsDropdown.getCookie('csrftoken');

		fetch('/api/notifications/mark-read/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': csrfToken
			},
			body: JSON.stringify({ notification_id: notificationId })
		})
			.then(r => r.json())
			.then(data => {
				console.log('✅ Mark as read response:', data);
			})
			.catch(error => {
				console.error('❌ Mark as read failed:', error);
			});
	} else {
		console.error('❌ NotificationsDropdown or getCookie not found');
	}
};

window.testCleanup = function () {
	console.log('🧪 Testing cleanup function...');
	if (window.NotificationsDropdown && typeof window.NotificationsDropdown.cleanupReadNotifications === 'function') {
		window.NotificationsDropdown.cleanupReadNotifications();
		console.log('✅ Cleanup executed');
	} else {
		console.error('❌ Cleanup function not found');
	}
};

window.forcePolling = function () {
	console.log('🧪 Forcing immediate polling check...');
	if (window.NotificationsDropdown && typeof window.NotificationsDropdown.checkForNewNotifications === 'function') {
		// Временно делаем время активным
		const original = window.NotificationsDropdown.checkActiveHours;
		window.NotificationsDropdown.checkActiveHours = function () { return true; };

		window.NotificationsDropdown.checkForNewNotifications();

		// Восстанавливаем оригинальную функцию через 1 секунду
		setTimeout(() => {
			window.NotificationsDropdown.checkActiveHours = original;
			console.log('✅ Original checkActiveHours restored');
		}, 1000);

		console.log('✅ Polling forced (active hours check bypassed for 1 second)');
	} else {
		console.error('❌ NotificationsDropdown not found');
	}
};

window.simulateNotification = async function () {
	console.log('🧪 Simulating new notification...');
	console.log('⚠️ This will trigger a refresh of the notification list');

	if (window.NotificationsDropdown) {
		// Имитируем изменение счётчика
		window.NotificationsDropdown.lastUnreadCount = window.NotificationsDropdown.lastUnreadCount - 1;
		console.log('📝 Changed lastUnreadCount to trigger refresh');

		// Принудительно проверяем
		await window.NotificationsDropdown.checkForNewNotifications();

		console.log('✅ Simulation complete - check the bell icon!');
	} else {
		console.error('❌ NotificationsDropdown not found');
	}
};

window.inspectNotificationList = function () {
	console.log('🔍 Inspecting notification list...');
	const list = document.getElementById('notifications-list');

	if (list) {
		const items = list.querySelectorAll('.notification-item');
		console.log('✅ Found', items.length, 'notifications');

		items.forEach((item, index) => {
			const id = item.getAttribute('data-notification-id');
			const isRead = item.getAttribute('data-read');
			const text = item.querySelector('.notification-text')?.textContent;
			const time = item.querySelector('.notification-time')?.textContent;

			console.log(`[${index + 1}] ID: ${id}, Read: ${isRead}, Text: ${text?.substring(0, 50)}..., Time: ${time}`);
		});

		const badge = document.querySelector('.notification-badge');
		console.log('Badge present:', !!badge);
	} else {
		console.error('❌ Notification list not found');
	}
};

window.testAllNotifications = async function () {
	console.log('🧪 Running full notification system test...\n');

	console.log('=== 1. Testing DOM Elements ===');
	testBellBtn();

	console.log('\n=== 2. Testing Global Objects ===');
	testDropdowns();

	console.log('\n=== 3. Testing Polling System ===');
	testPolling();

	console.log('\n=== 4. Testing WebSocket ===');
	testWebSocket();

	console.log('\n=== 5. Testing APIs ===');
	await testNotificationAPI();

	console.log('\n=== 6. Inspecting Current List ===');
	inspectNotificationList();

	console.log('\n✅ Full test complete! Check console output above.');
};

window.debugModals = function () {
	console.log('🔍 Debug info for modals:');
	console.log('Available functions:', {
		initModals: typeof initModals,
		initAuthModals: typeof initAuthModals,
		initCreateModals: typeof initCreateModals,
		showModal: typeof showModal,
		hideModal: typeof hideModal
	});

	console.log('DOM elements:', {
		authModal: !!document.getElementById("auth-modal"),
		profileBtn: !!document.getElementById("profile-btn"),
		bellBtn: !!document.getElementById("bell"),
		createModal: !!document.getElementById("create-modal")
	});

	console.log('Global objects:', {
		notifications: !!window.notifications,
		showMessage: !!window.showMessage,
		isAuthenticated: !!window.isAuthenticated,
		getCSRFToken: !!window.getCSRFToken
	});
};

console.log('🧪 Debug functions loaded! Available commands:');
console.log('');
console.log('=== Basic Tests ===');
console.log('- testAuthModal() - тест модального окна авторизации');
console.log('- testNotifications() - тест системы уведомлений');
console.log('- testProfileBtn() - тест кнопки профиля');
console.log('- testBellBtn() - тест кнопки уведомлений');
console.log('');
console.log('=== Notification System Tests ===');
console.log('- testDropdowns() - тест выпадающих меню и методов');
console.log('- testPolling() - проверка системы polling');
console.log('- testWebSocket() - проверка WebSocket соединения');
console.log('- testNotificationAPI() - тест API эндпоинтов');
console.log('- testMarkAsRead(id) - пометить уведомление прочитанным');
console.log('- testCleanup() - тест очистки прочитанных');
console.log('');
console.log('=== Advanced Tests ===');
console.log('- forcePolling() - принудительная проверка polling');
console.log('- simulateNotification() - имитация нового уведомления');
console.log('- inspectNotificationList() - инспекция списка уведомлений');
console.log('- testAllNotifications() - полный тест системы уведомлений');
console.log('');
console.log('=== Debug Info ===');
console.log('- debugModals() - информация о состоянии модалей');
console.log('');
console.log('💡 Tip: Используй testAllNotifications() для полной диагностики!');