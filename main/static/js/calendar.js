document.addEventListener('DOMContentLoaded', function () {
	initializeCalendar();
});

function initializeCalendar() {
	const calendarDays = document.querySelector('.days');

	// Если календарь уже инициализирован или не найден на странице, выходим
	if (!calendarDays || calendarDays.childElementCount > 5) return;

	// Очищаем примеры дней
	calendarDays.innerHTML = '';

	// Текущая дата
	const currentDate = new Date();
	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();
	const currentDay = currentDate.getDate();

	// Устанавливаем заголовок календаря
	const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
		"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
	const monthHeader = document.querySelector('.month');
	if (monthHeader) {
		monthHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;
	}

	// Получаем первый день месяца
	const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

	// Корректируем для недели начинающейся с понедельника (воскресенье = 0 -> 6, понедельник = 1 -> 0)
	const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

	// Количество дней в текущем месяце
	const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

	// Добавляем пустые ячейки для дней перед началом месяца
	for (let i = 0; i < startDay; i++) {
		const dayElement = document.createElement('div');
		dayElement.className = 'day empty';
		calendarDays.appendChild(dayElement);
	}

	// Добавляем дни месяца
	for (let i = 1; i <= daysInMonth; i++) {
		const dayElement = document.createElement('div');
		dayElement.className = 'day';
		dayElement.textContent = i;

		// Выделяем текущий день
		if (i === currentDay) {
			dayElement.classList.add('active');
		}

		// Добавляем обработчик клика для выбора дня
		dayElement.addEventListener('click', function () {
			// Снимаем выделение со всех дней
			document.querySelectorAll('.day').forEach(day => {
				day.classList.remove('active');
			});
			// Выделяем выбранный день
			this.classList.add('active');
		});

		calendarDays.appendChild(dayElement);
	}
}