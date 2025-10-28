import os
from celery import Celery
from celery.schedules import crontab


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'TaskForge.settings')

app = Celery('TaskForge')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'habit-notifications-every-30-minutes': {
        'task': 'main.tasks.generate_habit_notifications',
        'schedule': 1800.0,
    },
    'reset-weekly-activity': {
        'task': 'main.tasks.reset_weekly_activity',
        'schedule': crontab(hour=0, minute=0, day_of_week=1),  # Кожен понеділок в 00:00
    },
}
