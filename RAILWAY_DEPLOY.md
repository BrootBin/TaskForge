# Деплой TaskForge на Railway

## 🚂 Преимущества Railway

✅ **Одна база данных PostgreSQL** для всего (Django + Celery broker + Celery results)
✅ **Автоматический деплой** из GitHub
✅ **Бесплатный тариф** для начала
✅ **Встроенный PostgreSQL** - не нужно настраивать

## 📋 Подготовка проекта

### 1. Установите необходимые зависимости

```bash
pip install sqlalchemy kombu[sqlalchemy] django-celery-results django-celery-beat
```

### 2. Создайте файлы для Railway

#### `Procfile`:
```
web: python manage.py migrate && daphne -b 0.0.0.0 -p $PORT TaskForge.asgi:application
worker: celery -A TaskForge worker -l info
beat: celery -A TaskForge beat -l info
telegram: python main/telegram_bot.py
```

#### `railway.toml`:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "python manage.py migrate && daphne -b 0.0.0.0 -p $PORT TaskForge.asgi:application"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 10
```

### 3. Обновите `settings.py`

Конфигурация уже настроена для Railway! Celery будет использовать переменную `DATABASE_URL` автоматически.

## 🚀 Деплой на Railway

### Шаг 1: Создайте проект на Railway

1. Зайдите на [railway.app](https://railway.app)
2. Нажмите "New Project"
3. Выберите "Deploy from GitHub repo"
4. Выберите репозиторий TaskForge

### Шаг 2: Добавьте PostgreSQL

1. В проекте нажмите "New"
2. Выберите "Database" → "PostgreSQL"
3. Railway автоматически создаст переменную `DATABASE_URL`

### Шаг 3: Настройте переменные окружения

В Settings → Variables добавьте:

```
SECRET_KEY=your-secret-key-here
DEBUG=False
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
ALLOWED_HOSTS=your-app.railway.app
DATABASE_URL=(автоматически создается Railway)
```

### Шаг 4: Создайте дополнительные сервисы

Railway позволяет создать несколько сервисов в одном проекте:

#### Service 1: Web (Django + Daphne)
```
Start Command: python manage.py migrate && daphne -b 0.0.0.0 -p $PORT TaskForge.asgi:application
```

#### Service 2: Celery Worker
```
Start Command: celery -A TaskForge worker -l info
```

#### Service 3: Celery Beat
```
Start Command: celery -A TaskForge beat -l info
```

#### Service 4: Telegram Bot
```
Start Command: python main/telegram_bot.py
```

## 🔧 Настройка для Railway

### Обновите ALLOWED_HOSTS в settings.py:

```python
ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
    '.railway.app',  # Добавьте это
]
```

### Для production добавьте:

```python
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
```

## 📊 Мониторинг

После деплоя вы можете:

1. **Просмотреть логи** каждого сервиса в Railway Dashboard
2. **Мониторить задачи Celery** через Django Admin:
   - `/admin/django_celery_beat/periodictask/` - расписание
   - `/admin/django_celery_results/taskresult/` - результаты

## 🔄 Автоматические уведомления

После успешного деплоя система автоматически будет:

- ⏰ Отправлять напоминания о streak (2ч, 1ч, 30м, 15м, 5м до полуночи)
- 💔 Уведомлять о потерянных streak (00:05 каждый день)
- 📱 Отправлять в Telegram (если включено)
- 🌐 Отправлять web-уведомления в реальном времени

## 🐛 Troubleshooting

### Celery не запускается?
Проверьте, что установлены зависимости:
```bash
pip install sqlalchemy kombu[sqlalchemy]
```

### Миграции не применяются?
Запустите вручную:
```bash
python manage.py migrate
python manage.py migrate django_celery_results
python manage.py migrate django_celery_beat
```

### WebSocket не работает?
Убедитесь, что Daphne запущен и порт правильный:
```bash
daphne -b 0.0.0.0 -p $PORT TaskForge.asgi:application
```

## 💡 Локальное тестирование с PostgreSQL

Для локальной разработки с PostgreSQL (без Redis):

```bash
# Установите PostgreSQL локально
brew install postgresql  # macOS
# или используйте Railway PostgreSQL удаленно

# Экспортируйте DATABASE_URL
export DATABASE_URL="postgresql://user:pass@localhost/taskforge"

# Запустите сервисы
python manage.py runserver
celery -A TaskForge worker -l info
celery -A TaskForge beat -l info
python main/telegram_bot.py
```

---

🎉 **Готово!** Теперь у вас одна база данных PostgreSQL для всего, идеально для Railway!
