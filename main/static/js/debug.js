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
console.log('- testAuthModal() - тест модального окна авторизации');
console.log('- testNotifications() - тест системы уведомлений');
console.log('- testProfileBtn() - тест кнопки профиля');
console.log('- testBellBtn() - тест кнопки уведомлений');
console.log('- testDropdowns() - тест выпадающих меню');
console.log('- debugModals() - информация о состоянии модалей');