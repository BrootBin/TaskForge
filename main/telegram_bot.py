import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/../')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'TaskForge.settings')

import django
django.setup()

import logging
import aiohttp
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    CallbackQueryHandler,
    filters
)
from django.contrib.auth.models import User
from main.models import TelegramProfile, Pending2FA, PendingPasswordReset
from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import IntegrityError
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import timedelta

# --- Logging ---
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

TOKEN = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)

# --- Commands ---

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Hi! Send /bind <key> to connect your account.\n\n"
        "Available commands:\n"
        "/help - Show detailed help\n"
        "/bind <key> - Link your TaskForge account\n"
        "/reset_password - Reset your password (for linked accounts)\n"
        "/unbind - Unlink your account"
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = """
🤖 **TaskForge Bot Commands:**

/start - Welcome message
/help - Show this help
/bind <key> - Link your TaskForge account with the provided key
/unbind - Unlink your Telegram account from TaskForge
/reset_password - Reset your TaskForge password (for linked accounts)
/notify - Test notification (for testing)

💡 **How to link your account:**
1. Log in to TaskForge website
2. Copy your binding key from profile settings
3. Send `/bind <your_key>` to this bot
4. Enable notifications and 2FA in your profile settings

🔒 **Password Recovery:**
If you forgot your password but have Telegram linked, use `/reset_password` to securely change it.
    """
    await update.message.reply_text(help_text, parse_mode="Markdown")

