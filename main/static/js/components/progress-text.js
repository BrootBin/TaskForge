/**
 * Скрипт для точного центрування тексту "Monthly Progress"
 * Додає динамічне коригування позиціонування тексту в колі прогресу
 * 
 * @module components/progress-text
 */

// Публічний API компоненту
function initProgressText() {
	console.log('Progress text component initialized');
	centerProgressText();
}

/**
 * Центрує текст у всіх елементах з класом .progress-text
 * @private
 */
function centerProgressText() {
	// Знаходимо контейнер з текстом Monthly Progress
	const progressTextElements = document.querySelectorAll('.progress-text');

	// Центруємо текст у всіх знайдених елементах з класом progress-text
	progressTextElements.forEach(function (textElement) {
		// Встановлюємо правильне центрування з урахуванням висоти тексту
		const containerHeight = textElement.parentElement.offsetHeight;
		textElement.style.height = '50px';
		textElement.style.width = '50px';
		textElement.style.display = 'flex';
		textElement.style.flexDirection = 'column';
		textElement.style.alignItems = 'center';
		textElement.style.justifyContent = 'center';

		// Збільшуємо розмір шрифту
		textElement.style.fontSize = '12px';
		textElement.style.fontWeight = '600';
	});
}