require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // або конкретний фронтенд URL
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Простий ping для перевірки
app.get('/', (req, res) => res.send('Socket.IO server running'));

// Логіка надсилання повідомлень від бота/сервера
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Сервер може надсилати повідомлення фронтенду
    socket.on('send_notification', (data) => {
        // data = {userId, message}
        io.emit(`user_${data.userId}`, data.message);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Socket.IO listening on port ${PORT}`));
