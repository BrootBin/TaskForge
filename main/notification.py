# myapp/notifications.py
from datetime import date

from .models import Habit, HabitCheckin, Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer



def send_web_notification(user, message):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user.id}",
        {
            "type": "send_notification",
            "notification": {
                "message": message
            }
        }
    )

def send_telegram_notification(user, message):
    from main.telegram_bot import TOKEN
    from telegram import Bot
    profile = getattr(user, 'telegram_profile', None)
    if profile and profile.connected and profile.telegram_id:
        bot = Bot(token=TOKEN)
        try:
            bot.send_message(chat_id=profile.telegram_id, text=message)
        except Exception as e:
            print(f"Ошибка отправки Telegram: {e}")


def check_user_habits(user):
    for habit in user.habits.filter(active=True):
        last_checkin = habit.checkins.order_by('-date').first()
        today = date.today()

        if last_checkin and (today - last_checkin.date).days > 1:
            message = f"Ви втратили серію у звичці «{habit.name}»!"
            Notification.objects.create(user=user, message=message, send_web=True, send_telegram=True)
            send_web_notification(user, message)
            send_telegram_notification(user, message)
        elif last_checkin and (today - last_checkin.date).days == 0:
            streak_length = habit.checkins.filter(completed=True).count()
            message = f"Ви не хочете втратити вашу {streak_length}-денну серію у «{habit.name}»?"
            Notification.objects.create(user=user, message=message, send_web=True, send_telegram=True)
            send_web_notification(user, message)
            send_telegram_notification(user, message)
