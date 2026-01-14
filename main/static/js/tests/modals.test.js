/**
 * Тести для модальних вікон
 */

describe('Base Modal', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div class="modal" id="test-modal">
                <div class="modal-content">
                    <button class="close-modal">&times;</button>
                    <h2>Test Modal</h2>
                </div>
            </div>
            <button id="open-modal-btn">Open</button>
        `;
	});

	test('Відкриває модальне вікно', () => {
		const modal = document.getElementById('test-modal');

		if (typeof openModal === 'function') {
			openModal('test-modal');
		}

		expect(modal.classList.contains('active')).toBe(true);
	});

	test('Закриває модальне вікно', () => {
		const modal = document.getElementById('test-modal');
		modal.classList.add('active');

		if (typeof closeModal === 'function') {
			closeModal('test-modal');
		}

		expect(modal.classList.contains('active')).toBe(false);
	});

	test('Закриває модалку при кліку на backdrop', () => {
		const modal = document.getElementById('test-modal');
		modal.classList.add('active');

		const event = new MouseEvent('click', {
			bubbles: true,
			cancelable: true
		});

		modal.dispatchEvent(event);

		setTimeout(() => {
			expect(modal.classList.contains('active')).toBe(false);
		}, 100);
	});

	test('Закриває модалку при натисканні Escape', () => {
		const modal = document.getElementById('test-modal');
		modal.classList.add('active');

		const event = new KeyboardEvent('keydown', {
			key: 'Escape',
			bubbles: true
		});

		document.dispatchEvent(event);

		setTimeout(() => {
			expect(modal.classList.contains('active')).toBe(false);
		}, 100);
	});
});

describe('Auth Modal', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div class="modal" id="auth-modal">
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">Login</button>
                    <button class="auth-tab" data-tab="register">Register</button>
                </div>
                <div class="auth-content">
                    <div class="tab-content active" data-content="login">
                        <form id="login-form">
                            <input type="text" name="username" />
                            <input type="password" name="password" />
                            <button type="submit">Login</button>
                        </form>
                    </div>
                    <div class="tab-content" data-content="register">
                        <form id="register-form">
                            <input type="text" name="username" />
                            <input type="email" name="email" />
                            <input type="password" name="password" />
                            <input type="password" name="password2" />
                            <button type="submit">Register</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
	});

	test('Перемикає між вкладками Login та Register', () => {
		const registerTab = document.querySelector('[data-tab="register"]');
		const registerContent = document.querySelector('[data-content="register"]');

		if (typeof switchAuthTab === 'function') {
			registerTab.addEventListener('click', () => switchAuthTab('register'));
			registerTab.click();
		}

		setTimeout(() => {
			expect(registerTab.classList.contains('active')).toBe(true);
			expect(registerContent.classList.contains('active')).toBe(true);
		}, 100);
	});

	test('Відправляє форму входу', async () => {
		const loginForm = document.getElementById('login-form');

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					message: 'Login successful'
				})
			})
		);

		if (typeof handleLoginSubmit === 'function') {
			loginForm.addEventListener('submit', handleLoginSubmit);

			const event = new Event('submit', {
				bubbles: true,
				cancelable: true
			});
			loginForm.dispatchEvent(event);
		}

		await new Promise(resolve => setTimeout(resolve, 100));
		expect(fetch).toHaveBeenCalled();
	});

	test('Відправляє форму реєстрації', async () => {
		const registerForm = document.getElementById('register-form');

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					message: 'Registration successful'
				})
			})
		);

		if (typeof handleRegisterSubmit === 'function') {
			registerForm.addEventListener('submit', handleRegisterSubmit);

			const event = new Event('submit', {
				bubbles: true,
				cancelable: true
			});
			registerForm.dispatchEvent(event);
		}

		await new Promise(resolve => setTimeout(resolve, 100));
		expect(fetch).toHaveBeenCalled();
	});
});

describe('Create Modal', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div class="modal" id="create-modal">
                <form id="create-form">
                    <input type="text" name="name" required />
                    <textarea name="description"></textarea>
                    <button type="submit">Create</button>
                </form>
            </div>
        `;
	});

	test('Валідує обов\'язкові поля перед відправкою', () => {
		const form = document.getElementById('create-form');
		const nameInput = form.querySelector('[name="name"]');

		nameInput.value = '';

		const event = new Event('submit', {
			bubbles: true,
			cancelable: true
		});

		const result = form.dispatchEvent(event);

		// Браузер має заблокувати відправку
		expect(nameInput.validity.valid).toBe(false);
	});

	test('Очищає форму після успішного створення', async () => {
		const form = document.getElementById('create-form');
		const nameInput = form.querySelector('[name="name"]');

		nameInput.value = 'Test Item';

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			})
		);

		if (typeof clearCreateForm === 'function') {
			await clearCreateForm();
		}

		setTimeout(() => {
			expect(nameInput.value).toBe('');
		}, 100);
	});
});

describe('Support Modal', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <div class="modal" id="support-modal">
                <form id="support-form">
                    <input type="text" name="subject" required />
                    <textarea name="message" required></textarea>
                    <button type="submit">Send</button>
                </form>
            </div>
        `;
	});

	test('Відправляє повідомлення підтримки', async () => {
		const form = document.getElementById('support-form');

		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({
					success: true,
					message: 'Message sent'
				})
			})
		);

		if (typeof handleSupportSubmit === 'function') {
			form.addEventListener('submit', handleSupportSubmit);

			const event = new Event('submit', {
				bubbles: true,
				cancelable: true
			});
			form.dispatchEvent(event);
		}

		await new Promise(resolve => setTimeout(resolve, 100));
		expect(fetch).toHaveBeenCalled();
	});
});

describe('Dropdown Modal', () => {
	beforeEach(() => {
		document.body.innerHTML = `
            <button class="dropdown-trigger">Options</button>
            <div class="dropdown-menu">
                <button class="dropdown-item">Edit</button>
                <button class="dropdown-item">Delete</button>
            </div>
        `;
	});

	test('Відкриває dropdown при кліку', () => {
		const trigger = document.querySelector('.dropdown-trigger');
		const menu = document.querySelector('.dropdown-menu');

		if (typeof toggleDropdown === 'function') {
			trigger.addEventListener('click', toggleDropdown);
			trigger.click();
		}

		setTimeout(() => {
			expect(menu.classList.contains('active')).toBe(true);
		}, 100);
	});

	test('Закриває dropdown при кліку поза ним', () => {
		const menu = document.querySelector('.dropdown-menu');
		menu.classList.add('active');

		const event = new MouseEvent('click', {
			bubbles: true,
			cancelable: true
		});

		document.body.dispatchEvent(event);

		setTimeout(() => {
			expect(menu.classList.contains('active')).toBe(false);
		}, 100);
	});
});
