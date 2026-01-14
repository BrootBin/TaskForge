# TaskForge Tests

Тести для проекту TaskForge, що включають Python (Django) та JavaScript тести.

## Структура тестів

### Python Tests (Django)
Розташовані в `/main/tests/`:
- `test_models.py` - Тести моделей (Habit, Goal, SubGoal, Notification, тощо)
- `test_views.py` - Тести views та API endpoints
- `test_tasks.py` - Тести Celery tasks

### JavaScript Tests
Розташовані в `/main/static/js/tests/`:
- `notifications.test.js` - WebSocket сповіщення
- `habits.test.js` - Календар звичок та чекбокси
- `goals.test.js` - Цілі та підцілі
- `modals.test.js` - Модальні вікна
- `statistics.test.js` - Статистика та графіки

## Запуск тестів

### Python тести

```bash
# Всі тести
python manage.py test

# Тільки tests додатку main
python manage.py test main.tests

# Конкретний файл
python manage.py test main.tests.test_models

# Конкретний тест
python manage.py test main.tests.test_models.HabitModelTest.test_current_streak_today
```

### JavaScript тести

```bash
# Перейти в директорію тестів
cd main/static/js/tests

# Встановити залежності (перший раз)
npm install

# Запустити всі тести
npm test

# Запустити з watch mode (автоматично перезапускає при змінах)
npm run test:watch

# Запустити з coverage
npm run test:coverage
```

## Coverage

### Python Coverage

```bash
# Встановити coverage
pip install coverage

# Запустити тести з coverage
coverage run --source='.' manage.py test main.tests
coverage report
coverage html  # генерує HTML звіт в htmlcov/
```

### JavaScript Coverage

```bash
cd main/static/js/tests
npm run test:coverage
# Звіт буде в tests/coverage/
```

## Вимоги

### Python
- Django 4.x+
- pytest (опціонально)
- coverage (для coverage звітів)

### JavaScript
- Node.js 16+
- Jest
- @testing-library/dom
- @testing-library/jest-dom

## Що тестується

### Models (Python)
✅ Створення та валідація моделей
✅ Властивості та методи моделей
✅ Relationships між моделями
✅ Бізнес-логіка (streak, progress, completion rate)

### Views (Python)
✅ Authentication (login, register, logout)
✅ CRUD операції для Goals
✅ CRUD операції для Habits
✅ CRUD операції для SubGoals
✅ API endpoints для сповіщень

### Tasks (Python)
✅ Генерація habit reminders
✅ Перевірка broken streaks
✅ Скидання weekly activity
✅ Cleanup expired password resets

### Frontend (JavaScript)
✅ WebSocket підключення та reconnection
✅ Відображення сповіщень
✅ Habit calendar та checkins
✅ Goal progress та subgoals
✅ Модальні вікна (auth, create, support)
✅ Статистика та графіки

## CI/CD

Тести можна інтегрувати в GitHub Actions:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
      
      - name: Install Python dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Run Python tests
        run: python manage.py test
      
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: 18
      
      - name: Install JS dependencies
        run: |
          cd main/static/js/tests
          npm install
      
      - name: Run JS tests
        run: |
          cd main/static/js/tests
          npm test
```

## Додавання нових тестів

### Python
1. Створіть новий метод в існуючому TestCase класі
2. Або створіть новий TestCase клас
3. Використовуйте `self.assert*` методи

### JavaScript
1. Додайте новий `test()` або `describe()` блок
2. Використовуйте `expect()` assertions
3. Мокайте зовнішні залежності (fetch, WebSocket)

## Best Practices

- ✅ Пишіть descriptive test names
- ✅ Один тест = одна перевірка
- ✅ Використовуйте `setUp()`/`beforeEach()` для спільної ініціалізації
- ✅ Очищайте після тестів (`tearDown()`/`afterEach()`)
- ✅ Мокайте зовнішні API та сервіси
- ✅ Тестуйте edge cases
- ✅ Прагніть до високого coverage (80%+)
