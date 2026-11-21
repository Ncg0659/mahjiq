# MAHJIQ

Ücretsiz, reklamsız, üyeliksiz bir **Mahjong Solitaire** oyunu.
Telefon, tablet ve tarayıcıda çalışır; ana ekrana eklenebilir (PWA) ve internet olmadan da açılır.

**Canlı adres (yayına alındığında):** https://ncg0659.github.io/mahjiq/

## Nasıl oynanır?

- Aynı iki taşa dokun → ikisi de kalkar.
- Bir taş ancak **üstünde taş yoksa** ve **sağ ya da sol yanı boşsa** seçilebilir.
- Çiçek taşları kendi aralarında, mevsim taşları kendi aralarında eşleşir.
- Bütün taşları kaldırınca kazanırsın.
- Taşların sol üst köşesindeki küçük işaret taşı tanımayı kolaylaştırır
  (rakam; rüzgârlarda D/G/B/K = Doğu/Güney/Batı/Kuzey).

## Durum

**Aşama 1 — Temel oyun** (tamamlandı, yayında)

- Klasik 144 taşlık Kaplumbağa dizilimi
- Standart taş dağılımı (bambu, daire, karakter, rüzgâr, ejderha, çiçek, mevsim)
- Her dağıtım **çözülebilir**: üretici bir çözüm yolu bulur ve bu yolu oyun kurallarıyla baştan oynatarak doğrular
- Yeni Oyun, Kalan Taş, Kullanılabilir Eşleşme sayısı, Kazanma ekranı, Hamle Kalmadı uyarısı

**Aşama 2 — Görsel kalite** (önizlemede, onay bekliyor)

- Seramik görünümlü taşlar (krem yüzey, yeşil taban, yumuşak ışık ve gölge)
- Zümrüt yeşili keçe masa, ince altın çerçeve, kırmızı üst çubuk
- MAHJIQ logolu açılış ekranı ve büyük Oyna düğmesi
- Seçim, eşleşme ve kazanma animasyonları; "Hareketi Azalt" ayarına uyum
- Taş boyutları ve dokunma alanları Aşama 1 ile birebir aynı (testle korunuyor)

## Proje yapısı

```
index.html              Oyun sayfası
css/style.css           Görünüm
src/main.js             Uygulama girişi (motoru ve arayüzü bağlar)
src/engine/             Oyun motoru — DOM'dan bağımsız, saf JavaScript
  tiles.js              Taş seti ve eşleşme kuralı
  layouts/turtle.js     Kaplumbağa dizilimi (koordinat + katman)
  board.js              Serbestlik ve eşleşme hesapları
  generator.js          Çözülebilir dağıtım üretici + doğrulayıcı
  game.js               Merkezi oyun durumu
  rng.js                Tohumlu rastgele sayı üreteci
src/ui/                 Arayüz
  boardView.js          Masa çizimi, ölçekleme, dokunma
  faces.js              Taş yüzleri (özgün SVG çizimler)
assets/brand/original/  Orijinal marka görselleri (değiştirilmez)
assets/icons/           Uygulama ikonları (orijinalden boyutlandırılmış)
tools/make_icons.py     İkonları orijinalden yeniden üretir
manifest.webmanifest    PWA bilgileri
sw.js                   Çevrimdışı çalışma
tests/                  Otomatik testler
```

Dış kütüphane, derleme adımı veya font dosyası yoktur. Çince karakterler cihazın kendi sistem fontuyla gösterilir.

## Yerelde çalıştırma

```bash
python3 -m http.server 8080
# Tarayıcıda: http://localhost:8080
```

(Dosyayı doğrudan çift tıklayarak açmak çalışmaz; tarayıcılar modülleri yerel sunucu üzerinden yükler.)

## Testler

```bash
npm test                     # Oyun motoru testleri (Node 20+, bağımlılık yok)
python3 tests/ui/test_ui.py  # Tarayıcı testleri (sunucu açıkken; Python Playwright gerekir)
```

Her `main` güncellemesinde GitHub Actions iki test grubunu da otomatik çalıştırır.

## Lisans

Lisans henüz belirlenmedi. Bu yüzden şimdilik tüm hakları saklıdır.
