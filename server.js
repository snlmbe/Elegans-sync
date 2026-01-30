// Elegans Sync Server - v2
// by snlmbe

const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Elegans Sync Server v2</h1><p>WebSocket aktif</p>');
});

const wss = new WebSocket.Server({ server });

const rooms = new Map();
const users = new Map();

function genId() {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
  return r;
}

function broadcast(roomId, msg, exclude = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msgStr = JSON.stringify(msg);
  room.members.forEach(m => {
    if (m.ws !== exclude && m.ws.readyState === WebSocket.OPEN) {
      m.ws.send(msgStr);
    }
  });
}

function broadcastAll(roomId, msg) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msgStr = JSON.stringify(msg);
  room.members.forEach(m => {
    if (m.ws.readyState === WebSocket.OPEN) {
      m.ws.send(msgStr);
    }
  });
}

function getMembers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return room.members.map(m => ({
    username: m.username,
    isHost: m.isHost,
    isCrown: m.isCrown,
    currentUrl: m.currentUrl || null,
    joinedAt: m.joinedAt
  }));
}

function getRoomInfo(room) {
  return {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt,
    memberCount: room.members.length,
    crownHolder: room.crownHolder
  };
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Ping-pong for connection keep-alive
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      
      switch (msg.type) {
        case 'login':
          users.set(ws, { username: msg.username, roomId: null });
          ws.send(JSON.stringify({ type: 'loginSuccess' }));
          break;

        case 'createRoom': {
          const roomId = genId();
          const now = Date.now();
          
          rooms.set(roomId, {
            id: roomId,
            name: msg.roomName,
            createdAt: now,
            members: [{ 
              ws, 
              username: msg.username, 
              isHost: true, 
              isCrown: true,
              joinedAt: now 
            }],
            crownHolder: msg.username,
            sharedVideo: null,
            videoState: { time: 0, paused: true, lastUpdate: now }
          });
          
          const user = users.get(ws);
          if (user) user.roomId = roomId;
          
          ws.send(JSON.stringify({
            type: 'roomCreated',
            roomId,
            roomName: msg.roomName,
            members: getMembers(roomId),
            roomInfo: getRoomInfo(rooms.get(roomId))
          }));
          break;
        }

        case 'joinRoom': {
          const room = rooms.get(msg.roomId);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Oda bulunamadı' }));
            break;
          }
          
          const now = Date.now();
          room.members.push({ 
            ws, 
            username: msg.username, 
            isHost: false,
            isCrown: false,
            joinedAt: now
          });
          
          const user = users.get(ws);
          if (user) user.roomId = msg.roomId;
          
          ws.send(JSON.stringify({
            type: 'roomJoined',
            roomId: msg.roomId,
            roomName: room.name,
            members: getMembers(msg.roomId),
            sharedVideo: room.sharedVideo,
            crownHolder: room.crownHolder,
            roomInfo: getRoomInfo(room),
            isHost: false
          }));
          
          // Send current video state
          if (room.sharedVideo && room.videoState) {
            ws.send(JSON.stringify({
              type: 'videoSync',
              action: 'sync',
              time: room.videoState.time,
              paused: room.videoState.paused,
              username: 'Sistem'
            }));
          }
          
          broadcast(msg.roomId, {
            type: 'memberJoined',
            username: msg.username,
            members: getMembers(msg.roomId)
          }, ws);
          break;
        }

        case 'rejoin': {
          const room = rooms.get(msg.roomId);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Oda artık yok' }));
            break;
          }
          
          const idx = room.members.findIndex(m => m.username === msg.username);
          const wasCrown = idx !== -1 && room.members[idx].isCrown;
          const wasHost = idx !== -1 && room.members[idx].isHost;
          
          if (idx !== -1) room.members.splice(idx, 1);
          
          room.members.push({ 
            ws, 
            username: msg.username, 
            isHost: wasHost || room.members.length === 0,
            isCrown: wasCrown || room.crownHolder === msg.username,
            joinedAt: Date.now()
          });
          
          const user = users.get(ws);
          if (user) user.roomId = msg.roomId;
          
          ws.send(JSON.stringify({
            type: 'roomJoined',
            roomId: msg.roomId,
            roomName: room.name,
            members: getMembers(msg.roomId),
            sharedVideo: room.sharedVideo,
            crownHolder: room.crownHolder,
            roomInfo: getRoomInfo(room),
            isHost: wasHost || room.members.length === 1
          }));
          break;
        }

        case 'leaveRoom': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          
          const idx = room.members.findIndex(m => m.ws === ws);
          if (idx === -1) break;
          
          const member = room.members[idx];
          room.members.splice(idx, 1);
          
          const user = users.get(ws);
          if (user) user.roomId = null;
          
          if (room.members.length === 0) {
            rooms.delete(msg.roomId);
          } else {
            // Transfer host if needed
            if (member.isHost) {
              room.members[0].isHost = true;
            }
            // Transfer crown if needed
            if (member.isCrown) {
              room.members[0].isCrown = true;
              room.crownHolder = room.members[0].username;
            }
            
            broadcast(msg.roomId, {
              type: 'memberLeft',
              username: msg.username,
              members: getMembers(msg.roomId),
              crownHolder: room.crownHolder
            });
          }
          break;
        }

        case 'kickUser': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          
          // Only host can kick
          const kicker = room.members.find(m => m.ws === ws);
          if (!kicker || !kicker.isHost) {
            ws.send(JSON.stringify({ type: 'error', message: 'Yetkin yok' }));
            break;
          }
          
          const targetIdx = room.members.findIndex(m => m.username === msg.targetUsername);
          if (targetIdx === -1) break;
          
          const target = room.members[targetIdx];
          
          // Can't kick yourself
          if (target.ws === ws) break;
          
          // Notify kicked user
          if (target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({ type: 'kicked', by: kicker.username }));
          }
          
          room.members.splice(targetIdx, 1);
          
          // Transfer crown if kicked user had it
          if (target.isCrown && room.members.length > 0) {
            room.members[0].isCrown = true;
            room.crownHolder = room.members[0].username;
          }
          
          broadcast(msg.roomId, {
            type: 'userKicked',
            username: msg.targetUsername,
            by: kicker.username,
            members: getMembers(msg.roomId),
            crownHolder: room.crownHolder
          });
          break;
        }

        case 'shareVideo': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          
          // Give crown to sharer
          room.members.forEach(m => { m.isCrown = false; });
          const sharer = room.members.find(m => m.username === msg.username);
          if (sharer) sharer.isCrown = true;
          room.crownHolder = msg.username;
          
          room.sharedVideo = {
            ...msg.video,
            sharer: msg.username,
            sharedAt: Date.now()
          };
          room.videoState = { time: 0, paused: true, lastUpdate: Date.now() };
          
          broadcastAll(msg.roomId, {
            type: 'videoShared',
            username: msg.username,
            video: room.sharedVideo,
            crownHolder: room.crownHolder,
            members: getMembers(msg.roomId)
          });
          break;
        }

        case 'videoSync': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          
          const now = Date.now();
          
          // Update room state
          room.videoState = {
            time: msg.time,
            paused: msg.action === 'pause',
            lastUpdate: now
          };
          
          // Broadcast to others
          broadcast(msg.roomId, {
            type: 'videoSync',
            action: msg.action,
            time: msg.time,
            paused: msg.paused,
            username: msg.username,
            videoIndex: msg.videoIndex || 0,
            isCrownAction: room.crownHolder === msg.username
          }, ws);
          break;
        }

        case 'requestSync': {
          const room = rooms.get(msg.roomId);
          if (!room || !room.videoState) break;
          
          ws.send(JSON.stringify({
            type: 'videoSync',
            action: 'sync',
            time: room.videoState.time,
            paused: room.videoState.paused,
            username: 'Sistem'
          }));
          break;
        }

        case 'urlChanged': {
          const room = rooms.get(msg.roomId);
          if (!room) break;
          
          const member = room.members.find(m => m.username === msg.username);
          if (member) member.currentUrl = msg.url;
          
          broadcast(msg.roomId, {
            type: 'urlChanged',
            username: msg.username,
            url: msg.url,
            members: getMembers(msg.roomId)
          });
          break;
        }

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (e) {
      console.error('Error:', e);
    }
  });

  ws.on('close', () => {
    const user = users.get(ws);
    if (user?.roomId) {
      const room = rooms.get(user.roomId);
      if (room) {
        const idx = room.members.findIndex(m => m.ws === ws);
        if (idx !== -1) {
          const member = room.members[idx];
          room.members.splice(idx, 1);
          
          if (room.members.length === 0) {
            rooms.delete(user.roomId);
          } else {
            if (member.isHost) room.members[0].isHost = true;
            if (member.isCrown) {
              room.members[0].isCrown = true;
              room.crownHolder = room.members[0].username;
            }
            
            broadcast(user.roomId, {
              type: 'memberLeft',
              username: member.username,
              members: getMembers(user.roomId),
              crownHolder: room.crownHolder
            });
          }
        }
      }
    }
    users.delete(ws);
    console.log('Client disconnected');
  });
});

// Keep-alive ping every 30 seconds
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Elegans Server v2 running on port ${PORT}`));
