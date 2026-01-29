// Elegans - Video Sync WebSocket Server
// Glitch.com'a yükleyin

const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Elegans Sync Server Running!</h1><p>WebSocket baglantisi icin wss:// kullanin</p>');
});

const wss = new WebSocket.Server({ server });

const rooms = new Map();
const users = new Map();

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function broadcast(roomId, msg, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.members.forEach(m => {
    if (m.ws !== excludeWs && m.ws.readyState === WebSocket.OPEN) {
      m.ws.send(JSON.stringify(msg));
    }
  });
}

function getMembers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return room.members.map(m => ({
    username: m.username,
    isHost: m.isHost,
    hasAd: m.hasAd || false
  }));
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      
      switch (msg.type) {
        case 'login':
          users.set(ws, { username: msg.username, roomId: null });
          break;

        case 'createRoom': {
          const roomId = generateRoomId();
          rooms.set(roomId, {
            id: roomId,
            name: msg.roomName,
            password: msg.password || null,
            members: [{ ws, username: msg.username, isHost: true, hasAd: false }],
            videoState: { currentTime: 0, playing: false }
          });
          const user = users.get(ws);
          if (user) user.roomId = roomId;
          ws.send(JSON.stringify({
            type: 'roomCreated',
            roomId,
            roomName: msg.roomName,
            members: getMembers(roomId)
          }));
          break;
        }

        case 'joinRoom': {
          const room = rooms.get(msg.roomId);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Oda bulunamadi' }));
            break;
          }
          if (room.password && room.password !== msg.password) {
            ws.send(JSON.stringify({ type: 'error', message: 'Yanlis sifre' }));
            break;
          }
          room.members.push({ ws, username: msg.username, isHost: false, hasAd: false });
          const user = users.get(ws);
          if (user) user.roomId = msg.roomId;
          ws.send(JSON.stringify({
            type: 'roomJoined',
            roomId: msg.roomId,
            roomName: room.name,
            members: getMembers(msg.roomId),
            isHost: false
          }));
          broadcast(msg.roomId, {
            type: 'memberJoined',
            username: msg.username,
            members: getMembers(msg.roomId)
          }, ws);
          break;
        }

        case 'leaveRoom': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          const idx = room.members.findIndex(m => m.ws === ws);
          if (idx === -1) break;
          const wasHost = room.members[idx].isHost;
          room.members.splice(idx, 1);
          const user = users.get(ws);
          if (user) user.roomId = null;
          if (room.members.length === 0) {
            rooms.delete(msg.roomId);
          } else {
            if (wasHost) room.members[0].isHost = true;
            broadcast(msg.roomId, {
              type: 'memberLeft',
              username: msg.username,
              members: getMembers(msg.roomId)
            });
          }
          break;
        }

        case 'videoSync': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          room.videoState.currentTime = msg.time;
          room.videoState.playing = msg.action === 'play';
          broadcast(msg.roomId, {
            type: 'videoSync',
            action: msg.action,
            time: msg.time,
            username: msg.username
          }, ws);
          break;
        }

        case 'adDetected': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          const member = room.members.find(m => m.username === msg.username);
          if (member) member.hasAd = true;
          broadcast(msg.roomId, { type: 'adDetected', username: msg.username });
          broadcast(msg.roomId, {
            type: 'videoSync',
            action: 'pause',
            time: room.videoState.currentTime,
            username: 'Sistem'
          });
          break;
        }

        case 'adEnded': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          const member = room.members.find(m => m.username === msg.username);
          if (member) member.hasAd = false;
          const anyAd = room.members.some(m => m.hasAd);
          if (!anyAd) {
            broadcast(msg.roomId, { type: 'adEnded', username: msg.username });
            setTimeout(() => {
              broadcast(msg.roomId, {
                type: 'videoSync',
                action: 'play',
                time: room.videoState.currentTime,
                username: 'Sistem'
              });
            }, 1000);
          }
          break;
        }

        case 'chatMessage': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          room.members.forEach(m => {
            if (m.ws.readyState === WebSocket.OPEN) {
              m.ws.send(JSON.stringify({
                type: 'chatMessage',
                username: msg.username,
                message: msg.message,
                time: getTime()
              }));
            }
          });
          break;
        }

        case 'videoInfo': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          broadcast(msg.roomId, {
            type: 'videoInfo',
            title: msg.title,
            currentTime: msg.currentTime,
            duration: msg.duration,
            playing: msg.playing
          });
          break;
        }
      }
    } catch (e) {
      console.error('Error:', e);
    }
  });

  ws.on('close', () => {
    const user = users.get(ws);
    if (user && user.roomId) {
      const room = rooms.get(user.roomId);
      if (room) {
        const idx = room.members.findIndex(m => m.ws === ws);
        if (idx !== -1) {
          const username = room.members[idx].username;
          const wasHost = room.members[idx].isHost;
          room.members.splice(idx, 1);
          if (room.members.length === 0) {
            rooms.delete(user.roomId);
          } else {
            if (wasHost) room.members[0].isHost = true;
            broadcast(user.roomId, {
              type: 'memberLeft',
              username,
              members: getMembers(user.roomId)
            });
          }
        }
      }
    }
    users.delete(ws);
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Elegans Server running on port ${PORT}`);
});
