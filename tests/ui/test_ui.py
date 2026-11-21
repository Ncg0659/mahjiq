"""MAHJIQ — Tarayıcı testleri (dokunmatik + ekran boyutları)

Gerçek bir Chromium tarayıcıda, mobil cihaz öykünmesiyle çalışır.
Kullanım (proje kökünden):
    python3 -m http.server 8080 &      # oyunu yerel olarak yayınla
    python3 tests/ui/test_ui.py         # testleri çalıştır
Gereken: Python Playwright (pip install playwright && playwright install chromium)
Ekran görüntüleri: tests/ui/screens/
"""
import os
import sys
from playwright.sync_api import sync_playwright

URL = os.environ.get('MAHJIQ_URL', 'http://localhost:8080/index.html')
OUT = os.path.join(os.path.dirname(__file__), 'screens')
os.makedirs(OUT, exist_ok=True)

DEVICES = [
    # ad, genişlik, yükseklik, dokunmatik, ölçek
    ('iPhone-SE-dikey', 375, 667, True, 2),
    ('iPhone-15-dikey', 393, 852, True, 3),
    ('iPhone-15-yatay', 852, 393, True, 3),
    ('iPhone-15-ProMax-yatay', 932, 430, True, 3),
    ('iPad-dikey', 820, 1180, True, 2),
    ('iPad-yatay', 1180, 820, True, 2),
    ('Android-telefon-dikey', 412, 915, True, 2.6),
    ('Android-telefon-yatay', 915, 412, True, 2.6),
    ('Android-tablet-yatay', 1280, 800, True, 2),
    ('Masaustu', 1440, 900, False, 1),
]

# Aşama 1'de kullanıcı testinde "yeterli" bulunan taş boyutları (genişlik×yükseklik, px).
# Görsel değişiklikler bu ölçüleri değiştirmemeli.
BASELINE_TILE = {
    'iPhone-SE-dikey': '23×30', 'iPhone-15-dikey': '24×32', 'iPhone-15-yatay': '31×40',
    'iPhone-15-ProMax-yatay': '34×44', 'iPad-dikey': '52×67', 'iPad-yatay': '68×89',
    'Android-telefon-dikey': '26×33', 'Android-telefon-yatay': '32×42',
    'Android-tablet-yatay': '67×87', 'Masaustu': '76×99',
}

results = []


def check(name, ok, detail=''):
    results.append((name, ok, detail))
    print(('  OK  ' if ok else '  HATA') + f' {name}' + (f' — {detail}' if detail else ''))


def free_tile_center(page, exclude=()):
    """Serbest ve ekranda gerçekten dokunulabilir bir taşın merkezini bulur."""
    return page.evaluate(
        """(exclude) => {
        const { game } = window.__mahjiq;
        for (const t of game.tiles) {
          if (t.removed || exclude.includes(t.id) || !game.isFree(t.id)) continue;
          const el = document.querySelector(`.tile[data-id="${t.id}"]`);
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2, y = r.top + r.height / 2;
          const hit = document.elementFromPoint(x, y)?.closest('.tile');
          if (hit === el) return { id: t.id, x, y, key: t.face.matchKey };
        }
        return null;
      }""",
        list(exclude),
    )


