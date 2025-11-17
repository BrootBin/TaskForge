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
    # Напоминание за 2 часа до конца дня (22:00)
    'check-streak-2h': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': crontab(hour=22, minute=0),
    },
    # Напоминание за 1 час до конца дня (23:00)
    'check-streak-1h': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': crontab(hour=23, minute=0),
    },
    # Напоминание за 30 минут до конца дня (23:30)
    'check-streak-30m': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': crontab(hour=23, minute=30),
    },
    # Напоминание за 15 минут до конца дня (23:45)
    'check-streak-15m': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': crontab(hour=23, minute=45),
    },
    # Напоминание за 5 минут до конца дня (23:55)
    'check-streak-5m': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': crontab(hour=23, minute=55),
    },
    # Проверка потерянных streak в начале дня (00:05)
    'check-broken-streaks-daily': {
        'task': 'main.tasks.check_and_notify_broken_streaks',
        'schedule': crontab(hour=0, minute=5),  # В 00:05 каждый день
    },
    # Сброс недельной активности каждый понедельник
    'reset-weekly-activity': {
        'task': 'main.tasks.reset_daily_activity',
        'schedule': crontab(hour=0, minute=0, day_of_week=1),  # Понедельник в 00:00
    },
    # Очистка истекших запросов на сброс пароля каждый час
    'cleanup-expired-password-resets': {
        'task': 'main.tasks.cleanup_expired_password_resets',
        'schedule': crontab(minute=0),  # Каждый час
    },
}
