/* Tombol layar penuh (mengikuti pola simaung-fullscreen.js) */
(() => {
  if (window.__simaungFullscreen) return;
  window.__simaungFullscreen = true;

  const start = () => {
    const style = document.createElement('style');
    style.textContent = `
    #simaung-screen{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:9998;font:600 12px system-ui;display:flex;gap:8px;align-items:center}
    #simaung-screen button{display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 14px;border:1px solid #637084;border-radius:14px;background:linear-gradient(135deg,#313b4c,#171c25);color:#fff;box-shadow:0 6px 20px #11182730;cursor:pointer;font:inherit}
    #simaung-screen button:focus-visible{outline:3px solid #f19b61;outline-offset:3px}
    #simaung-screen svg{width:18px;height:18px;flex:none}
    #simaung-screen-help{position:fixed;inset:0;margin:auto;max-width:min(440px,calc(100vw - 32px));height:max-content;padding:26px;border:1px solid #dce2ea;border-radius:22px;background:#fff;color:#232935;box-shadow:0 24px 90px #0005;font:15px/1.7 system-ui;z-index:10000}
    #simaung-screen-help::backdrop{background:#11182799;backdrop-filter:blur(5px)}
    #simaung-screen-help button{padding:10px 20px;background:#232935;color:white;border:0;border-radius:10px;cursor:pointer}
    html:fullscreen{background:#f5f7fa;min-height:100dvh}
    @media(max-width:600px){#simaung-screen .screen-label{display:none}#simaung-screen button{padding:11px}}
    @media print{#simaung-screen,#simaung-screen-help{display:none!important}}
    `;
    document.head.append(style);

    const host = document.createElement('div');
    host.id = 'simaung-screen';
    const btn = document.createElement('button');
    btn.type = 'button';
    const icon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';
    host.append(btn);
    document.body.append(host);

    const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const active = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

    function update() {
      const label = active() ? 'Keluar layar penuh' : standalone() ? 'Mode aplikasi' : 'Layar penuh';
      btn.innerHTML = icon + '<span class="screen-label">' + label + '</span>';
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.setAttribute('aria-pressed', String(active()));
    }

    function help(message) {
      let d = document.getElementById('simaung-screen-help');
      if (!d) {
        d = document.createElement('dialog');
        d.id = 'simaung-screen-help';
        d.innerHTML =
          '<h2 style="font-size:21px;margin:0 0 12px">Tampilan aplikasi Simaung</h2><p></p><button type="button">Mengerti</button>';
        document.body.append(d);
        d.querySelector('button').onclick = () => d.close();
      }
      d.querySelector('p').textContent = message;
      d.showModal();
    }

    btn.onclick = async () => {
      try {
        if (active()) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) await exit.call(document);
        } else if (standalone()) {
          help('Anda sudah membuka Simaung dalam mode aplikasi. Gunakan navigasi perangkat untuk kembali ke layar utama.');
        } else {
          const el = document.documentElement;
          const request = el.requestFullscreen || el.webkitRequestFullscreen;
          if (request) await request.call(el);
          else help('Buka di Safari, pilih Bagikan → Tambahkan ke Layar Utama. Pada Android gunakan menu browser → Tambahkan ke layar utama.');
        }
      } catch {
        help('Browser ini belum mengizinkan layar penuh. Buka melalui Safari atau Chrome, lalu coba lagi.');
      }
      update();
    };

    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    update();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
