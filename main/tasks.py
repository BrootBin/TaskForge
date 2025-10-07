import asyncio
from celery import shared_task
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
from django.conf import settings

async def send_2fa_async(telegram_id, username):
    bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
    keyboard = [[InlineKeyboardButton("✅ Approve", callback_data=f"approve_{username}"),
                 InlineKeyboardButton("❌ Decline", callback_data=f"decline_{username}")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await bot.send_message(
        chat_id=telegram_id,
        text=f"🔐 Please confirm login for *{username}*:",
        parse_mode="Markdown",
        reply_markup=reply_markup
    )

@shared_task
def send_2fa_request(telegram_id, username):
    asyncio.run(send_2fa_async(telegram_id, username))
