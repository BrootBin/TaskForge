/**
 * Компонент календаря
 * TaskForge - робота з інтерактивним календарем
 */

// Функція ініціалізації календаря - публічний API компоненту
function initCalendar() {
	console.log('Calendar component initialized');
	initializeCalendar();
}

/**
 * Створює та ініціалізує інтерактивний календар
 * @private
 */
function initializeCalendar() {
	// Перевірка на всі можливі варіанти знаходження календаря
	const calendarDays = document.querySelector('.days');

	// Якщо календар уже ініціалізований або не знайдений на сторінці, виходимо
	if (!calendarDays || calendarDays.childElementCount > 5) return;

	// Очищаємо приклади днів
	calendarDays.innerHTML = '';

	// Поточна дата
	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();
	const currentDay = currentDate.getDate();

	// Встановлюємо заголовок календаря
	const monthNames = ["January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"];
	const monthHeader = document.querySelector('.month');
	if (monthHeader) {
		monthHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;
	}

	// Отримуємо перший день місяця
	const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

	// Коригуємо для тижня, що починається з понеділка (неділя = 0 -> 6, понеділок = 1 -> 0)
	const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

	// Кількість днів у поточному місяці
	const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

	// Додаємо порожні комірки для днів перед початком місяця
	for (let i = 0; i < startDay; i++) {
		const dayElement = document.createElement('div');
		dayElement.className = 'day empty';
		calendarDays.appendChild(dayElement);
	}

	// Додаємо дні місяця
	for (let i = 1; i <= daysInMonth; i++) {
		const dayElement = document.createElement('div');
		dayElement.className = 'day';
		dayElement.textContent = i;

		// Виділяємо поточний день
		if (i === currentDay) {
			dayElement.classList.add('active');
		}

		// Додаємо обробник кліку для вибору дня
		dayElement.addEventListener('click', function () {
			// Знімаємо виділення з усіх днів
			document.querySelectorAll('.day').forEach(day => {
				day.classList.remove('active');
			});
			// Виділяємо вибраний день
			this.classList.add('active');
		});

		calendarDays.appendChild(dayElement);
	}
}