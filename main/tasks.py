from celery import shared_task
from django.conf import settings
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
import asyncio


@shared_task
def reset_daily_activity():
    """Celery-задача для щоденного скидання активності користувачів"""
    from .models import UserActivity
    from .activity_tracker import get_monday_of_current_week
    
    print("🔄 Starting weekly activity reset...")
    
    current_monday = get_monday_of_current_week()
    activities_to_reset = UserActivity.objects.filter(week_start__lt=current_monday)
    
    reset_count = 0
    for activity in activities_to_reset:
        activity.reset_week()
        reset_count += 1
        print(f"✅ Reset activity for user: {activity.user.username}")
    
    print(f"🎯 Weekly activity reset completed. Reset {reset_count} user activities.")
    return f"Reset {reset_count} activities"

@shared_task
def cleanup_expired_password_resets():
    """Celery-задача для очистки старих запитів на скидання пароля"""
    from .models import PendingPasswordReset
    
    print("🧹 Starting cleanup of expired password resets...")
    
    expired_count = PendingPasswordReset.cleanup_expired()
    
    print(f"🎯 Cleanup completed. Removed {expired_count} expired password reset requests.")
    return f"Cleaned up {expired_count} expired resets"

async def send_2fa_async(telegram_id, username):
    """Асинхронно надсилає повідомлення з кнопками 2FA."""
    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
    keyboard = [[
        InlineKeyboardButton("✅ Approve Login", callback_data=f"2fa_approve_{username}"),
        InlineKeyboardButton("❌ Decline", callback_data=f"2fa_decline_{username}")
    ]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    message = await bot.send_message(
        chat_id=telegram_id,
        text=f"🔐 Please confirm login for user: *{username}*",
        parse_mode="Markdown",
        reply_markup=reply_markup
    )
    
    # Сохраняем message_id в базе данных для последующего обновления
    try:
        from django.contrib.auth.models import User
        from .models import Pending2FA
        
        user = User.objects.get(username=username)
        pending = Pending2FA.objects.filter(
            user=user, 
            telegram_id=telegram_id,
            confirmed=False,
            declined=False
        ).first()
        
        if pending:
            pending.telegram_message_id = str(message.message_id)
            pending.save()
            print(f"✅ Saved message_id {message.message_id} for user {username}")
    except Exception as e:
        print(f"⚠️ Failed to save message_id: {e}")
    
    return message.message_id

@shared_task
def send_2fa_request(telegram_id, username):
    """Celery-завдання для запуску асинхронного надсилання 2FA."""
    return asyncio.run(send_2fa_async(telegram_id, username))


async def send_2fa_decline_notification_async(telegram_id, username):
    """Асинхронное отправление уведомления об отклонении 2FA"""
    try:
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        
        # Отправляем новое сообщение об отклонении/истечении запроса
        await bot.send_message(
            chat_id=telegram_id,
            text=f"⏰ <b>2FA Request Expired</b>\n\n"
                 f"User: <code>{username}</code>\n"
                 f"Login request has been cancelled or timed out.\n\n"
                 f"🔒 If this wasn't you, please secure your account immediately.",
            parse_mode='HTML'
        )
        
        print(f"✅ 2FA expire notification sent to {telegram_id} for user {username}")
        
    except Exception as e:
        print(f"❌ Failed to send 2FA expire notification: {e}")


async def update_2fa_message_async(telegram_id, username, message_id=None):
    """Асинхронное обновление сообщения 2FA в Telegram для показа истечения"""
    try:
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        
        # Обновляем существующее сообщение, убирая кнопки
        expired_text = (
            f"⏰ <b>2FA Request Expired</b>\n\n"
            f"User: <code>{username}</code>\n"
            f"Login request has been cancelled or timed out.\n\n"
            f"🔒 If this wasn't you, please secure your account."
        )
        
        # Если у нас есть message_id, обновляем существующее сообщение
        if message_id:
            try:
                await bot.edit_message_text(
                    chat_id=telegram_id,
                    message_id=message_id,
                    text=expired_text,
                    parse_mode='HTML',
                    reply_markup=None  # Убираем кнопки
                )
                print(f"✅ Updated existing 2FA message {message_id} for user {username}")
                return True
            except Exception as edit_error:
                print(f"⚠️ Failed to edit message {message_id}: {edit_error}")
                # Fallback: отправляем новое сообщение
        
        # Если не удалось обновить или нет message_id, отправляем новое сообщение
        await bot.send_message(
            chat_id=telegram_id,
            text=expired_text,
            parse_mode='HTML'
        )
        
        print(f"✅ Sent new expire notification to {telegram_id} for user {username}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to update 2FA message: {e}")
        return False


@shared_task
def send_2fa_decline_notification(telegram_id, username):
    """Celery-задача для отправки уведомления об отклонении 2FA"""
    asyncio.run(send_2fa_decline_notification_async(telegram_id, username))


@shared_task
def update_2fa_message(telegram_id, username, message_id=None):
    """Celery-задача для обновления сообщения 2FA в Telegram"""
    return asyncio.run(update_2fa_message_async(telegram_id, username, message_id))


@shared_task  
def cleanup_declined_2fa(pending_id):
    """Celery-задача для очистки declined записей 2FA через определенное время"""
    try:
        from .models import Pending2FA
        
        pending = Pending2FA.objects.filter(id=pending_id, declined=True).first()
        if pending:
            username = pending.user.username
            pending.delete()
            print(f"🗑️ Cleaned up declined 2FA record for user: {username} (ID: {pending_id})")
            return f"Cleaned up 2FA record for {username}"
        else:
            print(f"🔍 No declined 2FA record found with ID: {pending_id}")
            return "No record found or already cleaned"
            
    except Exception as e:
        print(f"❌ Error cleaning up 2FA record {pending_id}: {str(e)}")
        return f"Error: {str(e)}"


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_habit_notifications(self):
    """
    Generate streak reminder notifications for users
    Sends reminders at: 2 hours, 1 hour, 30 min, 15 min, 5 min before day ends
    
    Optimization: Only runs during active period (21:00-00:05) to reduce logs and load.
    This reduces daily checks from ~288 to ~37 (87% reduction).
    
    Args:
        self: Task instance (bind=True для retry)
    
    Retries: 3 раза с интервалом 30 секунд при ошибках БД
    """
    from django.contrib.auth.models import User
    from django.utils import timezone
    from datetime import datetime, time, timedelta
    from .models import Habit, Notification, TelegramProfile
    from django.db import OperationalError
    
    try:
        print("🔔 Generating habit reminder notifications...")
        
        now = timezone.now()
        current_time = now.time()
        today = now.date()
        
        print(f"🕐 Current time: {now} (timezone: {timezone.get_current_timezone()})")
        
        # ОПТИМІЗАЦІЯ: Перевіряємо чи зараз "активний період" (21:00 - 00:05)
        current_hour = current_time.hour
        current_minute = current_time.minute
        
        # Активний період: з 21:00 до 00:05 наступного дня
        is_active_period = (
            current_hour >= 21 or  # Від 21:00 до 23:59
            (current_hour == 0 and current_minute <= 5)  # Від 00:00 до 00:05
        )
        
        if not is_active_period:
            if current_minute < 5:
                print(f"😴 Outside active period (21:00-00:05). Current time: {current_time.hour:02d}:{current_time.minute:02d}. Skipping check.")
            return "Outside active period"
        
        # End of day is 23:59:59
        end_of_day = time(23, 59, 59)
        end_of_day_datetime = timezone.make_aware(datetime.combine(today, end_of_day))
        time_until_midnight = (end_of_day_datetime - now).total_seconds() / 60  # minutes
        
        print(f"⏰ Time until midnight: {time_until_midnight:.1f} minutes")
        
        # Определяем временные интервалы для напоминаний (в минутах до конца дня)
        reminder_intervals = {
            120: "2 hours",  # 2 часа
            60: "1 hour",    # 1 час
            30: "30 minutes", # 30 минут
            15: "15 minutes", # 15 минут
            5: "5 minutes"    # 5 минут
        }
    
        # Определяем текущий интервал напоминания (с погрешностью ±2.5 минуты)
        # Это позволяет отправлять напоминания даже если таска запустилась с небольшой задержкой
        current_reminder = None
        for minutes, label in reminder_intervals.items():
            diff = abs(time_until_midnight - minutes)
            print(f"   Checking {label}: {diff:.1f} min difference")
            if diff <= 2.5:  # Увеличена погрешность с 2 до 2.5 минут
                current_reminder = (minutes, label)
                break
        
        if not current_reminder:
            print(f"⏰ No reminder scheduled for current time (next reminder at 2h, 1h, 30min, 15min, or 5min before midnight)")
            print(f"   Current time until midnight: {time_until_midnight:.1f} minutes")
            return "No reminder scheduled for current time"
        
        reminder_minutes, reminder_label = current_reminder
        print(f"🎯 Sending {reminder_label} reminder ({reminder_minutes} minutes before midnight)")
        
        notifications_sent = 0
        
        # Получаем всех пользователей с активными привычками
        users_with_habits = User.objects.filter(
            habits__active=True
        ).distinct()
        
        for user in users_with_habits:
            # Получаем активные привычки пользователя, которые НЕ выполнены сегодня
            incomplete_habits = []
            
            for habit in user.habits.filter(active=True):
                if not habit.is_checked_today():
                    incomplete_habits.append(habit)
            
            if not incomplete_habits:
                continue  # У пользователя все привычки выполнены
            
            # Проверяем настройки Telegram
            profile = getattr(user, 'telegram_profile', None)
            send_telegram = bool(profile and profile.connected and 
                            profile.telegram_id and profile.notifications_enabled)
            
            # Формируем сообщение на английском (как в Duolingo)
            if len(incomplete_habits) == 1:
                habit = incomplete_habits[0]
                if habit.current_streak > 0:
                    message = (
                        f"Hi {user.username}! 👋\n\n"
                        f"⚠️ Your {habit.current_streak}-day streak for '{habit.name}' is about to end!\n\n"
                        f"You have only {reminder_label} left to complete it today. "
                        f"Don't let all your hard work go to waste - keep your momentum going! 💪\n\n"
                        f"Complete it now to save your streak! 🔥"
                    )
                else:
                    message = (
                        f"Hi {user.username}! 👋\n\n"
                        f"📝 Friendly reminder: You haven't completed '{habit.name}' today.\n\n"
                        f"You have {reminder_label} left! "
                        f"Starting is the hardest part, but you've got this! "
                        f"Take the first step and build your streak now! 🚀"
                    )
            else:
                total_streak_days = sum(h.current_streak for h in incomplete_habits)
                habit_names = "', '".join([h.name for h in incomplete_habits[:3]])
                if len(incomplete_habits) > 3:
                    habit_names += f"' and {len(incomplete_habits) - 3} more"
                else:
                    habit_names = "'" + habit_names + "'"
                
                if total_streak_days > 0:
                    message = (
                        f"Hi {user.username}! 👋\n\n"
                        f"⚠️ Hurry up! You have {len(incomplete_habits)} habits that need attention today:\n"
                        f"{habit_names}\n\n"
                        f"Together, they represent {total_streak_days} days of streaks at risk! "
                        f"You only have {reminder_label} left. Don't let your progress slip away - "
                        f"you've worked too hard to get here. 💪\n\n"
                        f"Complete them now and keep your momentum strong! 🔥"
                    )
                else:
                    message = (
                        f"Hi {user.username}! 👋\n\n"
                        f"📝 You still have {len(incomplete_habits)} habits to complete today:\n"
                        f"{habit_names}\n\n"
                        f"Only {reminder_label} remaining! Every journey begins with a single step. "
                        f"Start now and build something amazing! 🚀\n\n"
                        f"You can do this! 💪"
                        )
            
            # Создаем уведомление
            notification = Notification.objects.create(
                user=user,
                message=message,
                notification_type='streak_reminder',
                send_web=True,
                send_telegram=send_telegram,
                scheduled_time=now
            )
            
            # Отправляем web-уведомление
            try:
                from .notification import send_web_notification
                send_web_notification(user, message)
                notification.web_sent = True
            except Exception as e:
                print(f"❌ Failed to send web notification to {user.username}: {e}")
            
            # Отправляем в Telegram если включено
            if send_telegram:
                try:
                    send_telegram_notification_task.delay(user.id, message)
                    notification.telegram_sent = True
                except Exception as e:
                    print(f"❌ Failed to send telegram notification to {user.username}: {e}")
            
            notification.save()
            notifications_sent += 1
            print(f"✅ Sent reminder to {user.username} ({len(incomplete_habits)} habits incomplete)")
        
        print(f"🎉 Sent {notifications_sent} streak reminder notifications")
        return f"Sent {notifications_sent} notifications"
    
    except OperationalError as e:
        print(f"❌ Database connection error: {e}")
        print(f"🔄 Retrying task (attempt {self.request.retries + 1}/3)...")
        # Retry через 30 секунд при ошибке БД
        raise self.retry(exc=e, countdown=30)
    
    except Exception as e:
        print(f"❌ Unexpected error in generate_habit_notifications: {e}")
        import traceback
        print(traceback.format_exc())
        # Для других ошибок не делаем retry
        return f"Error: {str(e)}"


@shared_task
def test_generate_habit_notifications(user_id=None):
    """
    ТЕСТОВАЯ версия: генерирует уведомления о привычках БЕЗ проверки времени
    Используется только для тестирования системы уведомлений
    
    Args:
        user_id: ID конкретного пользователя (опционально). Если не указан - для всех пользователей
    """
    from django.contrib.auth.models import User
    from django.utils import timezone
    from .models import Habit, Notification
    
    print("🧪 [TEST] Generating habit reminder notifications (without time check)...")
    
    now = timezone.now()
    notifications_sent = 0
    
    # Получаем пользователей с активными привычками
    if user_id:
        users_with_habits = User.objects.filter(id=user_id, habits__active=True).distinct()
        print(f"🎯 Testing for specific user ID: {user_id}")
    else:
        users_with_habits = User.objects.filter(habits__active=True).distinct()
        print(f"🎯 Testing for all users with habits")
    
    for user in users_with_habits:
        # Получаем активные привычки пользователя, которые НЕ выполнены сегодня
        incomplete_habits = []
        
        for habit in user.habits.filter(active=True):
            if not habit.is_checked_today():
                incomplete_habits.append(habit)
        
        if not incomplete_habits:
            print(f"✅ {user.username}: all habits completed today")
            continue
        
        # Проверяем настройки Telegram
        profile = getattr(user, 'telegram_profile', None)
        send_telegram = (profile and profile.connected and 
                        profile.telegram_id and profile.notifications_enabled)
        
        # Формируем тестовое сообщение
        if len(incomplete_habits) == 1:
            habit = incomplete_habits[0]
            if habit.current_streak > 0:
                message = (
                    f"Hi {user.username}! 👋\n\n"
                    f"⚠️ Your {habit.current_streak}-day streak for '{habit.name}' is at risk!\n\n"
                    f"You haven't completed this habit today yet. "
                    f"Don't let all your hard work go to waste - keep your momentum going! 💪\n\n"
                    f"Complete it now to maintain your streak! 🔥"
                )
            else:
                message = (
                    f"Hi {user.username}! 👋\n\n"
                    f"📝 Just a friendly reminder: You haven't completed '{habit.name}' today.\n\n"
                    f"Starting is the hardest part, but you've got this! "
                    f"Take the first step and build your streak now! 🚀"
                )
        else:
            total_streak_days = sum(h.current_streak for h in incomplete_habits)
            habit_names = "', '".join([h.name for h in incomplete_habits[:3]])
            if len(incomplete_habits) > 3:
                habit_names += f"' and {len(incomplete_habits) - 3} more"
            else:
                habit_names = "'" + habit_names + "'"
            
            if total_streak_days > 0:
                message = (
                    f"Hi {user.username}! 👋\n\n"
                    f"⚠️ You have {len(incomplete_habits)} habits that need attention today:\n"
                    f"{habit_names}\n\n"
                    f"Together, they represent {total_streak_days} days of streaks that could be lost! "
                    f"Don't let your progress slip away - you've worked too hard to get here. 💪\n\n"
                    f"Complete them now and keep your momentum strong! 🔥"
                )
            else:
                message = (
                    f"Hi {user.username}! 👋\n\n"
                    f"📝 You still have {len(incomplete_habits)} habits to complete today:\n"
                    f"{habit_names}\n\n"
                    f"Every journey begins with a single step. Start now and build something amazing! 🚀\n\n"
                    f"You can do this! 💪"
                )
        
        # Создаем уведомление
        notification = Notification.objects.create(
            user=user,
            message=message,
            notification_type='streak_reminder',
            send_web=True,
            send_telegram=send_telegram,
            scheduled_time=now
        )
        
        # Отправляем web-уведомление
        try:
            from .notification import send_web_notification
            send_web_notification(
                user=user,
                message=message,
                notification_id=notification.id,
                created_at=notification.created_at
            )
            notification.web_sent = True
            print(f"✅ Web notification sent to {user.username}")
        except Exception as e:
            print(f"❌ Failed to send web notification to {user.username}: {e}")
        
        # Отправляем в Telegram если включено
        if send_telegram:
            try:
                send_telegram_notification_task.delay(user.id, message)
                notification.telegram_sent = True
                print(f"✅ Telegram notification queued for {user.username}")
            except Exception as e:
                print(f"❌ Failed to send telegram notification to {user.username}: {e}")
        
        notification.save()
        notifications_sent += 1
        print(f"📬 Notification created for {user.username} ({len(incomplete_habits)} habits incomplete)")
    
    print(f"🎉 [TEST] Sent {notifications_sent} habit reminder notifications")
    return f"Sent {notifications_sent} notifications"


@shared_task
def send_telegram_notification_task(user_id, message):
    """Асинхронная отправка Telegram уведомления"""
    from django.contrib.auth.models import User
    
    try:
        user = User.objects.get(id=user_id)
        from .notification import send_telegram_notification
        send_telegram_notification(user, message)
        print(f"✅ Telegram notification sent to user {user.username}")
        return f"Sent to {user.username}"
    except User.DoesNotExist:
        print(f"❌ User with id {user_id} not found")
        return "User not found"
    except Exception as e:
        print(f"❌ Error sending telegram notification: {e}")
        return f"Error: {str(e)}"


@shared_task
def check_and_notify_broken_streaks():
    """
    Проверяет и уведомляет пользователей о потерянных streak
    Запускается в начале нового дня (00:05)
    """
    from django.contrib.auth.models import User
    from django.utils import timezone
    from datetime import timedelta
    from .models import Habit, Notification
    
    print("🔍 Checking for broken streaks...")
    
    yesterday = timezone.now().date() - timedelta(days=1)
    notifications_sent = 0
    
    users_with_habits = User.objects.filter(habits__active=True).distinct()
    
    for user in users_with_habits:
        broken_habits = []
        
        for habit in user.habits.filter(active=True):
            # Проверяем был ли streak и был ли checkin вчера
            if habit.streak_days > 0 and habit.last_checkin and habit.last_checkin < yesterday:
                broken_habits.append({
                    'name': habit.name,
                    'lost_streak': habit.streak_days
                })
        
        if not broken_habits:
            continue
        
        # Формируем сообщение о потерянных streak
        if len(broken_habits) == 1:
            habit_info = broken_habits[0]
            message = (
                f"💔 You lost your {habit_info['lost_streak']}-day streak in '{habit_info['name']}'.\n\n"
                f"Don't give up! Start a new streak today! 🚀"
            )
        else:
            total_lost = sum(h['lost_streak'] for h in broken_habits)
            message = (
                f"💔 You lost streaks in {len(broken_habits)} habits "
                f"(total {total_lost} days).\n\n"
                f"It's okay! Every day is a new opportunity. "
                f"Start fresh today! 💪"
            )
        
        # Проверяем настройки Telegram
        profile = getattr(user, 'telegram_profile', None)
        send_telegram = (profile and profile.connected and 
                        profile.telegram_id and profile.notifications_enabled)
        
        # Создаем уведомление
        notification = Notification.objects.create(
            user=user,
            message=message,
            notification_type='streak_reminder',
            send_web=True,
            send_telegram=send_telegram
        )
        
        # Отправляем уведомления
        try:
            from .notification import send_web_notification
            send_web_notification(user, message)
            notification.web_sent = True
        except Exception as e:
            print(f"❌ Failed to send web notification: {e}")
        
        if send_telegram:
            try:
                send_telegram_notification_task.delay(user.id, message)
                notification.telegram_sent = True
            except Exception as e:
                print(f"❌ Failed to send telegram notification: {e}")
        
        notification.save()
        notifications_sent += 1
        print(f"✅ Notified {user.username} about {len(broken_habits)} broken streaks")
    
    print(f"🎉 Sent {notifications_sent} broken streak notifications")
    return f"Sent {notifications_sent} notifications"
