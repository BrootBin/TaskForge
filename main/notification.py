# myapp/notifications.py
from datetime import date

from .models import Habit, HabitCheckin, Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer



def send_web_notification(user, message, notification_id=None, created_at=None):
    """
    Отправляет веб-уведомление через WebSocket
    
    Args:
        user: User object
        message: Текст сообщения
        notification_id: ID уведомления из БД (опционально)
        created_at: Дата создания (опционально)
    """
    channel_layer = get_channel_layer()
    
    # Используем новый формат с notification_message
    async_to_sync(channel_layer.group_send)(
        f"user_{user.id}",
        {
            "type": "notification_message",
            "message": message,
            "notification_id": notification_id,
            "created_at": created_at.isoformat() if created_at else None,
            "notification_type": "general"
        }
    )

def send_telegram_notification(user, message):
    from main.telegram_bot import TOKEN
    from telegram import Bot
    import asyncio
    profile = getattr(user, 'telegram_profile', None)
    if profile and profile.connected and profile.telegram_id and profile.notifications_enabled:
        bot = Bot(token=TOKEN)
        try:
            # Используем синхронную отправку через asyncio.run
            asyncio.run(bot.send_message(chat_id=profile.telegram_id, text=message))
            print(f"✅ Telegram notification sent to user {user.username}")
        except Exception as e:
            print(f"❌ Помилка відправки Telegram: {e}")


def check_user_habits(user):
    for habit in user.habits.filter(active=True):
        last_checkin = habit.checkins.order_by('-date').first()
        today = date.today()

        if last_checkin and (today - last_checkin.date).days > 1:
            message = f"Ви втратили серію у звичці «{habit.name}»!"
            notification = Notification.objects.create(user=user, message=message, send_web=True, send_telegram=True)
            send_web_notification(user, message, notification_id=notification.id, created_at=notification.created_at)
            send_telegram_notification(user, message)
        elif last_checkin and (today - last_checkin.date).days == 0:
            streak_length = habit.checkins.filter(completed=True).count()
            message = f"Ви не хочете втратити вашу {streak_length}-денну серію у «{habit.name}»?"
            notification = Notification.objects.create(user=user, message=message, send_web=True, send_telegram=True)
            send_web_notification(user, message, notification_id=notification.id, created_at=notification.created_at)
            send_telegram_notification(user, message)
