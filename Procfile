web: daphne -b 0.0.0.0 -p $PORT TaskForge.asgi:application
worker: celery -A TaskForge worker --loglevel=info --concurrency=2
beat: celery -A TaskForge beat --loglevel=info
bot: python main/telegram_bot.py
release: python manage.py migrate --noinput && python manage.py collectstatic --noinput
