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
    ContextTypes,
    CallbackQueryHandler
)
from django.contrib.auth.models import User
from main.models import TelegramProfile, Pending2FA
from asgiref.sync import sync_to_async
from django.conf import settings

# --- Logging ---
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

TOKEN = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)

# --- Commands ---

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("👋 Hi! Send /bind <key> to connect your account.")

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

        profile.telegram_id = str(update.effective_user.id)
        profile.connected = True
        profile.bind_code = None
        await sync_to_async(profile.save)()
        await update.message.reply_text("✅ Account successfully linked! You can now enable notifications and 2FA.")
    else:
        await update.message.reply_text("❌ Invalid or expired key.")

# --- Inline 2FA confirmation ---
async def send_2fa_request_message(bot, telegram_id, username):
    keyboard = [
        [
            InlineKeyboardButton("✅ Approve", callback_data=f"approve_{username}"),
            InlineKeyboardButton("❌ Decline", callback_data=f"decline_{username}")
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

    data = query.data.split("_")
    action, username = data[0], "_".join(data[1:])

    user = await sync_to_async(lambda: User.objects.filter(username=username).first())()
    if not user:
        await query.edit_message_text("❌ User not found.")
        return

    pending = await sync_to_async(lambda: Pending2FA.objects.filter(user=user, confirmed=False).first())()
    if not pending:
        await query.edit_message_text("⏱️ No active 2FA request.")
        return

    if action == "approve":
        pending.confirmed = True
        await sync_to_async(pending.save)()

        # Notify backend to log the user in
        api_url = "https://localhost:8000/api/telegram_2fa/"  
        async with aiohttp.ClientSession() as session:
            await session.post(api_url, json={
                "telegram_id": query.from_user.id,
                "username": username
            })

        await query.edit_message_text("✅ Login approved! You are now signed in.")
    else:
        await sync_to_async(pending.delete)()
        await query.edit_message_text("🚫 Login request declined.")

# --- Test command ---
async def notify(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Test message!")

# --- Application setup ---
application = ApplicationBuilder().token(TOKEN).build()
application.add_handler(CommandHandler("start", start))
application.add_handler(CommandHandler("bind", bind))
application.add_handler(CommandHandler("notify", notify))
application.add_handler(CallbackQueryHandler(button_callback))

# --- Run bot ---
if __name__ == "__main__":
    logging.info("🚀 Telegram bot started...")
    application.run_polling()