import os
from celery import Celery
from celery.schedules import crontab


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project.settings')

app = Celery('main')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'habit-notifications-every-30-minutes': {
        'task': 'your_app.tasks.generate_habit_notifications',
        'schedule': 1800.0,  
    },
}
