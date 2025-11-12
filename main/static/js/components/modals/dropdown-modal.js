console.log('🔔 Dropdown loaded');

window.NotificationsDropdown = {
	pollingInterval: null,
	lastUnreadCount: 0,
	isActiveHours: false,

	init: function () {
		this.initDropdownMenus();
		this.startPolling();
	},

	// Проверяем активное время: 21:00-00:01
	checkActiveHours: function () {
		const now = new Date();
		const hour = now.getHours();
		const minute = now.getMinutes();

		// Активно с 21:00 до 00:01 (21:00-23:59 и 00:00-00:01)
		const isActive = (hour >= 21) || (hour === 0 && minute <= 1);

		if (isActive !== this.isActiveHours) {
			this.isActiveHours = isActive;
			if (isActive) {
				console.log('🌙 Active hours started (21:00-00:01) - polling enabled');
			} else {
				console.log('☀️ Outside active hours - polling disabled');
			}
		}

		return isActive;
	},

	startPolling: function () {
		// Проверяем новые уведомления каждые 60 секунд (только в активное время)
		const self = this;
		this.pollingInterval = setInterval(function () {
			// Проверяем только если сейчас активное время
			if (self.checkActiveHours()) {
				self.checkForNewNotifications();
			}
		}, 60000);
		console.log('🔄 Polling started (every 60 seconds, active 21:00-00:01)');
	},

	checkForNewNotifications: function () {
		const self = this;
		// Проверяем количество непрочитанных
		fetch('/api/notifications/unread-count/', { method: 'GET', cache: 'no-cache' })
			.then(r => r.json())
			.then(d => {
				// Если количество изменилось (появились новые или стало меньше)
				if (d.count !== self.lastUnreadCount) {
					console.log('🔄 Unread count changed:', self.lastUnreadCount, '->', d.count);
					self.lastUnreadCount = d.count;

					// Обновляем список и badge
					self.refreshNotifications();
				}
			})
			.catch(e => console.error('❌ Poll error:', e));
	},

	markAsRead: function (id, elem) {
		fetch('/api/notifications/mark-read/', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-CSRFToken': this.getCookie('csrftoken') },
			body: JSON.stringify({ notification_id: id })
		})
			.then(r => r.json())
			.then(d => {
				if (d.success) {
					elem.setAttribute('data-read', 'true');
					elem.style.opacity = '0.6';
				}
			})
			.catch(e => console.error('❌ Mark read error:', e));
	},

	refreshNotifications: function () {
		console.log('🔄 refreshNotifications called!');
		const list = document.getElementById('notifications-list');
		if (!list) {
			console.error('❌ notifications-list not found!');
			return;
		}

		const self = this;
		console.log('📡 Fetching /api/notifications/latest/...');
		fetch('/api/notifications/latest/')
			.then(r => r.json())
			.then(data => {
				console.log('📥 Received notifications:', data.notifications.length);
				list.innerHTML = '';
				if (data.notifications.length === 0) {
					const noNotif = document.createElement('li');
					noNotif.className = 'no-notifications';
					noNotif.style.cssText = 'padding: 20px; text-align: center; color: #888;';
					noNotif.textContent = 'No notifications';
					list.appendChild(noNotif);
				} else {
					data.notifications.forEach(n => {
						const item = document.createElement('li');
						item.className = 'notification-item';
						item.setAttribute('data-notification-id', n.id);
						item.setAttribute('data-read', n.read ? 'true' : 'false');
						if (n.read) item.style.opacity = '0.6';
						const date = new Date(n.created_at);
						const formatted = date.toLocaleString('uk-UA', {
							day: '2-digit', month: '2-digit', year: 'numeric',
							hour: '2-digit', minute: '2-digit'
						});
						item.innerHTML = '<div class="notification-content"><p class="notification-text">' + n.message + '</p><span class="notification-time">' + formatted + '</span></div>';
						item.addEventListener('click', function () {
							if (this.getAttribute('data-read') === 'false') {
								self.markAsRead(n.id, this);
							}
						});
						list.appendChild(item);
					});
				}
				console.log('✅ Notifications refreshed:', data.notifications.length);

				// Обновляем badge после загрузки
				self.updateBadge();
			})
			.catch(e => console.error('❌ Refresh error:', e));
	},

	updateBadge: function () {
		const bell = document.getElementById('bell');
		if (!bell) return;

		const container = bell.parentElement;
		fetch('/api/notifications/unread-count/', { method: 'GET', cache: 'no-cache' })
			.then(r => r.json())
			.then(d => {
				const badge = container?.querySelector('.notification-badge');
				if (d.count > 0) {
					if (!badge) {
						const newBadge = document.createElement('div');
						newBadge.className = 'notification-badge';
						// Не добавляем текст - просто красная точка
						container.appendChild(newBadge);
						bell.classList.add('has-new');
						console.log('🔴 Badge created');
					}
					// Если badge уже есть - ничего не делаем, он уже виден
				} else if (d.count === 0 && badge) {
					badge.remove();
					bell.classList.remove('has-new');
					console.log('🗑️ Badge removed');
				}
			})
			.catch(e => console.error('❌ Badge error:', e));
	},

	initNotificationsList: function () {
		// Просто вызываем refresh - он загрузит свежие данные
		this.refreshNotifications();
	},

	cleanupReadNotifications: function () {
		const self = this;
		setTimeout(() => {
			const list = document.getElementById('notifications-list');
			if (list) {
				const readItems = list.querySelectorAll('.notification-item[data-read="true"]');
				readItems.forEach(i => i.remove());
				const remaining = list.querySelectorAll('.notification-item');
				if (remaining.length === 0) {
					const oldMsg = list.querySelector('.no-notifications');
					if (oldMsg) oldMsg.remove();
					const noMsg = document.createElement('li');
					noMsg.className = 'no-notifications';
					noMsg.style.cssText = 'padding: 20px; text-align: center; color: #888;';
					noMsg.textContent = 'No notifications';
					list.appendChild(noMsg);
				}
			}
			// Используем общий метод для обновления badge
			self.updateBadge();
		}, 100);
	},

	initDropdownMenus: function () {
		const profileBtn = document.getElementById("profile-dropdown-btn");
		const profileDrop = document.getElementById("profile-dropdown");
		const bellBtn = document.getElementById("bell");
		const notifDrop = document.querySelector(".notifications-dropdown");
		const self = this;

		if (profileBtn && profileDrop) {
			profileBtn.addEventListener("click", function (e) {
				e.stopPropagation();
				if (notifDrop) notifDrop.classList.remove("active");
				profileDrop.classList.toggle("active");
			});
		}

		if (bellBtn && notifDrop) {
			bellBtn.addEventListener("click", function (e) {
				e.stopPropagation();
				if (profileDrop) profileDrop.classList.remove("active");
				const isClosing = notifDrop.classList.contains("active");
				notifDrop.classList.toggle("active");
				if (!isClosing) {
					self.initNotificationsList();
				} else {
					self.cleanupReadNotifications();
				}
			});
		}

		document.addEventListener("click", function (e) {
			if (profileDrop && !e.target.closest('#profile-dropdown') && !e.target.closest('#profile-dropdown-btn')) {
				profileDrop.classList.remove("active");
			}
			if (notifDrop && !e.target.closest('.notifications-dropdown') && !e.target.closest('#bell')) {
				const wasActive = notifDrop.classList.contains("active");
				if (wasActive) {
					notifDrop.classList.remove("active");
					self.cleanupReadNotifications();
				}
			}
		});

		if (profileDrop) profileDrop.addEventListener("click", (e) => e.stopPropagation());
		if (notifDrop) notifDrop.addEventListener("click", (e) => e.stopPropagation());
	},

	getCookie: function (name) {
		let val = null;
		if (document.cookie && document.cookie !== '') {
			const cookies = document.cookie.split(';');
			for (let i = 0; i < cookies.length; i++) {
				const cookie = cookies[i].trim();
				if (cookie.substring(0, name.length + 1) === (name + '=')) {
					val = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return val;
	}
};

function initDropdownModals() {
	window.NotificationsDropdown.init();
}
