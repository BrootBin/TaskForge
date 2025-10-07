
from celery import shared_task
from django.conf import settings
from telegram import Bot
from django.utils import timezone
from datetime import timedelta
from .models import Habit, HabitCheckin, Notification
from .notification import send_web_notification, send_telegram_notification

@shared_task
def send_2fa_request(telegram_id, username):
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    bot = Bot(token=token)
    try:
        bot.send_message(chat_id=telegram_id, text=f'Підтвердіть вхід на сайт для користувача {username}. Відправте /2fa для підтвердження.')
    except Exception as e:
        print(f'Ошибка отправки 2FA: {e}')

@shared_task
def generate_habit_notifications():
    now = timezone.now()
    today = timezone.localdate()
    users_habits = Habit.objects.filter(active=True)
    for habit in users_habits:
        last_checkin = habit.checkins.order_by('-date').first()
        missed_days = 0
        if last_checkin:
            missed_days = (today - last_checkin.date).days - 1
        if missed_days > 0:
            message = f"Ви втратили серію '{habit.name}'! Пропущено {missed_days} днів."
            Notification.objects.create(
                user=habit.user,
                message=message,
                send_web=True,
                send_telegram=True
            )
            send_web_notification(habit.user, message)
            send_telegram_notification(habit.user, message)
            continue
        next_deadline = timezone.make_aware(
            timezone.datetime.combine(today + timedelta(days=1), timezone.datetime.min.time())
        )
        hours_to_deadline = (next_deadline - now).total_seconds() / 3600
        # Надсилаємо нагадування за 3,2,1,0.5 години до кінця серії
        for h in [3, 2, 1, 0.5]:
            if abs(hours_to_deadline - h) < 0.1:
                message = f"Ви не хочете втратити серію '{habit.name}'! Залишилось {int(h*60)} хв."
                Notification.objects.create(
                    user=habit.user,
                    message=message,
                    send_web=True,
                    send_telegram=True
                )
                send_web_notification(habit.user, message)
                send_telegram_notification(habit.user, message)
