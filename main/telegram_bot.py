import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/../')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'TaskForge.settings')

import django
django.setup()

import logging
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes, MessageHandler, filters
from django.contrib.auth.models import User
from main.models import TelegramProfile, Pending2FA
from asgiref.sync import sync_to_async
from django.conf import settings

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

TOKEN = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('Привіт! Надішліть /bind <код> для привʼязки акаунта.')

async def bind(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if len(context.args) != 1:
        await update.message.reply_text('Використання: /bind <код>')
        return
    code = context.args[0]
    profile = await sync_to_async(lambda: TelegramProfile.objects.filter(bind_code=code).first())()
    if profile:
        if profile.connected and profile.telegram_id == str(update.effective_user.id):
            await update.message.reply_text('Акаунт вже привʼязаний до цього Telegram!')
            return
        profile.telegram_id = str(update.effective_user.id)
        profile.connected = True
        profile.bind_code = None
        await sync_to_async(profile.save)()
        await update.message.reply_text('Акаунт успішно привʼязано! Тепер ви можете включити повідомлення та двохфакторну аутентифікацію.')
    else:
        await update.message.reply_text('Код не знайдено або вже використаний.')

async def confirm_2fa(update: Update, context: ContextTypes.DEFAULT_TYPE):
    profile = await sync_to_async(lambda: TelegramProfile.objects.filter(telegram_id=str(update.effective_user.id)).first())()
    if not profile or not profile.connected:
        await update.message.reply_text('Акаунт не привʼязаний. Спочатку привʼяжіть Telegram через /bind <код>.')
        return
    pending = await sync_to_async(lambda: Pending2FA.objects.filter(user=profile.user, telegram_id=profile.telegram_id).first())()
    if pending:
        pending.confirmed = True
        await sync_to_async(pending.save)()
        await update.message.reply_text('2FA підтверджено! Можете увійти на сайті.')
    else:
        await update.message.reply_text('Немає активного запиту 2FA.')

async def notify(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('Тестове повідомлення!')

application = ApplicationBuilder().token(TOKEN).build()
application.add_handler(CommandHandler('start', start))
application.add_handler(CommandHandler('bind', bind))
application.add_handler(CommandHandler('2fa', confirm_2fa))
application.add_handler(CommandHandler('notify', notify))

if __name__ == '__main__':
    application.run_polling()
