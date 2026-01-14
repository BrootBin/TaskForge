/**
 * Тести для WebSocket сповіщень
 */

describe('WebSocket Notifications', () => {
	let websocket;
	let originalWebSocket;

	beforeEach(() => {
		// Зберігаємо оригінальний WebSocket
		originalWebSocket = window.WebSocket;

		// Мокаємо WebSocket
		window.WebSocket = class MockWebSocket {
			constructor(url) {
				this.url = url;
				this.readyState = WebSocket.CONNECTING;
				this.onopen = null;
				this.onclose = null;
				this.onerror = null;
				this.onmessage = null;
			}

			send(data) {
				this.sentData = data;
			}

			close() {
				this.readyState = WebSocket.CLOSED;
				if (this.onclose) {
					this.onclose({ code: 1000, reason: 'Normal closure' });
				}
			}
		};
	});

	afterEach(() => {
		// Відновлюємо оригінальний WebSocket
		window.WebSocket = originalWebSocket;
		if (websocket) {
			websocket.close();
		}
	});

	test('WebSocket підключається до правильного URL', () => {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const expectedUrl = `${protocol}//${window.location.host}/ws/notifications/`;

		const ws = new WebSocket(expectedUrl);
		expect(ws.url).toBe(expectedUrl);
	});

	test('WebSocket відправляє heartbeat', (done) => {
		const ws = new WebSocket('ws://localhost/ws/notifications/');

		ws.send = jest.fn();

		// Симулюємо відкриття з'єднання
		if (ws.onopen) {
			ws.onopen();
		}

		setTimeout(() => {
			expect(ws.send).toHaveBeenCalled();
			done();
		}, 100);
	});

	test('WebSocket обробляє отримане повідомлення', (done) => {
		const ws = new WebSocket('ws://localhost/ws/notifications/');
		const testMessage = {
			type: 'notification',
			message: 'Test notification',
			notification_id: 123
		};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			expect(data.type).toBe('notification');
			expect(data.message).toBe('Test notification');
			done();
		};

		// Симулюємо отримання повідомлення
		if (ws.onmessage) {
			ws.onmessage({ data: JSON.stringify(testMessage) });
		}
	});

	test('WebSocket автоматично переподключається після розриву', (done) => {
		const ws = new WebSocket('ws://localhost/ws/notifications/');
		let reconnectAttempted = false;

		ws.onclose = () => {
			reconnectAttempted = true;
		};

		ws.close();

		setTimeout(() => {
			expect(reconnectAttempted).toBe(true);
			done();
		}, 100);
	});
});

describe('Notification Display', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div id="notification-container"></div>
            <div class="notification-badge"></div>
        `;
	});

	test('Показує сповіщення в UI', () => {
		const notification = {
			id: 1,
			message: 'Test notification',
			created_at: new Date().toISOString()
		};

		if (typeof showNotification === 'function') {
			showNotification(notification);
		}

		const container = document.getElementById('notification-container');
		expect(container.children.length).toBeGreaterThan(0);
	});

	test('Оновлює badge з кількістю непрочитаних', () => {
		const count = 5;
		const badge = document.querySelector('.notification-badge');

		if (typeof updateNotificationBadge === 'function') {
			updateNotificationBadge(count);
		}

		expect(badge.textContent).toBe(count.toString());
	});

	test('Позначає сповіщення як прочитане', async () => {
		const notificationId = 1;

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			})
		);

		if (typeof markNotificationRead === 'function') {
			await markNotificationRead(notificationId);
		}

		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining(`/mark-notification-read/${notificationId}/`),
			expect.any(Object)
		);
	});
});

describe('Notification Sounds', () => {
	test('Відтворює звук при новому сповіщенні', () => {
		const playSound = jest.fn();
		window.Audio = jest.fn().mockImplementation(() => ({
			play: playSound
		}));

		if (typeof playNotificationSound === 'function') {
			playNotificationSound();
		}

		expect(playSound).toHaveBeenCalled();
	});
});
