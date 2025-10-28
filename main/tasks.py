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
