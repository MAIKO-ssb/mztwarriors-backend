// server.js - PURE backend for Railway.app (NO NEXT.JS)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // We'll tighten this later with your Vercel URL
    methods: ["GET", "POST"]
  }
});

// Health check so Railway never sleeps
app.get('/', (req, res) => {
  res.send('MZT Warriors Multiplayer Server - LIVE from the Manzanita Forest!');
});

const players = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create player
  players[socket.id] = {
    id: socket.id,
    position: { x: 100, y: 650 },
    direction: 'right',
    isMoving: false,
    isAirborne: false
  };

  // Tell everyone else about the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);
  // Tell the new player about everyone else
  socket.emit('currentPlayers', Object.values(players).filter(p => p.id !== socket.id));

  // === ALL YOUR EVENTS BELOW (exactly as before) ===
  socket.on('newPlayer', (data) => {
    if (players[socket.id]) {
      players[socket.id].position = {
        x: data.x && Number.isFinite(data.x) ? data.x : 100,
        y: data.y && Number.isFinite(data.y) ? data.y : 650
      };
      socket.broadcast.emit('newPlayer', players[socket.id]);
    }
  });

  socket.on('playerMovement', (data) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    p.position = {
      x: data.position?.x && Number.isFinite(data.position.x) ? data.position.x : p.position.x,
      y: data.position?.y && Number.isFinite(data.position.y) ? data.position.y : p.position.y
    };
    p.direction = data.direction || 'right';
    p.isMoving = !!data.isMoving;
    p.isAirborne = !!data.isAirborne;

    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      position: p.position,
      direction: p.direction,
      isMoving: p.isMoving,
      isAirborne: p.isAirborne
    });
  });

  socket.on('playerJump', (data) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    p.position = {
      x: data.position?.x && Number.isFinite(data.position.x) ? data.position.x : p.position.x,
      y: data.position?.y && Number.isFinite(data.position.y) ? data.position.y : p.position.y
    };
    p.direction = data.direction || 'right';
    p.isAirborne = true;

    socket.broadcast.emit('playerJumped', {
      id: socket.id,
      position: p.position,
      direction: p.direction,
      velocityY: data.velocityY || 0
    });
  });

  socket.on('playerAttack', (data) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    p.position = {
      x: data.position?.x && Number.isFinite(data.position.x) ? data.position.x : p.position.x,
      y: data.position?.y && Number.isFinite(data.position.y) ? data.position.y : p.position.y
    };
    p.direction = data.direction || 'right';
    p.isAirborne = !!data.isAirborne;

    socket.broadcast.emit('playerAttacked', {
      id: socket.id,
      position: p.position,
      direction: p.direction,
      isAirborne: p.isAirborne
    });
  });

  socket.on('chatMessage', (message) => {
    io.emit('chatMessageReceived', message);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    socket.broadcast.emit('playerDisconnected', { id: socket.id });
  });
});

// CRITICAL: Use Railway's PORT
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`MZT Warriors backend running on port ${PORT}`);
});