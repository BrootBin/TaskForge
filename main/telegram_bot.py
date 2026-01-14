import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/../')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'TaskForge.settings')

import django
django.setup()

import logging
import aiohttp
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, BotCommand
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
    telegram_id = str(update.effective_user.id)
    
    # Проверяем, привязан ли уже аккаунт
    profile = await sync_to_async(lambda: TelegramProfile.objects.filter(
        telegram_id=telegram_id, 
        connected=True
    ).first())()
    
    if profile:
        # Користувач вже підключений
        user = await sync_to_async(lambda: profile.user)()
        await update.message.reply_text(
            f"🎉 <b>Welcome back, {user.username}!</b>\n\n"
            "✅ Your Telegram account is already linked to TaskForge.\n\n"
            "<b>Available commands:</b>\n"
            "📊 /status - Check your habits progress\n"
            "❓ /help - Show all commands\n"
            "🔒 /reset_password - Reset your password\n"
            "🔓 /unbind - Unlink your account\n\n"
            "💪 Ready to track your habits? Check your progress with /status!",
            parse_mode='HTML'
        )
    else:
        # Користувач не підключений
        await update.message.reply_text(
            "👋 <b>Welcome to TaskForge Bot!</b>\n\n"
            "🔗 To get started, you need to link your TaskForge account.\n\n"
            "<b>How to connect:</b>\n"
            "1️⃣ Log in to TaskForge website\n"
            "2️⃣ Go to your profile settings\n"
            "3️⃣ Copy your binding key\n"
            "4️⃣ Send <code>/bind &lt;your_key&gt;</code> to this bot\n\n"
            "<b>Available commands:</b>\n"
            "❓ /help - Show detailed help\n"
            "🔗 /bind &lt;key&gt; - Link your TaskForge account\n\n"
            "🚀 Let's get you connected!",
            parse_mode='HTML'
        )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = str(update.effective_user.id)
    
    # Проверяем, привязан ли аккаунт
    profile = await sync_to_async(lambda: TelegramProfile.objects.filter(
        telegram_id=telegram_id, 
        connected=True
    ).first())()
    
    if profile:
        # Користувач підключений - показуємо повний список команд
        user = await sync_to_async(lambda: profile.user)()
        help_text = f"""
🤖 <b>TaskForge Bot - Welcome {user.username}!</b>

<b>📊 Tracking Commands:</b>
📈 /status - Check your daily habits progress
🚀 /start - Welcome message

<b>⚙️ Account Management:</b>
🔒 /reset_password - Reset your TaskForge password
🔓 /unbind - Unlink your Telegram account
❓ /help - Show this help menu

<b>� Tips:</b>
• Use /status daily to track your progress
• Enable notifications in TaskForge settings for reminders
• Use 2FA for additional account security

<b>� Quick Access:</b>
Use the menu button (☰) next to message input for easy command access!
        """
    else:
        # Користувач не підключений - показуємо інструкції щодо підключення
        help_text = """
🤖 <b>TaskForge Bot - Get Started!</b>

<b>� First Time Setup:</b>
🚀 /start - Welcome message and instructions
🔗 /bind &lt;key&gt; - Link your TaskForge account

<b>💡 How to connect your account:</b>
1️⃣ Log in to TaskForge website
2️⃣ Go to profile settings and copy your 6-digit binding key
3️⃣ Send <code>/bind &lt;your_key&gt;</code> to this bot
4️⃣ Enable notifications and 2FA in your profile settings

<b>🔒 After Connecting:</b>
Once linked, you'll get access to:
• 📊 Daily habits progress tracking
• 🔔 Smart notifications and reminders
• 🔒 Secure password reset via Telegram
• 📈 Motivational progress updates

<b>Need help?</b> Start with /start to see connection instructions!
        """
    
    await update.message.reply_text(help_text, parse_mode="HTML")

