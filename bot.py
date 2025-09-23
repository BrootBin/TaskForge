from telegram.ext import Application, CommandHandler
from decouple import config

TOKEN = config('BOT_TOKEN')

async def start(update, context):
    await update.message.reply_text("Привіт 👋 Я бот для нагадувань!")

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.run_polling()

if __name__ == "__main__":
    main()
