const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

io.on('connection', (socket) => {

  socket.on('create_room', () => {
    const roomId = generateRoomId();
    rooms[roomId] = { players: [socket.id], state: null };
    socket.join(roomId);
    socket.roomId = roomId;
    socket.playerNum = 1;
    socket.emit('room_created', { roomId, playerNum: 1 });
  });

  socket.on('join_room', (roomId) => {
    const room = rooms[roomId.toUpperCase()];
    if (!room) { socket.emit('error_msg', 'Room not found.'); return; }
    if (room.players.length >= 2) { socket.emit('error_msg', 'Room is full!'); return; }
    room.players.push(socket.id);
    socket.join(roomId.toUpperCase());
    socket.roomId = roomId.toUpperCase();
    socket.playerNum = 2;
    socket.emit('room_joined', { roomId: roomId.toUpperCase(), playerNum: 2 });
    io.to(room.players[0]).emit('opponent_joined');
  });

  socket.on('game_event', (data) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    socket.to(roomId).emit('game_event', data);
  });

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      socket.to(roomId).emit('opponent_disconnected');
      delete rooms[roomId];
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log('Power Chess server running on port ' + PORT);
});