async def bind(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if len(context.args) != 1:
        await update.message.reply_text("Usage: /bind <key>")
        return

    code = context.args[0]
    profile = await sync_to_async(lambda: TelegramProfile.objects.filter(bind_code=code).first())()

    if profile:
        if profile.connected and profile.telegram_id == str(update.effective_user.id):
            await update.message.reply_text("✅ This Telegram account is already linked!")
            return

        # Перевіряємо чи цей telegram_id вже прив'язаний до іншого аккаунта
        telegram_id = str(update.effective_user.id)
        existing_profile = await sync_to_async(lambda: TelegramProfile.objects.filter(telegram_id=telegram_id).first())()
        
        if existing_profile and existing_profile != profile:
            await update.message.reply_text("❌ This Telegram account is already linked to another user!")
            return

        try:
            profile.telegram_id = telegram_id
            profile.connected = True
            profile.bind_code = None
            await sync_to_async(profile.save)()
            await update.message.reply_text("✅ Account successfully linked! You can now enable notifications and 2FA.")
        except IntegrityError as e:
            # Обробка помилки дублювання telegram_id
            if "telegram_id" in str(e) and "unique constraint" in str(e):
                await update.message.reply_text("❌ This Telegram account is already linked to another user!")
            else:
                await update.message.reply_text("❌ An error occurred while linking your account. Please try again.")
            logging.error(f"IntegrityError linking Telegram account: {e}")
        except Exception as e:
            await update.message.reply_text("❌ An unexpected error occurred. Please try again.")
            logging.error(f"Unexpected error linking Telegram account: {e}")
    else:
        await update.message.reply_text("❌ Invalid or expired key.")

# --- Inline 2FA confirmation ---
async def send_2fa_request_message(bot, telegram_id, username):
    keyboard = [
        [
            InlineKeyboardButton("✅ Approve", callback_data=f"2fa_approve_{username}"),
            InlineKeyboardButton("❌ Decline", callback_data=f"2fa_decline_{username}")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await bot.send_message(
        chat_id=telegram_id,
        text=f"🔐 Please confirm login for *{username}*:",
        parse_mode="Markdown",
        reply_markup=reply_markup
    )

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    # Loging data for debugging --- IGNORE ---
    callback_data = query.data
    telegram_id = str(update.effective_user.id)
    logging.info(f"Processing callback: {callback_data} from user ID: {telegram_id}")

    # Split and handle different formats --- IGNORE ---
    parts = callback_data.split("_")
    
    try:
        # Format 2fa_approve_username
        if len(parts) >= 3 and parts[0] == "2fa" and parts[1] in ["approve", "decline"]:
            action = parts[1]
            username = "_".join(parts[2:])
        
        elif len(parts) >= 2 and parts[0] in ["approve", "decline"]:
            action = parts[0]
            username = "_".join(parts[1:])
        else:
            logging.error(f"Невідомий формат callback даних: {callback_data}")
            await query.edit_message_text("❌ Невірний формат даних запиту.")
            return
        
        logging.info(f"Обработка: действие={action}, пользователь={username}, telegram_id={telegram_id}")
        
        # Search user --- IGNORE ---
        user = await sync_to_async(lambda: User.objects.filter(username=username).first())()
        if not user:
            logging.error(f"Пользователь не найден: {username}")
            await query.edit_message_text(f"❌ Пользователь '{username}' не найден.")
            return

        # Search for 2FA request - check by user and telegram_id
        pending = await sync_to_async(
            lambda: Pending2FA.objects.filter(user=user, telegram_id=telegram_id).first() or 
                   Pending2FA.objects.filter(user=user).first()
        )()
        
        if not pending:
            logging.error(f"Active 2FA request for user {username} not found")
            await query.edit_message_text(
                "⏱️ <b>Request Expired</b>\n\n"
                "This 2FA request is no longer active or has already been processed.\n\n"
                "🔒 If you didn't initiate this request, please secure your account.",
                parse_mode='HTML'
            )
            return
        
        # Проверяем, не истёк ли запрос (например, старше 10 минут)
        from django.utils import timezone
        import datetime
        
        time_limit = timezone.now() - datetime.timedelta(minutes=10)
        if pending.created_at < time_limit:
            logging.warning(f"2FA request expired for user {username}")
            await sync_to_async(pending.delete)()
            await query.edit_message_text(
                "⏱️ <b>Request Expired</b>\n\n"
                "This 2FA request has timed out.\n\n"
                "🔒 If you didn't initiate this request, please secure your account.",
                parse_mode='HTML'
            )
            return
        
        # Handle approve/decline actions
        if action == "approve":
            pending.confirmed = True
            await sync_to_async(pending.save)()
            await query.edit_message_text(
                "✅ <b>Login Approved</b>\n\n"
                f"User: <code>{username}</code>\n"
                "You can continue on the website.",
                parse_mode='HTML'
            )
            logging.info(f"2FA confirmed for user: {username}")
        else:  # decline
            logging.info(f"🚫 Setting declined=True for user: {username}, pending ID: {pending.id}")
            pending.declined = True
            await sync_to_async(pending.save)()
            logging.info(f"🚫 Saved declined status for pending ID: {pending.id}")
            await query.edit_message_text(
                "🚫 <b>Login Request Declined</b>\n\n"
                f"User: <code>{username}</code>\n"
                "Login request has been cancelled.\n\n"
                "🔒 If this wasn't you, your account is secure.",
                parse_mode='HTML'
            )
            logging.info(f"2FA declined for user: {username}")
    
    except Exception as e:
        logging.error(f"Error processing callback: {str(e)}")
        await query.edit_message_text(
            "❌ <b>Error</b>\n\n"
            "An error occurred while processing your request.\n"
            "Please try again or contact support.",
            parse_mode='HTML'
        )

# --- Test command ---
async def notify(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Test message!")

# --- Password reset command ---
async def reset_password(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = str(update.effective_user.id)
    
    # Проверяем, что аккаунт привязан
    profile = await sync_to_async(lambda: TelegramProfile.objects.filter(
        telegram_id=telegram_id, 
        connected=True
    ).first())()
    
    if not profile:
        await update.message.reply_text(
            "❌ <b>Account Not Linked</b>\n\n"
            "Your Telegram account is not linked to TaskForge or the connection is inactive.\n"
            "Please link your account first using /bind <key>",
            parse_mode='HTML'
        )
        return
    
    # Проверяем, нет ли активного сброса пароля
    existing_reset = await sync_to_async(lambda: PendingPasswordReset.objects.filter(
        telegram_id=telegram_id,
        is_confirmed=False,
        expires_at__gt=timezone.now()
    ).first())()
    
    if existing_reset:
        await update.message.reply_text(
            "⏳ <b>Reset Already in Progress</b>\n\n"
            "You already have an active password reset session.\n"
            "Please complete it or wait for it to expire before starting a new one.",
            parse_mode='HTML'
        )
        return
    
    # Начинаем процесс сброса пароля
    expires_at = timezone.now() + timedelta(minutes=15)
    
    reset_request = await sync_to_async(PendingPasswordReset.objects.create)(
        telegram_id=telegram_id,
        user=profile.user,
        expires_at=expires_at
    )
    
    await update.message.reply_text(
        "🔒 <b>Password Reset Started</b>\n\n"
        "Please enter your new password:\n"
        "• Minimum 8 characters\n"
        "• Use letters, numbers, and symbols for security\n\n"
        "⏰ This session expires in 15 minutes.\n"
        "Send your new password as a regular message.",
        parse_mode='HTML'
    )

# --- Handle password reset messages ---
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обрабатывает сообщения для сброса пароля"""
    telegram_id = str(update.effective_user.id)
    message_text = update.message.text
    
    # Проверяем, есть ли активная сессия сброса пароля
    pending_reset = await sync_to_async(lambda: PendingPasswordReset.objects.filter(
        telegram_id=telegram_id,
        is_confirmed=False,
        expires_at__gt=timezone.now()
    ).first())()
    
    if not pending_reset:
        return  # Не обрабатываем, если нет активного сброса
    
    # Если новый пароль еще не установлен
    if not pending_reset.new_password:
        # Валидация пароля
        if len(message_text) < 8:
            await update.message.reply_text(
                "❌ <b>Password Too Short</b>\n\n"
                "Password must be at least 8 characters long.\n"
                "Please try again.",
                parse_mode='HTML'
            )
            return
        
        # Сохраняем новый пароль (хешируем)
        hashed_password = make_password(message_text)
        pending_reset.new_password = hashed_password
        await sync_to_async(pending_reset.save)()
        
        # Удаляем сообщение с паролем для безопасности
        try:
            await update.message.delete()
        except:
            pass
        
        # Просим подтверждения
        await update.message.reply_text(
            "✅ <b>Password Set</b>\n\n"
            "Please type your new password again to confirm the change:",
            parse_mode='HTML'
        )
        return
    
    # Если пароль уже установлен, проверяем подтверждение
    else:
        # Проверяем, совпадают ли пароли
        from django.contrib.auth.hashers import check_password
        
        if not check_password(message_text, pending_reset.new_password):
            await update.message.reply_text(
                "❌ <b>Passwords Don't Match</b>\n\n"
                "The passwords you entered don't match.\n"
                "Please type your new password again:",
                parse_mode='HTML'
            )
            return
        
        # Удаляем сообщение с паролем
        try:
            await update.message.delete()
        except:
            pass
        
        # Применяем новый пароль
        user = pending_reset.user
        user.password = pending_reset.new_password
        await sync_to_async(user.save)()
        
        # Помечаем сброс как завершенный
        pending_reset.is_confirmed = True
        await sync_to_async(pending_reset.save)()
        
        await update.message.reply_text(
            "🎉 <b>Password Changed Successfully!</b>\n\n"
            "Your TaskForge password has been updated.\n"
            "You can now log in with your new password.\n\n"
            "🔐 For security, please log in as soon as possible.",
            parse_mode='HTML'
        )

# --- Unbind command ---
async def unbind(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = str(update.effective_user.id)
    profile = await sync_to_async(lambda: TelegramProfile.objects.filter(telegram_id=telegram_id).first())()
    
    if profile:
        try:
            profile.telegram_id = None
            profile.connected = False
            profile.two_factor_enabled = False
            # Генеруємо новий код для повторного підключення
            import random
            import string
            profile.bind_code = ''.join(random.choices(string.digits, k=6))
            await sync_to_async(profile.save)()
            await update.message.reply_text("✅ Account unlinked successfully! Use /bind <new_key> if you want to link again.")
        except Exception as e:
            await update.message.reply_text("❌ An error occurred while unlinking your account.")
            logging.error(f"Error unlinking Telegram account: {e}")
    else:
        await update.message.reply_text("❌ No linked account found for this Telegram ID.")

# --- Application setup ---
application = ApplicationBuilder().token(TOKEN).build()
application.add_handler(CommandHandler("start", start))
application.add_handler(CommandHandler("help", help_command))
application.add_handler(CommandHandler("bind", bind))
application.add_handler(CommandHandler("unbind", unbind))
application.add_handler(CommandHandler("reset_password", reset_password))
application.add_handler(CommandHandler("notify", notify))
application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
application.add_handler(CallbackQueryHandler(button_callback))

# --- Run bot ---
if __name__ == "__main__":
    logging.info("🚀 Telegram bot started...")
    application.run_polling()