def tile_center(page, tid):
    return page.evaluate(
        """(id) => { const r = document.querySelector(`.tile[data-id="${id}"]`).getBoundingClientRect();
                   return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }""",
        tid,
    )


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or None)

        # ---------- 14. Ekran boyutları ----------
        print('\n14. Oyun ekranı farklı cihaz boyutlarına uyum sağlıyor')
        for name, w, h, touch, scale in DEVICES:
            ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=scale,
                                      has_touch=touch, is_mobile=touch)
            page = ctx.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(URL)
            page.click('#btn-play') if not touch else page.tap('#btn-play')
            page.wait_for_function('document.querySelectorAll(".tile").length === 144')
            m = page.evaluate("""() => {
                const b = document.querySelector('.board').getBoundingClientRect();
                const tiles = [...document.querySelectorAll('.tile')].map(e => e.getBoundingClientRect());
                const minX = Math.min(...tiles.map(r => r.left)), maxX = Math.max(...tiles.map(r => r.right));
                const minY = Math.min(...tiles.map(r => r.top)), maxY = Math.max(...tiles.map(r => r.bottom));
                return { vw: innerWidth, vh: innerHeight,
                         sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight,
                         minX, maxX, minY, maxY, tw: tiles[0].width, th: tiles[0].height };
            }""")
            fits = m['minX'] >= 0 and m['maxX'] <= m['vw'] + 0.5 and m['minY'] >= 0 and m['maxY'] <= m['vh'] + 0.5
            no_scroll = m['sw'] <= m['vw'] and m['sh'] <= m['vh']
            size = f"{m['tw']:.0f}×{m['th']:.0f}"
            check(f'{name} ({w}×{h}) masa ekrana sığıyor, kaydırma yok', fits and no_scroll and not errors,
                  f'taş {size} px' + (f' hata: {errors}' if errors else ''))
            check(f'{name} taş boyutu Aşama 1 ile aynı', size == BASELINE_TILE[name],
                  f'şimdi {size}, Aşama 1 {BASELINE_TILE[name]}')
            page.screenshot(path=os.path.join(OUT, f'{name}.png'))
            ctx.close()

        # ---------- 13. Dokunmatik kontroller ----------
        print('\n13. Mobil dokunmatik kontroller çalışıyor (iPhone 15 yatay, gerçek dokunma olayları)')
        ctx = browser.new_context(viewport={'width': 852, 'height': 393}, device_scale_factor=3,
                                  has_touch=True, is_mobile=True)
        page = ctx.new_page()
        page.goto(URL)
        page.tap('#btn-play')
        page.wait_for_function('document.querySelectorAll(".tile").length === 144')

        # Kapalı taşa dokun → seçilmemeli
        blocked = page.evaluate("""() => { const { game } = window.__mahjiq;
            const t = game.tiles.find(t => !game.isFree(t.id) && t.z === 0 && t.row === 6 && t.col === 2);
            return t.id; }""")
        c = tile_center(page, blocked)
        # Kapalı taşın görünen kısmı (üstü açıksa) — sol üst köşeye yakın dokun
        page.touchscreen.tap(c['x'], c['y'])
        sel = page.evaluate('window.__mahjiq.game.selected')
        check('Kapalı taşa dokunma seçim yapmıyor', sel is None)

        # Bir serbest taşa dokun → seçili olmalı (görsel sınıf dahil)
        a = free_tile_center(page)
        page.touchscreen.tap(a['x'], a['y'])
        has_cls = page.evaluate(f'document.querySelector(\'.tile[data-id="{a["id"]}"]\').classList.contains("selected")')
        check('Serbest taşa dokunma onu seçiyor ve vurguluyor', page.evaluate('window.__mahjiq.game.selected') == a['id'] and has_cls)
        page.screenshot(path=os.path.join(OUT, 'dokunma-secili.png'))

        # Seçiliye tekrar dokun → seçim kalkar
        page.touchscreen.tap(a['x'], a['y'])
        check('Seçili taşa tekrar dokunma seçimi kaldırıyor', page.evaluate('window.__mahjiq.game.selected') is None)

        # Eşleşen bir çifti dokunarak kaldır
        pair = page.evaluate("""() => { const { game } = window.__mahjiq;
            const free = game.tiles.filter(t => !t.removed && game.isFree(t.id));
            for (const x of free) for (const y of free)
              if (x.id < y.id && x.face.matchKey === y.face.matchKey) return [x.id, y.id];
            return null; }""")
        before = page.evaluate('window.__mahjiq.game.remaining')
        for tid in pair:
            cc = tile_center(page, tid)
            page.touchscreen.tap(cc['x'], cc['y'])
        page.wait_for_timeout(350)
        after = page.evaluate('window.__mahjiq.game.remaining')
        shown = page.text_content('#stat-remaining')
        check('Dokunarak eşleştirme taşları kaldırıyor ve sayaç güncelleniyor',
              after == before - 2 and shown == str(after), f'{before} → {after}, ekranda {shown}')

        # Yanlış eşleşme dokunuşla: farklı iki serbest taş
        wrong = page.evaluate("""() => { const { game } = window.__mahjiq;
            const free = game.tiles.filter(t => !t.removed && game.isFree(t.id));
            for (const x of free) for (const y of free)
              if (x.id !== y.id && x.face.matchKey !== y.face.matchKey) return [x.id, y.id];
            return null; }""")
        rem = page.evaluate('window.__mahjiq.game.remaining')
        for tid in wrong:
            cc = tile_center(page, tid)
            page.touchscreen.tap(cc['x'], cc['y'])
        check('Yanlış eşleşmede taş kaldırılmıyor, son dokunulan seçili kalıyor',
              page.evaluate('window.__mahjiq.game.remaining') == rem and page.evaluate('window.__mahjiq.game.selected') == wrong[1])

        # Yeni Oyun → onay penceresi → Evet → sıfırlanır
        page.tap('#btn-new')
        visible = page.is_visible('#confirm-new')
        page.tap('#confirm-yes')
        page.wait_for_timeout(100)
        check('Yeni Oyun onay soruyor ve oyunu sıfırlıyor',
              visible and page.text_content('#stat-remaining') == '144' and page.evaluate('window.__mahjiq.game.selected') is None)

        # ---------- 10. Kazanma ekranı (çözüm yolunu dokunarak oyna) ----------
        sol = page.evaluate('window.__mahjiq.game.solution')
        for a_id, b_id in sol:
            for tid in (a_id, b_id):
                cc = tile_center(page, tid)
                page.touchscreen.tap(cc['x'], cc['y'])
        page.wait_for_selector('#win:not([hidden])', timeout=3000)
        check('Bütün taşlar dokunarak kaldırılınca Kazanma ekranı açılıyor', page.is_visible('#win'))
        page.screenshot(path=os.path.join(OUT, 'kazanma.png'))

        # ---------- 11. Hamle kalmadı uyarısı ----------
        page.tap('#win-new')
        page.evaluate("""() => { const { game } = window.__mahjiq;
            const F = (k, v) => ({ kind: k, value: v, matchKey: k + '-' + v, label: k + v });
            game.loadTiles([
              { col: 10, row: 6, z: 0, face: F('dots', 1) }, { col: 10, row: 6, z: 1, face: F('dots', 1) },
              { col: 16, row: 6, z: 0, face: F('bamboo', 2) }, { col: 20, row: 6, z: 0, face: F('bamboo', 2) },
            ]); }""")
        for tid in (2, 3):
            cc = tile_center(page, tid)
            page.touchscreen.tap(cc['x'], cc['y'])
        page.wait_for_selector('#stuck:not([hidden])', timeout=3000)
        check('Hamle kalmadığında uyarı çıkıyor', page.is_visible('#stuck') and page.text_content('#stuck-left') == '2')
        page.screenshot(path=os.path.join(OUT, 'hamle-kalmadi.png'))
        ctx.close()

        run_stage2(browser)
        browser.close()

    failed = [r for r in results if not r[1]]
    print(f'\nSonuç: {len(results) - len(failed)}/{len(results)} başarılı')
    return 1 if failed else 0


