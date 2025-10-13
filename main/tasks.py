from celery import shared_task
from django.conf import settings
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
import asyncio

async def send_2fa_async(telegram_id, username):
    """Асинхронно надсилає повідомлення з кнопками 2FA."""
    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
    keyboard = [[
        InlineKeyboardButton("✅ Approve Login", callback_data=f"2fa_approve_{username}"),
        InlineKeyboardButton("❌ Decline", callback_data=f"2fa_decline_{username}")
    ]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await bot.send_message(
        chat_id=telegram_id,
        text=f"🔐 Please confirm login for user: *{username}*",
        parse_mode="Markdown",
        reply_markup=reply_markup
    )

@shared_task
def send_2fa_request(telegram_id, username):
    """Celery-завдання для запуску асинхронного надсилання 2FA."""
    asyncio.run(send_2fa_async(telegram_id, username))
