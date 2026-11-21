"""MAHJIQ ikon/logo dönüştürücü.
Orijinal görselleri DEĞİŞTİRMEZ; yalnızca köşelerdeki siyah alanı saydam yapar,
boyutlandırır ve gereken formatlarda kopyalar üretir.
Kullanım: python3 tools/make_icons.py  (proje kökünden)
"""
from PIL import Image, ImageDraw, ImageFilter

SRC_ICON = 'assets/brand/original/mahjiq-app-icon-original.png'
SRC_LOGO = 'assets/brand/original/mahjiq-logo-original.png'
RED = (200, 20, 30)


def transparent_corners(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    # Kenardan içeri doğru koyu pikselleri (siyah köşe + ince koyu kenar) bul
    mask = Image.new('L', (w, h), 0)
    probe = im.copy()
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(probe, seed, (255, 0, 255), thresh=90)
    px = probe.load()
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            mp[x, y] = 0 if px[x, y] == (255, 0, 255) else 255
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert('RGBA')
    out.putalpha(mask)
    return out


def flatten(img, color=RED):
    bg = Image.new('RGBA', img.size, color + (255,))
    bg.alpha_composite(img)
    return bg.convert('RGB')


def main():
    icon = transparent_corners(SRC_ICON)
    logo = transparent_corners(SRC_LOGO)
    # Saydam köşeli (tarayıcı, favicon, PWA "any")
    for s in (512, 192, 48, 32):
        icon.resize((s, s), Image.LANCZOS).save(f'assets/icons/icon-{s}.png', optimize=True)
    # iOS ana ekran: saydamlık desteklenmez → köşeler kırmızıyla doldurulur
    flatten(icon).resize((180, 180), Image.LANCZOS).save('assets/icons/apple-touch-icon.png', optimize=True)
    # Android "maskable": güvenli alan için kenarlara kırmızı boşluk eklenir
    m = 512
    inner = int(m * 0.82)
    canvas = Image.new('RGBA', (m, m), RED + (255,))
    canvas.alpha_composite(icon.resize((inner, inner), Image.LANCZOS), ((m - inner) // 2, (m - inner) // 2))
    canvas.convert('RGB').save('assets/icons/maskable-512.png', optimize=True)
    # Oyun içi logo
    logo.resize((600, 600), Image.LANCZOS).save('assets/brand/mahjiq-logo-600.webp', quality=88, method=6)
    logo.resize((160, 160), Image.LANCZOS).save('assets/brand/mahjiq-logo-160.png', optimize=True)


if __name__ == '__main__':
    main()