async def bind(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = str(update.effective_user.id)
    
    # ПЕРЕВІРКА: Забороняємо використання команди якщо обліковий запис вже прив'язаний
    existing_connection = await sync_to_async(lambda: TelegramProfile.objects.filter(
        telegram_id=telegram_id, 
        connected=True
    ).first())()
    
    if existing_connection:
        user = await sync_to_async(lambda: existing_connection.user)()
        await update.message.reply_text(
            f"⚠️ <b>Account Already Linked</b>\n\n"
            f"Your Telegram account is already connected to <b>{user.username}</b>.\n\n"
            f"If you want to link a different account:\n"
            f"1️⃣ Use /unbind to disconnect current account\n"
            f"2️⃣ Then use /bind with your new key\n\n"
            f"Or use /status to check your current habits progress!",
            parse_mode='HTML'
        )
        return
    
    # Перевіряємо коректність команди
    if len(context.args) != 1:
        await update.message.reply_text(
            "❌ <b>Invalid Usage</b>\n\n"
            "Please use: <code>/bind &lt;your_key&gt;</code>\n\n"
            "💡 <b>How to get your key:</b>\n"
            "1️⃣ Log in to TaskForge website\n"
            "2️⃣ Go to profile settings\n"
            "3️⃣ Copy your 6-digit binding key\n"
            "4️⃣ Send <code>/bind &lt;key&gt;</code>",
            parse_mode='HTML'
        )
        return

    code = context.args[0]
    profile = await sync_to_async(lambda: TelegramProfile.objects.filter(bind_code=code).first())()

    if profile:
        if profile.connected and profile.telegram_id == telegram_id:
            await update.message.reply_text("✅ This Telegram account is already linked!")
            return

        # Перевіряємо чи цей telegram_id вже прив'язаний до іншого облікового запису (додаткова перевірка)
        existing_profile = await sync_to_async(lambda: TelegramProfile.objects.filter(telegram_id=telegram_id).first())()
        
        if existing_profile and existing_profile != profile:
            await update.message.reply_text("❌ This Telegram account is already linked to another user!")
            return

        try:
            profile.telegram_id = telegram_id
            profile.connected = True
            profile.bind_code = None
            await sync_to_async(profile.save)()
            
            user = await sync_to_async(lambda: profile.user)()
            await update.message.reply_text(
                f"🎉 <b>Account Successfully Linked!</b>\n\n"
                f"✅ Your Telegram is now connected to <b>{user.username}</b>\n\n"
                f"<b>What's next?</b>\n"
                f"📊 Use /status to check your habits\n"
                f"🔔 Enable notifications in TaskForge settings\n"
                f"🔐 Enable 2FA for extra security\n\n"
                f"🚀 You're all set to track your habits!",
                parse_mode='HTML'
            )
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
        await update.message.reply_text(
            "❌ <b>Invalid or Expired Key</b>\n\n"
            "The binding key you provided is not valid or has expired.\n\n"
            "💡 <b>Please:</b>\n"
            "1️⃣ Log in to TaskForge website\n"
            "2️⃣ Generate a new binding key in settings\n"
            "3️⃣ Try /bind again with the new key\n\n"
            "⏰ <b>Note:</b> Binding keys expire for security.",
            parse_mode='HTML'
        )

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
        
        # Перевіряємо, чи не закінчився запит (наприклад, старше 10 хвилин)
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
    
    # Перевіряємо, що обліковий запис прив'язаний
    profile = await sync_to_async(lambda: TelegramProfile.objects.select_related('user').filter(
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
    
    # Отримуємо користувача асинхронно
    user = await sync_to_async(lambda: profile.user)()
    
    # Перевірте, чи немає активного скидання пароля
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
    
    # Починаємо процес скидання пароля
    expires_at = timezone.now() + timedelta(minutes=15)
    
    reset_request = await sync_to_async(PendingPasswordReset.objects.create)(
        telegram_id=telegram_id,
        user=user,
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
    """Обробляє повідомлення для скидання пароля"""
    telegram_id = str(update.effective_user.id)
    message_text = update.message.text
    
    # Перевіряємо, чи є активна сесія скидання пароля
    pending_reset = await sync_to_async(lambda: PendingPasswordReset.objects.select_related('user').filter(
        telegram_id=telegram_id,
        is_confirmed=False,
        expires_at__gt=timezone.now()
    ).first())()
    
    if not pending_reset:
        return  # Не обробляємо, якщо немає активного скидання
    
    # Якщо новий пароль ще не встановлено
    if not pending_reset.new_password:
        # Валідація пароля
        if len(message_text) < 8:
            await update.message.reply_text(
                "❌ <b>Password Too Short</b>\n\n"
                "Password must be at least 8 characters long.\n"
                "Please try again.",
                parse_mode='HTML'
            )
            return
        
        # Зберігаємо новий пароль (хешуємо)
        hashed_password = make_password(message_text)
        pending_reset.new_password = hashed_password
        await sync_to_async(pending_reset.save)()
        
        # Видаляємо повідомлення з паролем безпеки
        try:
            await update.message.delete()
        except:
            pass
        
        # Просимо підтверждення
        await update.message.reply_text(
            "✅ <b>Password Set</b>\n\n"
            "Please type your new password again to confirm the change:",
            parse_mode='HTML'
        )
        return
    
    # Якщо пароль вже встановлений, перевіряємо підтвердження
    else:
        # Перевіряємо, чи збігаються паролі
        from django.contrib.auth.hashers import check_password
        
        if not check_password(message_text, pending_reset.new_password):
            await update.message.reply_text(
                "❌ <b>Passwords Don't Match</b>\n\n"
                "The passwords you entered don't match.\n"
                "Please type your new password again:",
                parse_mode='HTML'
            )
            return
        
        # Видаляємо повідомлення з паролем
        try:
            await update.message.delete()
        except:
            pass
        
        # Застосовуємо новий пароль
        user = await sync_to_async(lambda: pending_reset.user)()
        user.password = pending_reset.new_password
        await sync_to_async(user.save)()
        
        # Позначаємо скидання як завершене
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

# --- Status command ---
async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показує статус звичок користувача"""
    telegram_id = str(update.effective_user.id)
    
    # Перевіряємо, що обліковий запис прив'язаний
    profile = await sync_to_async(lambda: TelegramProfile.objects.select_related('user').filter(
        telegram_id=telegram_id, 
        connected=True
    ).first())()
    
    if not profile:
        await update.message.reply_text(
            "❌ <b>Account Not Linked</b>\n\n"
            "Your Telegram account is not linked to TaskForge.\n"
            "Please use /bind <key> to link your account first.",
            parse_mode='HTML'
        )
        return
    
    try:
        # Отримуємо користувача
        user = await sync_to_async(lambda: profile.user)()
        
        # Отримуємо звички користувача
        from main.models import Habit, HabitCheckin
        from django.utils import timezone
        
        habits = await sync_to_async(lambda: list(
            Habit.objects.filter(user=user, active=True)
        ))()
        
        if not habits:
            await update.message.reply_text(
                "📊 <b>Habits Status</b>\n\n"
                "You don't have any active habits yet.\n"
                "Create some habits in TaskForge to track your progress!",
                parse_mode='HTML'
            )
            return
        
        today = timezone.now().date()
        status_text = "📊 <b>Today's Habits Status</b>\n\n"
        
        completed_count = 0
        total_count = len(habits)
        
        for habit in habits:
            # Перевіряємо виконання звички сьогодні
            is_completed = await sync_to_async(lambda h=habit: 
                HabitCheckin.objects.filter(habit=h, date=today, completed=True).exists()
            )()
            
            if is_completed:
                status_text += f"✅ {habit.name}\n"
                completed_count += 1
            else:
                status_text += f"⭕ {habit.name}\n"
        
       # Додаємо загальну статистику
        percentage = (completed_count / total_count * 100) if total_count > 0 else 0
        status_text += f"\n📈 <b>Progress: {completed_count}/{total_count} ({percentage:.0f}%)</b>"
        
        if completed_count == total_count:
            status_text += "\n\n🎉 <b>Perfect day! All habits completed!</b>"
        elif completed_count == 0:
            status_text += "\n\n💪 <b>Time to start your habits!</b>"
        else:
            status_text += f"\n\n🔥 <b>Keep going! {total_count - completed_count} habits left!</b>"
        
        await update.message.reply_text(status_text, parse_mode='HTML')
        
    except Exception as e:
        logging.error(f"Error getting habits status: {e}")
        await update.message.reply_text(
            "❌ <b>Error</b>\n\n"
            "Failed to get your habits status. Please try again later.",
            parse_mode='HTML'
        )

# --- Bot Commands Setup ---
async def setup_bot_commands(application):
    """Налаштування меню команд бота"""
    commands = [
        BotCommand("start", "🚀 Start using TaskForge"),
        BotCommand("help", "❓ Get help and available commands"),
        BotCommand("bind", "🔗 Link Telegram to TaskForge account"),
        BotCommand("unbind", "🔓 Unlink Telegram account"),
        BotCommand("reset_password", "🔒 Reset TaskForge password"),
        BotCommand("status", "📊 Check your habits status"),
    ]
    
    try:
        await application.bot.set_my_commands(commands)
        logging.info("✅ Bot commands menu set successfully!")
    except Exception as e:
        logging.error(f"❌ Failed to set bot commands: {e}")

# --- Application setup ---
application = ApplicationBuilder().token(TOKEN).build()

# Налаштовуємо команди після ініціалізації програми
async def post_init(application):
    """Функція викликається після ініціалізації програми"""
    await setup_bot_commands(application)

application.post_init = post_init

application.add_handler(CommandHandler("start", start))
application.add_handler(CommandHandler("help", help_command))
application.add_handler(CommandHandler("bind", bind))
application.add_handler(CommandHandler("unbind", unbind))
application.add_handler(CommandHandler("reset_password", reset_password))
application.add_handler(CommandHandler("status", status))
application.add_handler(CommandHandler("notify", notify))
application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
application.add_handler(CallbackQueryHandler(button_callback))

# --- Run bot ---
if __name__ == "__main__":
    logging.info("🚀 Telegram bot started...")
    application.run_polling()