/**
 * Modal components loader for TaskForge
 * Loads and initializes all modal components
 */
console.log('🚀 Modal component loader initialized');

// Загружаем модульные компоненты модальных окон
document.write('<script src="/static/js/components/modals/base-modal.js"></script>');
document.write('<script src="/static/js/components/modals/auth-modal.js"></script>');
document.write('<script src="/static/js/components/modals/dropdown-modal.js"></script>');
document.write('<script src="/static/js/components/modals/2fa-modal.js"></script>');
document.write('<script src="/static/js/components/modals/create-modal.js"></script>');

/**
 * Инициализирует все модальные окна
 */
function initModals() {
	console.log('🔧 Initializing all modals...');

	// Инициализируем базовые обработчики
	if (typeof initBaseModalHandlers === 'function') {
		initBaseModalHandlers();
	}

	// Инициализируем модальные окна авторизации
	if (typeof initAuthModals === 'function') {
		initAuthModals();
	}

	// Инициализируем выпадающие меню
	if (typeof initDropdownModals === 'function') {
		initDropdownModals();
	}

	// Инициализируем модальные окна создания
	if (typeof initCreateModals === 'function') {
		initCreateModals();
	}

	console.log('✅ All modals initialized successfully');
}
