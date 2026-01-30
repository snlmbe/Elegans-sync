# Elegans Sync Server

WebSocket sunucusu - Elegans Video Sync eklentisi için.

## Kurulum

```bash
npm install
npm start
```

## Render.com Deployment

Bu repo Render.com'da deploy edilmek üzere yapılandırılmıştır.

- **Build Command:** `npm install`
- **Start Command:** `node server.js`

## Ortam Değişkenleri

- `PORT` - Sunucu portu (varsayılan: 3000, Render otomatik ayarlar)

## API

WebSocket bağlantısı: `wss://elegans-sync.onrender.com`

### Mesaj Tipleri

- `login` - Kullanıcı girişi
- `createRoom` - Oda oluştur
- `joinRoom` - Odaya katıl
- `leaveRoom` - Odadan ayrıl
- `videoSync` - Video senkronizasyonu
- `chatMessage` - Sohbet mesajı
- `adDetected` - Reklam algılandı
- `adEnded` - Reklam bitti
