/**
 * Jest setup file
 * Налаштування глобального середовища для тестів
 */

// Додаємо custom matchers від @testing-library/jest-dom
import '@testing-library/jest-dom';

// Мокаємо WebSocket для тестів
global.WebSocket = class MockWebSocket {
	static CONNECTING = 0;
	static OPEN = 1;
	static CLOSING = 2;
	static CLOSED = 3;

	constructor(url) {
		this.url = url;
		this.readyState = WebSocket.CONNECTING;
		this.onopen = null;
		this.onclose = null;
		this.onerror = null;
		this.onmessage = null;
	}

	send(data) {
		// Мок метод
	}

	close() {
		this.readyState = WebSocket.CLOSED;
	}
};

// Мокаємо fetch для тестів
global.fetch = jest.fn(() =>
	Promise.resolve({
		ok: true,
		json: () => Promise.resolve({}),
	})
);

// Мокаємо localStorage
const localStorageMock = {
	getItem: jest.fn(),
	setItem: jest.fn(),
	removeItem: jest.fn(),
	clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Мокаємо console для чистоти виводу тестів
global.console = {
	...console,
	error: jest.fn(),
	warn: jest.fn(),
};

// Додаємо CSRF token для тестів
const metaTag = document.createElement('meta');
metaTag.name = 'csrf-token';
metaTag.content = 'test-csrf-token';
document.head.appendChild(metaTag);

// Очищаємо моки після кожного тесту
afterEach(() => {
	jest.clearAllMocks();
});
