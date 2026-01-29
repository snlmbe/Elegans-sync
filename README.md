# Elegans - Video Sync Extension

<p align="center">
  <img src="icons/icon128.svg" alt="Elegans Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Arkadaşlarınızla videoları eşzamanlı izleyin!</strong>
</p>

<p align="center">
  <a href="#özellikler">Özellikler</a> •
  <a href="#kurulum">Kurulum</a> •
  <a href="#kullanım">Kullanım</a> •
  <a href="#desteklenen-platformlar">Platformlar</a> •
  <a href="#sunucu-kurulumu">Sunucu</a>
</p>

---

## 🎬 Elegans Nedir?

Elegans, arkadaşlarınızla aynı anda eşzamanlı olarak video izlemenizi sağlayan ücretsiz ve açık kaynaklı bir Chrome eklentisidir. Filmleri, animeleri, dersleri veya herhangi bir videoyu birlikte izleyebilirsiniz.

**1..2..3 diye sayıp videoyu eşzamanlı açmaya çalışmanıza gerek yok!** Sadece odaya katılın ve videolarınızı eşzamanlı izleyin.

## ✨ Özellikler

- 🎥 **Eşzamanlı Video İzleme** - Oynat, duraklat ve sarma işlemleri otomatik senkronize edilir
- �� **Anlık Sohbet** - Video izlerken arkadaşlarınızla sohbet edin
- 📺 **Reklam Algılama** - YouTube reklamları algılanır ve diğer kullanıcılar bilgilendirilir
- 🔒 **Şifreli Odalar** - Özel odalar için şifre koruması
- 🌐 **Çoklu Platform Desteği** - YouTube, Vimeo, Dailymotion, Facebook ve HTML5 video
- 🎨 **Modern Arayüz** - Şık ve kullanıcı dostu tasarım
- 🆓 **Tamamen Ücretsiz** - Hiçbir ücret veya premium özellik yok
- 📖 **Açık Kaynak** - Kodu inceleyin, katkıda bulunun

## 📦 Kurulum

### Chrome Eklentisi

1. Bu repoyu indirin veya klonlayın:
   ```bash
   git clone https://github.com/elegans-sync/elegans.git
   ```

2. İkon dosyalarını oluşturun:
   - `icons/generate-icons.html` dosyasını tarayıcıda açın
   - Her üç ikonu da indirin (icon16.png, icon48.png, icon128.png)
   - İndirilen dosyaları `icons` klasörüne kaydedin

3. Chrome'da `chrome://extensions` adresine gidin

4. Sağ üst köşeden **Geliştirici modu**'nu açın

5. **Paketlenmemiş öğe yükle** butonuna tıklayın

6. `Elegans` klasörünü seçin

7. Eklenti yüklendi! 🎉

### Sunucu Kurulumu

Eklentinin çalışması için bir WebSocket sunucusu gereklidir. Sunucuyu şu platformlarda ücretsiz barındırabilirsiniz:

#### Render.com (Önerilen - Ücretsiz)

1. `server` klasörünü GitHub'a yükleyin
2. [Render.com](https://render.com)'a gidin ve GitHub ile giriş yapın
3. "New +" → "Web Service" → GitHub reponuzu seçin
4. Ayarlar:
   - **Name:** elegans-sync
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
5. "Create Web Service" tıklayın
6. URL'nizi alın (örn: `https://elegans-sync.onrender.com`)

#### Railway.app (Alternatif)

1. [Railway.app](https://railway.app)'e gidin
2. "New Project" → "Deploy from GitHub repo"
3. Settings → Networking → "Generate Domain"

#### Yerel Geliştirme

```bash
cd server
npm install
npm start
```

Sunucu `http://localhost:3000` adresinde çalışacaktır.

### Sunucu URL'sini Güncelleme

`popup/popup.js` dosyasında sunucu URL'sini güncelleyin:

```javascript
this.serverUrl = 'wss://your-server-url.glitch.me';
```

## 🚀 Kullanım

### Oda Oluşturma

1. Eklenti ikonuna tıklayın
2. Kullanıcı adınızı girin ve "Bağlan" butonuna tıklayın
3. "Oda Oluştur" sekmesinde oda adı girin (opsiyonel şifre)
4. "Oda Oluştur" butonuna tıklayın
5. Oda kodunu arkadaşlarınızla paylaşın

### Odaya Katılma

1. Eklenti ikonuna tıklayın
2. Kullanıcı adınızı girin ve "Bağlan" butonuna tıklayın
3. "Odaya Katıl" sekmesine geçin
4. Oda kodunu ve şifreyi (varsa) girin
5. "Odaya Katıl" butonuna tıklayın

### Video İzleme

1. Desteklenen bir video sitesine gidin (YouTube, Vimeo, vb.)
2. Video otomatik algılanacaktır
3. Oynat/Duraklat/Sarma işlemleri otomatik senkronize edilir
4. Reklam girdiğinde diğer kullanıcılar bilgilendirilir

## 🌐 Desteklenen Platformlar

| Platform | Durum |
|----------|-------|
| YouTube | ✅ Tam Destek |
| Vimeo | ✅ Tam Destek |
| Dailymotion | ✅ Tam Destek |
| Facebook Video | ✅ Tam Destek |
| HTML5 Video | ✅ Tam Destek |

## 🛠️ Teknik Detaylar

### Proje Yapısı

```
Elegans/
├── manifest.json          # Chrome eklenti manifest dosyası
├── popup/
│   ├── popup.html        # Popup arayüzü
│   ├── popup.css         # Popup stilleri
│   └── popup.js          # Popup mantığı
├── content/
│   ├── content.js        # Video kontrol scripti
│   └── content.css       # Overlay stilleri
├── background/
│   └── background.js     # Service worker
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── server/
│   ├── server.js         # WebSocket sunucusu
│   └── package.json
└── README.md
```

### Teknolojiler

- **Frontend**: Vanilla JavaScript, CSS3
- **Backend**: Node.js, WebSocket (ws)
- **Chrome APIs**: Storage, Tabs, Runtime

### Mesaj Protokolü

```javascript
// Oda oluşturma
{ type: 'createRoom', roomName: string, password?: string, username: string }

// Odaya katılma
{ type: 'joinRoom', roomId: string, password?: string, username: string }

// Video senkronizasyonu
{ type: 'videoSync', action: 'play'|'pause'|'seek', time: number, username: string }

// Sohbet mesajı
{ type: 'chatMessage', roomId: string, username: string, message: string }

// Reklam algılama
{ type: 'adDetected', roomId: string, username: string }
```

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen şu adımları izleyin:

1. Bu repoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🙏 Teşekkürler

- Tüm katkıda bulunanlara
- Açık kaynak topluluğuna
- Bu projeyi kullanan herkese

---

<p align="center">
  Made with ❤️ by Elegans Team
</p>
