web: python manage.py migrate && daphne -b 0.0.0.0 -p $PORT TaskForge.asgi:application
worker: celery -A TaskForge worker -l info
beat: celery -A TaskForge beat -l info
telegram: python main/telegram_bot.py
