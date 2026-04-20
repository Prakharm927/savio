// server/ws-server.js
require('dotenv').config();
const WebSocket = require('ws');
const Redis = require('ioredis');
const pino = require('pino');

const log = pino();
const wss = new WebSocket.Server({ port: process.env.WS_PORT || 8080 });
const sub = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const channels = {}; // h3cell -> Set of ws

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));

  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.type === 'subscribe' && parsed.cell) {
        const cell = parsed.cell;
        channels[cell] = channels[cell] || new Set();
        channels[cell].add(ws);
        ws.subscribedCell = cell;
        log.info({ cell }, 'client subscribed');
      }
      if (parsed.type === 'unsubscribe' && parsed.cell) {
        const s = channels[parsed.cell];
        if (s) s.delete(ws);
      }
    } catch (e) {
      // ignore malformed messages
    }
  });

  ws.on('close', () => {
    if (ws.subscribedCell && channels[ws.subscribedCell]) {
      channels[ws.subscribedCell].delete(ws);
    }
  });
});

sub.subscribe('coverage_updates', (err) => {
  if (err) log.error(err);
});

sub.on('message', (channel, message) => {
  if (channel !== 'coverage_updates') return;
  try {
    const { cell, platform, payload } = JSON.parse(message);
    const set = channels[cell];
    if (!set) return;
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'update', cell, platform, payload }));
      }
    }
  } catch (e) {
    log.error('bad message', e);
  }
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

log.info('WebSocket server running on port', process.env.WS_PORT || 8080);
