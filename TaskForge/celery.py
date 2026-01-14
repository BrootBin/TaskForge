import os
from celery import Celery
from celery.schedules import crontab


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'TaskForge.settings')

app = Celery('TaskForge')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Налаштування timezone для Celery
app.conf.timezone = 'Europe/Kyiv'
app.conf.enable_utc = False

app.conf.beat_schedule = {
    # Нагадування за 2 години до кінця дня (22:00)
    'check-streak-2h': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': crontab(hour=22, minute=0),
    },
    # Нагадування за 1 годину до кінця дня (23:00)
    'check-streak-1h': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': crontab(hour=23, minute=0),
    },
    # Нагадування за 30 хвилин до кінця дня (23:30)
    'check-streak-30m': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': crontab(hour=23, minute=30),
    },
    # Нагадування за 15 хвилин до кінця дня (23:45)
    'check-streak-15m': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': crontab(hour=23, minute=45),
    },
    # Нагадування за 5 хвилин до кінця дня (23:55)
    'check-streak-5m': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': crontab(hour=23, minute=55),
    },
    # Перевірка загублених streak на початку дня (00:05)
    'check-broken-streaks-daily': {
        'task': 'main.tasks.check_and_notify_broken_streaks',
        'schedule': crontab(hour=0, minute=5),  # В 00:05 кожен день
    },
    # Сброс тижневої активності кожен понеділок
    'reset-weekly-activity': {
        'task': 'main.tasks.reset_daily_activity',
        'schedule': crontab(hour=0, minute=0, day_of_week=1),  # Понеділок в 00:00
    },
    # Відчистка прошедших запросів на сброс паролю кожну годину
    'cleanup-expired-password-resets': {
        'task': 'main.tasks.cleanup_expired_password_resets',
        'schedule': crontab(minute=0),  # Кожну годину
    },
}
