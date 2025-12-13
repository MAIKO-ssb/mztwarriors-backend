// server.js — ONE FILE TO RULE THEM ALL (local + Render + future hosts)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS — safe but open enough for dev + production
const io = new Server(server, {
  cors: {
    origin: "*", // We'll tighten this later with your Vercel URL
    methods: ["GET", "POST"]
  }
});

// Health check + nice page (keeps Render awake and Railway awake)
app.get('/', (req, res) => {
  res.send(`
    <h1>MZT Warriors Multiplayer Server — LIVE</h1>
    <p>Players online: ${io.engine.clientsCount}</p>
    <p>Time: ${new Date().toLocaleString()}</p>
    <p>Deployed on Render • Local dev ready</p>
  `);
});

const players = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create player — better spawn point (center of your world)
  players[socket.id] = {
    id: socket.id,
    position: { x: 640, y: 500 },
    direction: 'right',
    isMoving: false,
    isAirborne: false
  };

  // Send existing players to the new one
  socket.emit('currentPlayers', Object.values(players).filter(p => p.id !== socket.id));

  // Tell everyone else about the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // === ALL YOUR EVENTS BELOW (exactly as before) ===
  socket.on('newPlayer', (data) => {
    if (!players[socket.id]) return;
    players[socket.id].position = {
      x: Number.isFinite(data.x) ? data.x : 640,
      y: Number.isFinite(data.y) ? data.y : 500
    };
    socket.broadcast.emit('newPlayer', players[socket.id]);
  });

  socket.on('playerMovement', (data) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    p.position = {
      x: Number.isFinite(data.position?.x) ? data.position.x : p.position.x,
      y: Number.isFinite(data.position?.y) ? data.position.y : p.position.y
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
      x: Number.isFinite(data.position?.x) ? data.position.x : p.position.x,
      y: Number.isFinite(data.position?.y) ? data.position.y : p.position.y
    };
    p.direction = data.direction || 'right';
    p.isAirborne = true;

    socket.broadcast.emit('playerJumped', {
      id: socket.id,
      position: p.position,
      direction: p.direction,
      velocityY: data.velocityY || -500
    });
  });

  socket.on('playerAttack', (data) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    p.position = {
      x: Number.isFinite(data.position?.x) ? data.position.x : p.position.x,
      y: Number.isFinite(data.position?.y) ? data.position.y : p.position.y
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

  socket.on('chatMessage', (msg) => {
    io.emit('chatMessageReceived', { ...msg, id: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    socket.broadcast.emit('playerDisconnected', { id: socket.id });
  });
});

// THIS LINE IS CRITICAL — works on Render, Railway, local, everywhere
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`MZT Warriors backend running on port ${PORT}`);
  console.log(`→ Local: http://localhost:${PORT}`);
  console.log(`→ Render: https://mztwarriors-backend.onrender.com`);
});