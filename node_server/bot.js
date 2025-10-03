require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios'); // для запитів до Django API
const socketClient = require('socket.io-client');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const socket = socketClient(process.env.SOCKET_URL || 'http://localhost:3000');

bot.start((ctx) => {
    ctx.reply('Вітаємо! Введіть код, який ви бачите на сайті, для прив’язки акаунта:');
});

bot.on('text', async (ctx) => {
    const code = ctx.message.text;
    try {
        const res = await axios.post(`${process.env.DJANGO_API}/bind_telegram/`, {
            bind_code: code,
            telegram_id: ctx.from.id
        });
        if(res.data.status === 'ok') {
            ctx.reply('Бот успішно прив’язаний до вашого акаунта!');
        } else {
            ctx.reply('Невірний код, спробуйте ще раз.');
        }
    } catch (err) {
        ctx.reply('Помилка привʼязки, спробуйте пізніше.');
    }
});



async function checkNotifications() {
    try {
        const res = await axios.get(`${process.env.DJANGO_API}/api/latest_notifications/`, {
            withCredentials: true
        });

        res.data.notifications.forEach((n) => {
            socket.emit('send_notification', { userId: n.user_id, message: n.message });

            if (n.send_telegram && n.telegram_id) {
                bot.telegram.sendMessage(n.telegram_id, n.message);
            }
        });
    } catch (err) {
        console.error('Error fetching notifications:', err.message);
    }
}

setInterval(checkNotifications, 30 * 1000);

bot.launch();
console.log('Telegram bot launched');
