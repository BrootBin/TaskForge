/**
 * Production Logger
 * Отключает все console.log в production режиме
 */

// Определяем production режим по домену
const IS_PRODUCTION = window.location.hostname.includes('railway.app') ||
	window.location.hostname.includes('taskforge');

// Wrapper для console методов
window.logger = {
	log: IS_PRODUCTION ? () => { } : console.log.bind(console),
	error: console.error.bind(console), // Ошибки всегда показываем
	warn: IS_PRODUCTION ? () => { } : console.warn.bind(console),
	info: IS_PRODUCTION ? () => { } : console.info.bind(console),
	debug: IS_PRODUCTION ? () => { } : console.debug.bind(console)
};

// Опционально: полностью блокируем console.log в production
if (IS_PRODUCTION) {
	console.log = () => { };
	console.warn = () => { };
	console.info = () => { };
	console.debug = () => { };
}

console.info('Logger initialized. Production mode:', IS_PRODUCTION);