def run_stage2(browser):
    """Aşama 2: açılış/ana menü, animasyonlar ve hareket azaltma tercihi."""
    print('\nAşama 2 — Açılış ekranı ve ana menü')
    for name, w, h in [('iPhone yatay', 852, 393), ('iPhone dikey', 393, 852), ('iPad', 820, 1180)]:
        ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=True, is_mobile=True)
        page = ctx.new_page()
        page.goto(URL)
        page.wait_for_function("document.querySelector('.splash-logo').complete")
        info = page.evaluate("""() => {
            const logo = document.querySelector('.splash-logo').getBoundingClientRect();
            const btn = document.querySelector('#btn-play').getBoundingClientRect();
            const img = document.querySelector('.splash-logo');
            return { visible: !document.querySelector('#splash').hidden, logoOk: img.naturalWidth > 0,
                     logoInView: logo.top >= 0 && logo.bottom <= innerHeight && logo.left >= 0 && logo.right <= innerWidth,
                     btnInView: btn.top >= 0 && btn.bottom <= innerHeight, btnH: btn.height, btnW: btn.width,
                     overflow: document.documentElement.scrollWidth > innerWidth };
        }""")
        check(f'{name}: açılışta MAHJIQ logosu ve Oyna düğmesi ekranda',
              info['visible'] and info['logoOk'] and info['logoInView'] and info['btnInView'] and not info['overflow'],
              f"Oyna {info['btnW']:.0f}×{info['btnH']:.0f} px")
        check(f'{name}: Oyna düğmesi büyük (en az 54 px yüksek, 200 px geniş)', info['btnH'] >= 54 and info['btnW'] >= 200)
        page.tap('#btn-play')
        page.wait_for_timeout(100)
        check(f'{name}: Oyna tek dokunuşla oyun masasına geçiyor',
              page.is_hidden('#splash') and page.evaluate("document.querySelectorAll('.tile').length") == 144)
        ctx.close()

    print('\nAşama 2 — Animasyonlar')
    ctx = browser.new_context(viewport={'width': 852, 'height': 393}, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.goto(URL)
    page.tap('#btn-play')
    a = free_tile_center(page)
    page.touchscreen.tap(a['x'], a['y'])
    anim = page.evaluate(f"getComputedStyle(document.querySelector('.tile[data-id=\"{a['id']}\"]')).animationName")
    check('Seçilen taşta kısa vurgu animasyonu (pop) çalışıyor', anim == 'pop', anim)
    page.touchscreen.tap(a['x'], a['y'])
    pair = page.evaluate("""() => { const { game } = window.__mahjiq;
        const free = game.tiles.filter(t => !t.removed && game.isFree(t.id));
        for (const x of free) for (const y of free)
          if (x.id < y.id && x.face.matchKey === y.face.matchKey) return [x.id, y.id];
        return null; }""")
    for tid in pair:
        cc = tile_center(page, tid)
        page.touchscreen.tap(cc['x'], cc['y'])
    st = page.evaluate(f"""() => {{ const el = document.querySelector('.tile[data-id="{pair[0]}"]');
        const cs = getComputedStyle(el);
        return {{ sparks: document.querySelectorAll('.spark').length, pe: cs.pointerEvents,
                 dur: cs.transitionDuration }}; }}""")
    check('Eşleşmede yumuşak kaybolma efekti ve altın halka var; kaybolan taş dokunmayı engellemiyor',
          st['sparks'] == 2 and st['pe'] == 'none' and '0.32s' in st['dur'], str(st))
    page.wait_for_timeout(600)
    check('Altın halka efektleri kendiliğinden temizleniyor', page.evaluate("document.querySelectorAll('.spark').length") == 0)
    # Animasyon sürerken hızlı oynama: 6 eşleşme art arda, hepsi kabul edilmeli
    before = page.evaluate('window.__mahjiq.game.remaining')
    for _ in range(6):
        pr = page.evaluate("""() => { const { game } = window.__mahjiq;
            const free = game.tiles.filter(t => !t.removed && game.isFree(t.id));
            for (const x of free) for (const y of free)
              if (x.id < y.id && x.face.matchKey === y.face.matchKey) return [x.id, y.id];
            return null; }""")
        if not pr:
            break
        for tid in pr:
            cc = tile_center(page, tid)
            page.touchscreen.tap(cc['x'], cc['y'])
    after = page.evaluate('window.__mahjiq.game.remaining')
    check('Animasyonlar hızlı dokunmayı yavaşlatmıyor (art arda eşleşmeler)', before - after >= 10, f'{before} → {after}')
    # Kazanma kutlaması
    page.tap('#btn-new')
    page.tap('#confirm-yes')
    page.evaluate("""() => { const g = window.__mahjiq.game; for (const [a, b] of g.solution) { g.tap(a); g.tap(b); } }""")
    page.wait_for_selector('#win:not([hidden])', timeout=3000)
    page.wait_for_timeout(200)
    conf = page.evaluate("""() => { const c = document.querySelector('#win .confetti');
        const p = document.querySelector('#win .panel');
        return { pieces: c ? c.children.length : 0, behindPanel: c ? (+getComputedStyle(c).zIndex < +getComputedStyle(p).zIndex) : false,
                 btn: document.elementFromPoint(...(r => [r.left + r.width / 2, r.top + r.height / 2])(document.querySelector('#win-new').getBoundingClientRect())).id }; }""")
    check('Kazanınca sade konfeti kutlaması var, panelin arkasında kalıyor', conf['pieces'] > 0 and conf['behindPanel'], str(conf))
    check('Kutlama sırasında Yeni Oyun düğmesine dokunulabiliyor', conf['btn'] == 'win-new')
    page.wait_for_timeout(3700)
    check('Konfeti 4 saniye içinde temizleniyor', page.evaluate("document.querySelectorAll('.confetti').length") == 0)
    ctx.close()

    print('\nAşama 2 — Hareket azaltma tercihi (iPhone: Ayarlar › Erişilebilirlik › Hareket)')
    ctx = browser.new_context(viewport={'width': 852, 'height': 393}, device_scale_factor=2, has_touch=True,
                              is_mobile=True, reduced_motion='reduce')
    page = ctx.new_page()
    page.goto(URL)
    page.tap('#btn-play')
    a = free_tile_center(page)
    page.touchscreen.tap(a['x'], a['y'])
    rm = page.evaluate(f"""() => {{ const cs = getComputedStyle(document.querySelector('.tile[data-id="{a['id']}"]'));
        return {{ anim: cs.animationName, trans: cs.transitionDuration }}; }}""")
    check('Hareket azaltmada seçim animasyonu ve geçişler kapalı', rm['anim'] == 'none' and set(rm['trans'].replace(' ', '').split(',')) == {'0s'}, str(rm))
    check('Hareket azaltmada seçim vurgusu yine görünüyor', page.evaluate(f"document.querySelector('.tile[data-id=\"{a['id']}\"]').classList.contains('selected')"))
    page.touchscreen.tap(a['x'], a['y'])  # seçimi kaldır: çözüm yolu temiz başlasın
    page.evaluate("""() => { const g = window.__mahjiq.game; for (const [a, b] of g.solution) { g.tap(a); g.tap(b); } }""")
    page.wait_for_selector('#win:not([hidden])', timeout=3000)
    page.wait_for_timeout(200)
    check('Hareket azaltmada konfeti ve altın halka oluşturulmuyor',
          page.evaluate("document.querySelectorAll('.confetti, .spark').length") == 0 and page.is_visible('#win'))
    ctx.close()


if __name__ == '__main__':
    sys.exit(run())
