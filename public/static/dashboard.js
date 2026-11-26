/* Pusat Laporan Outlet — demo client
   Sumber data: Arsip Penjualan (olsera) · Operasional Aktif (live) · Arsip Historis (history)
   Seluruh angka adalah data dummy deterministik (seeded) — tidak ada data produksi. */
(() => {
  'use strict';

  const state = { mode: 'month', year: 2026, month: 10, outlets: 'all' };
  const QS = new URLSearchParams(location.search);
  if (['month', 'year'].includes(QS.get('mode'))) state.mode = QS.get('mode');
  if (QS.get('year') && /^\d{4}$/.test(QS.get('year'))) state.year = Number(QS.get('year'));
  if (QS.get('month') && /^\d{1,2}$/.test(QS.get('month'))) state.month = Number(QS.get('month'));
  const DATA_START = '2025-01';
  const DATA_END = '2026-11';
  const HISTORY_MONTHS = ['2026-11', '2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03'];

  /* ------------------------------------------------------------ outlet master */
  const UNITS = [
    { slug: 'sikecut-manis', name: 'Sikecut Manis', unit: 'fnb', emoji: '🍰', base: 118e6, cogs: 0.66, basket: 62000 },
    { slug: 'mitra-kost', name: 'Mitra Kost', unit: 'kosan', emoji: '🏠', base: 62e6, cogs: 0.38, basket: 1250000 },
    { slug: 'cherry-bakes-house', name: 'Cherry Bakes House', unit: 'fnb', emoji: '🥐', base: 96e6, cogs: 0.68, basket: 58000 },
    { slug: 'maja-koffie', name: 'Maja Koffie', unit: 'fnb', emoji: '☕', base: 88e6, cogs: 0.61, basket: 48000 },
    { slug: 'mitra-water', name: 'Mitra Water', unit: 'retail', emoji: '💧', base: 74e6, cogs: 0.72, basket: 42000 },
    { slug: 'rm-sindang-hurip', name: 'RM Sindang Hurip', unit: 'fnb', emoji: '🍽️', base: 104e6, cogs: 0.64, basket: 76000 },
    { slug: 'river-inn', name: 'River Inn', unit: 'penginapan', emoji: '🛏️', base: 132e6, cogs: 0.34, basket: 780000 },
    { slug: 'sweet-escape', name: 'Sweet Escape', unit: 'fnb', emoji: '🧁', base: 91e6, cogs: 0.63, basket: 54000 },
    { slug: 'tk-kartini', name: 'Toko Kartini', unit: 'retail', emoji: '🛒', base: 143e6, cogs: 0.69, basket: 68000 },
  ];
  const HISTORY_UNITS = ['tk-kartini', 'maja-koffie', 'sweet-escape', 'cherry-bakes-house', 'rm-sindang-hurip', 'mitra-water', 'river-inn'];
  const unitOf = (slug) => UNITS.find((u) => u.slug === slug) || UNITS[UNITS.length - 1];
  const unitName = (slug) => unitOf(slug).name;
  const labels = { retail: 'Retail', fnb: 'F&B', kosan: 'Kosan', penginapan: 'Penginapan' };
  const band = (p) => (p === null || p === undefined ? 'neutral' : p < 50 ? 'crit' : p < 80 ? 'warn' : 'ok');
  const isProperty = (u) => u.unit === 'kosan' || u.unit === 'penginapan';

  /* ------------------------------------------------------------------ helpers */
  const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
  const pad = (n) => String(n).padStart(2, '0');
  const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const rp = (n) => (n === null || n === undefined || !isFinite(n) ? '—' : 'Rp ' + nf.format(Math.round(n)));
  function compact(n) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    const a = Math.abs(n);
    const s = n < 0 ? '−' : '';
    if (a >= 1e12) return `${s}Rp ${nf1.format(a / 1e12)} T`;
    if (a >= 1e9) return `${s}Rp ${nf1.format(a / 1e9)} M`;
    if (a >= 1e6) return `${s}Rp ${nf1.format(a / 1e6)} jt`;
    if (a >= 1e3) return `${s}Rp ${nf.format(Math.round(a / 1e3))} rb`;
    return `${s}Rp ${nf.format(a)}`;
  }
  const pct = (x) => (x === null || x === undefined || !isFinite(x) ? '—' : nf1.format(x * 100) + '%');
  const dmy = (iso) => {
    const d = new Date(iso + 'T00:00:00Z');
    return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  };
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dt = (x) => new Date(x).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const monthLabel = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
  };

  /* kebutuhan markup (mengikuti pola panel/tabel referensi) */
  const row = (a) => '<tr>' + a.map((x) => '<td>' + x + '</td>').join('') + '</tr>';
  const table = (h, rs) =>
    '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + h.map((x) => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + rs.join('') + '</tbody></table></div>';
  /* ---- status buka/tutup tiap poin (panel & grup seksi), disimpan ---------- */
  const PANEL_KEY = 'simaung-collapsed-panels';
  const panelState = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem(PANEL_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch (e) {
      return {};
    }
  })();
  function persistPanels() {
    try {
      localStorage.setItem(PANEL_KEY, JSON.stringify(panelState));
    } catch (e) {
      /* penyimpanan lokal tidak tersedia — status hanya berlaku di sesi ini */
    }
  }
  const caretSvg =
    '<svg class="src-caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const toggleChip = (open) =>
    '<span class="src-toggle panel-toggle" aria-hidden="true"><span class="src-toggle-label">' +
    (open ? 'Tutup' : 'Buka') +
    '</span>' +
    caretSvg +
    '</span>';

  /* satu poin/panel yang bisa dibuka-tutup */
  const panel = (id, title, sub, body) => {
    const open = !panelState[id];
    return (
      '<section class="panel ex-section' +
      (open ? '' : ' is-collapsed') +
      '" id="' +
      id +
      '">' +
      '<header class="panel-head" data-p-toggle="' +
      id +
      '" role="button" tabindex="0" aria-expanded="' +
      (open ? 'true' : 'false') +
      '" aria-controls="pbody-' +
      id +
      '">' +
      '<div class="panel-head-main"><div><h2 class="panel-title">' +
      title +
      '</h2><p class="panel-sub">' +
      sub +
      '</p></div></div>' +
      toggleChip(open) +
      '</header>' +
      '<div class="panel-clip" id="pbody-' +
      id +
      '"><div class="panel-clip-inner"><div class="panel-body">' +
      body +
      '</div></div></div>' +
      '</section>'
    );
  };

  /* judul seksi (dipakai Arsip Historis) yang membungkus isinya agar bisa ditutup */
  const secBlock = (id, title, note, inner) => {
    const key = 'sec:' + id;
    const open = !panelState[key];
    return (
      '<div class="sec-collapse' +
      (open ? '' : ' is-collapsed') +
      '">' +
      '<div class="section-head" data-p-toggle="' +
      key +
      '" role="button" tabindex="0" aria-expanded="' +
      (open ? 'true' : 'false') +
      '">' +
      '<h2 class="section-title">' +
      title +
      '</h2>' +
      '<span class="section-head-side">' +
      (note ? '<span class="section-note">' + note + '</span>' : '') +
      toggleChip(open) +
      '</span>' +
      '</div>' +
      '<div class="panel-clip"><div class="panel-clip-inner">' +
      inner +
      '</div></div>' +
      '</div>'
    );
  };
  const badge = (label, tone) => '<span class="pill ' + (tone || 'neutral') + '">' + esc(label) + '</span>';

  /* ==========================================================================
     BEST SELLER
     Omzet sebuah blok dibagi ke produk memakai bobot popularitas deterministik,
     sehingga jumlah omzet semua produk = omzet blok itu sendiri (tidak pernah
     mencampur angka dengan sumber lain).
     ========================================================================== */
  const PRODUCTS = {
    fnb: [
      ['Kopi Susu Gula Aren', 24000],
      ['Americano', 20000],
      ['Cappuccino', 26000],
      ['Matcha Latte', 28000],
      ['Croissant Butter', 22000],
      ['Cinnamon Roll', 21000],
      ['Cheesecake Slice', 32000],
      ['Nasi Goreng Spesial', 35000],
      ['Ayam Geprek', 28000],
      ['Es Teh Manis', 8000],
    ],
    retail: [
      ['Air Mineral 600 ml', 4000],
      ['Galon Isi Ulang', 18000],
      ['Beras 5 kg', 68000],
      ['Minyak Goreng 2 L', 36000],
      ['Gula Pasir 1 kg', 16000],
      ['Telur Ayam 1 kg', 29000],
      ['Sabun Cuci 800 ml', 24000],
      ['Kopi Sachet', 3000],
    ],
    penginapan: [
      ['Kamar Deluxe', 420000],
      ['Kamar Superior', 350000],
      ['Kamar Family', 620000],
      ['Extra Bed', 90000],
      ['Sarapan Tambahan', 45000],
      ['Laundry Kiloan', 15000],
    ],
    kosan: [
      ['Sewa Kamar Bulanan', 1250000],
      ['Sewa Mingguan', 350000],
      ['Deposit Kamar', 500000],
      ['Listrik Token', 60000],
      ['Laundry Kiloan', 15000],
      ['Air Galon', 20000],
    ],
  };

  const monthsFor = (s) => (s.mode === 'month' ? [s.year + '-' + pad(s.month)] : monthsOfYear(s.year));

  /* codes: daftar slug outlet · months: daftar 'YYYY-MM' · revenueTotal: omzet blok */
  function bestseller(codes, months, revenueTotal, seedTag) {
    const stats = new Map();
    codes.forEach((code) => {
      const u = unitOf(code);
      const catalog = PRODUCTS[u.unit] || PRODUCTS.fnb;
      months.forEach((ym) => {
        const rnd = mulberry32(seedOf('bs|' + (seedTag || '') + '|' + code + '|' + ym));
        catalog.forEach(([name, price]) => {
          const key = name;
          const rec = stats.get(key) || { name, price, cat: labels[u.unit], weight: 0 };
          rec.weight += 0.4 + rnd() * 1.3;
          stats.set(key, rec);
        });
      });
    });

    const all = Array.from(stats.values()).sort((a, b) => b.weight - a.weight);
    const weightSum = all.reduce((a, r) => a + r.weight, 0) || 1;
    const list = all.map((r, i) => {
      const share = r.weight / weightSum;
      const revenue = Math.round((revenueTotal * share) / 1000) * 1000;
      return {
        rank: i + 1,
        name: r.name,
        price: r.price,
        cat: r.cat,
        share,
        revenue,
        qty: r.price ? Math.round(revenue / r.price) : 0,
      };
    });
    /* pastikan total persis = omzet blok (selisih pembulatan masuk ke produk teratas) */
    const sum = list.reduce((a, r) => a + r.revenue, 0);
    if (list.length && sum !== revenueTotal) list[0].revenue += revenueTotal - sum;

    return { list, total: revenueTotal };
  }

  function bestSellerMarkup(data) {
    if (!data || !data.list.length) return '<div class="empty-ok">Belum ada produk terjual pada cakupan ini.</div>';
    const top = data.list.slice(0, 3);
    const leader = top[0].revenue || 1;

    const cards = top
      .map(
        (r, i) =>
          '<article class="bs-card bs-' +
          (i + 1) +
          '">' +
          '<span class="bs-medal" aria-hidden="true">' +
          (i + 1) +
          '</span>' +
          '<div class="bs-name">' +
          esc(r.name) +
          '</div>' +
          '<div class="bs-cat">' +
          esc(r.cat) +
          ' · ' +
          rp(r.price) +
          '</div>' +
          '<div class="bs-rev">' +
          compact(r.revenue) +
          '</div>' +
          '<div class="bs-meter"><span style="width:' +
          Math.max(4, (r.revenue / leader) * 100).toFixed(1) +
          '%"></span></div>' +
          '<div class="bs-meta"><b>' +
          nf.format(r.qty) +
          '</b> terjual · ' +
          pct(r.share) +
          ' omzet</div>' +
          '</article>',
      )
      .join('');

    /* table() menerima ARRAY baris, bukan string yang sudah di-join. */
    const rows = data.list.map((r) =>
      row([
        '<span class="bs-rank">' + r.rank + '</span>',
        '<b>' + esc(r.name) + '</b>',
        esc(r.cat),
        nf.format(r.qty),
        rp(r.revenue),
        pct(r.share),
      ]),
    );

    return (
      '<div class="bs-top">' +
      cards +
      '</div>' +
      '<div class="bs-summary">' +
      '<span>Total ' +
      data.list.length +
      ' produk · omzet <b>' +
      compact(data.total) +
      '</b></span>' +
      '<span class="bs-note">Dibagi dari omzet blok ini saja, bukan dari sumber lain</span>' +
      '</div>' +
      table(['Peringkat', 'Produk', 'Kategori', 'Terjual', 'Omzet', 'Kontribusi'], rows)
    );
  }

  /* ---- empat kartu ringkasan keuangan: Gross -> Net -> Beban -> Laba ------ */
  const finCards = ({ gross, net, beban, laba, notes }) => {
    const n = notes || {};
    return [
      ['PENDAPATAN GROSS', gross, n.gross],
      ['PENDAPATAN NET', net, n.net],
      ['TOTAL BEBAN', beban, n.beban],
      ['LABA', laba, n.laba],
    ]
      .map(
        ([label, val, meta]) =>
          '<div class="kpi"><div class="kpi-label">' +
          label +
          '</div><div class="kpi-value">' +
          esc(val) +
          '</div><div class="kpi-meta">' +
          (meta || '') +
          '</div></div>',
      )
      .join('');
  };

  function deltaHTML(x, invertGood) {
    if (x === null || x === undefined || !isFinite(x)) return '';
    const flat = Math.abs(x) < 0.005;
    const good = invertGood ? x < 0 : x > 0;
    const cls = flat ? 'flat' : good ? 'up' : 'down';
    const arrow = flat ? '→' : x > 0 ? '▲' : '▼';
    return `<span class="delta ${cls}">${arrow} ${nf1.format(Math.abs(x) * 100)}%</span>`;
  }

  /* ---------------------------------------------------- seeded deterministic */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedOf(s) {
    let h = 1779033703;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  const CACHE = new Map();
  function memo(key, fn) {
    if (!CACHE.has(key)) CACHE.set(key, fn());
    return CACHE.get(key);
  }
  const monthsOfYear = (y) => Array.from({ length: 12 }, (_, i) => y + '-' + pad(i + 1));
  const CASHIERS = ['Kasir Demo', 'Sari', 'Budi', 'Rina', 'Dewi', 'Ayu', 'Fajar'];
  const METHODS = [['CASH', 0.44], ['QRIS', 0.41], ['TEMPO', 0.11], ['TRANSFER', 0.04]];

  /* ==========================================================================
     DATA: ARSIP PENJUALAN (olsera)
     ========================================================================== */
  function oseraMonth(slug, ym) {
    return memo('o|' + slug + '|' + ym, () => {
      const u = unitOf(slug);
      const [y, m] = ym.split('-').map(Number);
      const rnd = mulberry32(seedOf('olsera|' + slug + '|' + ym));
      const n = daysIn(y, m);
      const season = 1 + (m - 11) * 0.018;
      const rows = [];
      for (let d = 1; d <= n; d++) {
        const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        const weekend = dow === 0 || dow === 6 ? 1.2 : 1;
        const gross = Math.round(((u.base / n) * season * weekend * (0.84 + rnd() * 0.32)) / 5000) * 5000;
        const retur = rnd() < 0.14 ? Math.round((gross * (0.008 + rnd() * 0.032)) / 1000) * 1000 : 0;
        const rounding = [0, 0, 0, 0, 5000, 1000][Math.floor(rnd() * 6)];
        const receipts = Math.max(6, Math.round(gross / u.basket / (0.75 + rnd() * 0.5)));
        let r = rnd();
        let method = METHODS[0][0];
        for (const [name, w] of METHODS) {
          if (r < w) {
            method = name;
            break;
          }
          r -= w;
        }
        const cashier = CASHIERS[Math.floor(rnd() * CASHIERS.length)];
        rows.push({
          day: ym + '-' + pad(d),
          gross,
          retur,
          rounding,
          net: gross - retur + rounding,
          receipts,
          items: Math.round(receipts * (2.1 + rnd() * 1.2)),
          method,
          cashier,
          group: d % 9 === 0 ? 'Tambahan' : 'Reguler',
        });
      }
      const sum = (k) => rows.reduce((a, x) => a + x[k], 0);
      return {
        rows,
        gross: sum('gross'),
        retur: sum('retur'),
        rounding: sum('rounding'),
        net: sum('net'),
        receipts: sum('receipts'),
        items: sum('items'),
        returns: rows.filter((x) => x.retur > 0).length,
      };
    });
  }

  function oseraData(s) {
    const codes = s.outlets === 'all' ? UNITS.map((u) => u.slug) : [s.outlets];
    const months = (s.mode === 'month' ? [s.year + '-' + pad(s.month)] : monthsOfYear(s.year)).filter((ym) => ym >= DATA_START && ym <= DATA_END);
    const batches = [];
    const cashiers = [];
    const daily = [];
    const methodMap = {};
    const totals = { gross: 0, net: 0, retur: 0, rounding: 0, receipts: 0, items: 0, cogsRateSum: 0, cogsWeight: 0 };
    let first = null;
    let last = null;

    codes.forEach((code) => {
      const u = unitOf(code);
      let scope = 0;
      months.forEach((ym) => {
        const mo = oseraMonth(code, ym);
        scope += mo.net;
        first = !first || ym < first ? ym : first;
        last = !last || ym > last ? ym : last;
        const seed = mulberry32(seedOf('batch|' + code + '|' + ym));
        batches.push({
          id: code + '|' + ym,
          code,
          outlet: u.name,
          sourceAccount: s.source === 'history' ? 'Arsip unggahan lama' : 'Data contoh demonstrasi',
          month: ym,
          importedAt: new Date(Date.UTC(2026, 10, 5 + Math.floor(seed() * 18), 2 + Math.floor(seed() * 12), Math.floor(seed() * 59))).toISOString(),
          periodStart: ym + '-01',
          counts: { receipts: mo.receipts, items: mo.items, returns: mo.returns, cancellations: 1 + Math.floor(seed() * 3) },
          sources: [{ name: 'arsip_' + ym + '_' + code.replace(/-/g, '_') + '.xlsx', sha256: '9f2c…a41' }],
          checks: [
            { key: 'Jumlah kolom cocok (11)', ok: true },
            { key: 'Tidak ada baris duplikat', ok: true },
            { key: 'Nilai neto ≥ 0 setelah retur', ok: true },
          ],
        });
        mo.rows.forEach((r) => {
          cashiers.push({ code, outlet: u.name, day: r.day, cashier: r.cashier, receipts: r.receipts, returns: r.retur > 0 ? 1 : 0, net: r.net });
          daily.push({ code, outlet: u.name, day: r.day, group: r.group, amount: r.net });
          const k = code + '|' + r.method;
          methodMap[k] = methodMap[k] || { code, outlet: u.name, mode: r.method, amount: 0 };
          methodMap[k].amount += r.net;
        });
        totals.gross += mo.gross;
        totals.net += mo.net;
        totals.retur += mo.retur;
        totals.rounding += mo.rounding;
        totals.receipts += mo.receipts;
        totals.items += mo.items;
        totals.cogsRateSum += u.cogs * mo.net;
        totals.cogsWeight += mo.net;
      });
      void scope;
    });

    const cogsRate = totals.cogsWeight ? totals.cogsRateSum / totals.cogsWeight : 0.665;
    const itemNet = totals.net - totals.rounding;
    const itemCogs = Math.round((itemNet * cogsRate) / 1000) * 1000;
    const credit = Math.round((totals.net * 0.0625) / 5000) * 5000;
    const billedNet = Math.round((totals.net * 1.14) / 5000) * 5000;

    const periodLabel = s.mode === 'month' ? monthLabel(s.year + '-' + pad(s.month)) : 'Tahun ' + s.year;

    return {
      empty: batches.length === 0,
      batches,
      cashiers: cashiers.sort((a, b) => b.day.localeCompare(a.day) || b.net - a.net),
      daily: daily.sort((a, b) => a.day.localeCompare(b.day) || a.outlet.localeCompare(b.outlet)),
      methods: Object.values(methodMap).sort((a, b) => b.amount - a.amount),
      totals: {
        grossRevenue: totals.gross,
        netRevenue: totals.net,
        settledGross: totals.gross,
        settledNet: totals.net,
        settledDiscount: 0,
        billedNet,
        unsettled: billedNet - totals.net,
        returns: totals.retur,
        itemNet,
        itemCogs,
        rounding: totals.rounding,
        creditRepayments: credit,
      },
      receipts: totals.receipts,
      items: totals.items,
      importedMonths: months.length,
      expectedMonths: s.mode === 'month' ? 1 : 12,
      range: { first, last },
      period: { label: periodLabel, prevLabel: s.mode === 'month' ? 'periode sebelumnya' : 'tahun sebelumnya' },
    };
  }

  /* ------------------------------- bukti data sumber (drill-down batch) ------ */
  let evidenceState = { batch: null, kind: 'receipts', page: 1 };

  function evidenceRows(batchId, kind) {
    const [code, ym] = batchId.split('|');
    const mo = oseraMonth(code, ym);
    const u = unitOf(code);
    const prefix = code.toUpperCase() + '-' + ym;
    if (kind === 'returns') {
      return mo.rows
        .filter((r) => r.retur > 0)
        .map((r, i) => ({ reference: prefix + '-R' + pad(i + 1), day: r.day, who: r.cashier, kind: 'RETUR', note: 'Nilai negatif pada nota', amount: -r.retur * 100 }));
    }
    if (kind === 'repayments') {
      return Array.from({ length: 4 }, (_, i) => ({
        reference: prefix + '-KR' + pad(i + 1),
        day: ym + '-' + pad(3 + i * 6),
        who: 'TEMPO',
        kind: 'PELUNASAN',
        note: 'Sudah termasuk nilai neto',
        amount: Math.round(mo.net * 0.0625 * 100 * (0.7 + i * 0.1)),
      }));
    }
    if (kind === 'items') {
      return mo.rows.slice(0, 8).flatMap((r, i) => [
        {
          reference: prefix + '-IT' + pad(i * 2 + 1),
          day: r.day,
          who: 'Item reguler',
          kind: 'ITEM',
          note: 'Neto setelah diskon nota',
          amount: Math.round((r.net / 2) * 100),
        },
      ]);
    }
    if (kind === 'cancellations') {
      return Array.from({ length: 3 }, (_, i) => ({
        reference: prefix + '-PB' + pad(i + 1),
        day: ym + '-' + pad(6 + i * 8),
        who: CASHIERS[i],
        kind: 'PEMBATALAN',
        note: 'Tidak masuk nilai lunas',
        amount: 0,
      }));
    }
    return mo.rows.slice(0, 9).map((r, i) => ({
      reference: prefix + '-N' + pad(i + 1),
      day: r.day,
      who: r.cashier,
      kind: 'NOTA',
      note: r.method + ' · ' + r.receipts + ' nota',
      amount: r.net * 100,
    }));
  }

  function renderEvidence(box) {
    if (!box || !evidenceState.batch) return;
    const kinds = { receipts: 'Nota', items: 'Item barang', returns: 'Pengembalian', cancellations: 'Pembatalan', repayments: 'Pelunasan kredit' };
    const all = evidenceRows(evidenceState.batch, evidenceState.kind);
    const perPage = 6;
    const pages = Math.max(1, Math.ceil(all.length / perPage));
    const page = Math.min(evidenceState.page, pages);
    const slice = all.slice((page - 1) * perPage, page * perPage);
    const body =
      '<label style="display:flex;gap:8px;align-items:center;font-size:11.5px;color:#8191aa;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Jenis bukti ' +
      '<select id="olsera-kind" style="max-width:220px">' +
      Object.entries(kinds)
        .map(([v, l]) => '<option value="' + v + '"' + (v === evidenceState.kind ? ' selected' : '') + '>' + l + '</option>')
        .join('') +
      '</select></label>' +
      table(
        ['Nomor sumber', 'Tanggal', 'Kasir / item', 'Jenis / status', 'Nilai'],
        slice.map((r) =>
          row([
            esc(r.reference),
            esc(r.day),
            esc(r.who),
            esc(r.kind) + '<div class="panel-sub">' + esc(r.note) + '</div>',
            rp(r.amount / 100),
          ]),
        ),
      ) +
      '<div class="ex-toolbar"><span>Halaman ' + page + ' dari ' + pages + ' · ' + all.length + ' baris</span><span id="olsera-paging"></span></div>';
    box.innerHTML = panel(
      'olsera-evidence-panel',
      'Bukti Data Sumber',
      'Halaman ' + page + ' · ' + all.length + ' baris sesuai filter · nilai baris dari arsip impor.',
      body,
    );
    box.querySelector('#olsera-kind').onchange = (e) => {
      evidenceState.kind = e.target.value;
      evidenceState.page = 1;
      renderEvidence(box);
    };
    const nav = box.querySelector('#olsera-paging');
    [
      ['Sebelumnya', page - 1, page > 1],
      ['Berikutnya', page + 1, page < pages],
    ].forEach(([label, p, show]) => {
      if (!show) return;
      const b = document.createElement('button');
      b.className = 'btn-ghost';
      b.style.marginLeft = '8px';
      b.textContent = label;
      b.onclick = () => {
        evidenceState.page = p;
        renderEvidence(box);
      };
      nav.append(b);
    });
  }

  /* ================================ RENDER: ARSIP PENJUALAN ================ */
  function renderOlsera(s) {
    const d = oseraData(s);
    if (d.empty) {
      return {
        tag: 'Belum ada impor',
        data: d,
        kpi:
          '<div class="kpi"><div class="kpi-label">ARSIP PENJUALAN</div><div class="kpi-value">Belum ada data impor</div>' +
          '<div class="kpi-meta">Pilih periode / outlet yang sudah diimpor. Tidak ada angka pengganti.</div></div>',
        body: panel(
          'olsera-empty',
          'Arsip Penjualan Belum Tersedia',
          'Arsip dibaca terpisah dari transaksi POS Simaung.',
          'Belum ada data untuk cakupan ini. Pada aplikasi nyata, impor dilakukan di ruang pengelolaan.',
        ),
        mount: null,
      };
    }
    const t = d.totals;
    const gross = t.grossRevenue;
    const net = t.netRevenue;
    const heroHtml = finCards({
      gross: rp(gross),
      net: rp(net),
      beban: rp(t.itemCogs),
      /* Laba = Net − Beban (identitas pasti) */
      laba: rp(net - t.itemCogs),
      notes: {
        gross: 'Penjualan lunas sebelum retur; nilai bruto dari arsip',
        net: 'Nilai neto nota lunas setelah retur dan pembulatan sesuai arsip',
        beban: 'HPP item tercatat pada arsip (biaya pokok barang)',
        laba: 'Net − HPP; beban operasional belum tersedia pada arsip',
      },
    });

    const capRows = (rows, max, colspan, what) => {
      if (rows.length <= max) return rows;
      return rows.slice(0, max).concat(['<tr><td colspan="' + colspan + '" class="panel-sub" style="text-align:center">Menampilkan ' + max + ' dari ' + rows.length + ' baris ' + esc(what) + ' · persempit periode atau outlet untuk melihat seluruh baris.</td></tr>']);
    };

    const batchRows = d.batches.map((b) =>
      row([
        esc(b.outlet),
        esc(b.sourceAccount),
        esc(b.month),
        esc(dt(b.importedAt)),
        b.counts.receipts + ' baris nota / ' + b.counts.items + ' item',
        '<button class="btn-ghost" data-batch="' + esc(b.id) + '">Lihat rincian</button>' +
          '<details><summary>File &amp; pemeriksaan</summary><ul>' +
          b.sources.map((x) => '<li>' + esc(x.name) + '<br><small>' + esc(x.sha256) + '</small></li>').join('') +
          '</ul>' +
          b.checks.map((c) => '<p>' + esc(c.key) + ' · ' + (c.ok ? 'Cocok' : 'Perlu periksa') + '</p>').join('') +
          '</details>',
      ]),
    );

    const recon = [
      ['Pendapatan gross', rp(gross), 'Penjualan nota lunas sebelum diskon dan retur'],
      ['Pendapatan net', rp(net), 'Nilai acuan laporan sumber; diskon dan retur tidak dihitung ulang'],
      ['HPP item', rp(t.itemCogs), 'Biaya pokok barang dari data item; terpisah dari beban operasional'],
      ['Total beban operasional outlet', 'Belum tersedia', 'Belum ada rincian beban operasional yang terhubung dengan arsip penjualan ini'],
      ['Laba', 'Belum dapat dihitung', 'Pendapatan net − HPP − beban operasional outlet'],
      ['Nilai item neto', rp(t.itemNet), 'Sudah memuat item retur negatif'],
      ['Pembulatan nota', rp(t.rounding), 'Ditambahkan sekali ke nilai item'],
      ['HPP item', rp(t.itemCogs), 'HPP historis dalam ekspor'],
      ['Margin item sebelum pembulatan', rp(t.itemNet - t.itemCogs), 'Bukan laba bersih setelah beban operasional'],
      ['Pelunasan kredit', rp(t.creditRepayments), 'Sudah termasuk laporan; tidak ditambahkan ulang'],
      ['Pengembalian', rp(t.returns), 'Sudah menjadi nilai negatif pada nota/item; tidak dikurangkan ulang'],
    ].map((r) => row([r[1] === 'Belum tersedia' || r[1] === 'Belum dapat dihitung' ? r[0] : '<b>' + r[0] + '</b>', r[1], '<span style="color:#55657c">' + r[2] + '</span>']));

    const bodyHtml =
      '<div class="ex-toolbar"><span class="pill neutral">DEMO · DATA DUMMY</span>' +
      '<div><button class="btn-ghost" id="olsera-csv">Ekspor Ringkasan CSV</button> <button class="btn-ghost" id="olsera-print">Cetak / PDF</button></div></div>' +
      '<p class="ex-note">Data tersedia untuk <b>' + d.importedMonths + ' dari ' + d.expectedMonths + ' bulan</b> pada pilihan ini. Laporan tahunan tidak diekstrapolasi. Arsip tidak dijumlahkan dengan POS aktif atau arsip unggahan lain. Target: <b>Belum dinilai</b>.</p>' +
      panel(
        'olsera-batches',
        'Asal Data &amp; Riwayat Impor',
        'Data historis dipetakan secara eksplisit ke outlet Simaung. Stok dan transaksi POS tidak diubah oleh impor arsip.',
        table(['Outlet', 'Sumber data', 'Bulan', 'Diimpor', 'Cakupan', 'Bukti'], batchRows),
      ) +
      panel(
        'olsera-reconcile',
        'Pencocokan Angka',
        'Rumus laba: pendapatan net − HPP − beban operasional outlet. Arsip penjualan tidak membawa beban operasional, jadi laba belum dihitung agar tidak mengarang nilai.',
        table(['Komponen', 'Nilai', 'Keterangan'], recon),
      ) +
      panel(
        'olsera-cashiers',
        'Kasir / Penjual per Hari',
        'Nama mengikuti field sales name / served by ekspor; bukan bukti shift sudah ditutup.',
        table(
          ['Outlet', 'Tanggal', 'Kasir / penjual', 'Nota positif', 'Retur', 'Penjualan neto'],
          capRows(
            d.cashiers.map((c) => row([esc(c.outlet), esc(c.day), esc(c.cashier), esc(c.receipts), esc(c.returns), '<b>' + rp(c.net) + '</b>'])),
            60,
            6,
            'kasir harian',
          ),
        ),
      ) +
      panel(
        'olsera-daily',
        'Penjualan Harian Sumber',
        'Baris mengikuti kelompok/kategori pada data sumber; satu tanggal dapat tampil pada beberapa baris.',
        '<div class="ex-toolbar" style="margin-top:0"><span class="panel-sub">Tren harian neto pada cakupan terpilih</span></div><div style="height:190px;margin-bottom:8px"><svg id="olsera-chart" class="trend-svg" viewBox="0 0 420 190" preserveAspectRatio="none" role="img" aria-label="Grafik penjualan harian"></svg></div>' +
          table(
            ['Outlet', 'Tanggal', 'Kelompok', 'Penjualan neto'],
            capRows(
              d.daily.map((r) => row([esc(r.outlet), esc(r.day), esc(r.group), rp(r.amount)])),
              90,
              4,
              'penjualan harian',
            ),
          ),
      ) +
      panel(
        'olsera-bestseller',
        'Best Seller',
        'Produk paling laku pada arsip ini. Omzet produk dibagi dari neto blok ini saja, tidak dijumlahkan dengan sumber lain.',
        bestSellerMarkup(
          bestseller(
            Array.from(new Set(d.batches.map((b) => b.code))),
            Array.from(new Set(d.batches.map((b) => b.month))),
            d.totals.netRevenue,
            'olsera-bs',
          ),
        ),
      ) +
      panel(
        'olsera-methods',
        'Metode pada Nota Sumber',
        'Metode TEMPO dapat muncul untuk nota kredit yang dilunasi. Ini pengelompokan field nota, bukan mutasi bank/settlement.',
        table(
          ['Outlet', 'Metode', 'Nilai neto'],
          d.methods.map((m) => row([esc(m.outlet), '<b>' + esc(m.mode) + '</b>', '<b>' + rp(m.amount) + '</b>'])),
        ),
      ) +
      '<div id="olsera-evidence"></div>';

    return {
      tag: 'DEMO · ' + d.importedMonths + '/' + d.expectedMonths + ' bulan',
      data: d,
      kpi: heroHtml,
      body: bodyHtml,
      mount: (block) => {
        const box = block.querySelector('#olsera-evidence');
        block.querySelectorAll('[data-batch]').forEach((b) => {
          b.onclick = () => {
            evidenceState = { batch: b.dataset.batch, kind: 'receipts', page: 1 };
            renderEvidence(box);
            if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
          };
        });
        const printBtn = block.querySelector('#olsera-print');
        if (printBtn) printBtn.onclick = () => window.print();
        const csvBtn = block.querySelector('#olsera-csv');
        if (csvBtn) csvBtn.onclick = () => exportOlseraCSV(s, d);
        drawDailyChart(d, block.querySelector('#olsera-chart'));
      },
    };
  }

  function drawDailyChart(d, svg) {
    if (!svg) return;
    const byDate = {};
    d.daily.forEach((r) => (byDate[r.day] = (byDate[r.day] || 0) + r.amount));
    const labels = Object.keys(byDate).sort();
    const values = labels.map((k) => byDate[k]);
    if (!values.length) {
      svg.innerHTML = '';
      return;
    }
    const W = 420, H = 190, PL = 10, PR = 10, PT = 14, PB = 26;
    const maxV = Math.max(...values, 1);
    const iw = W - PL - PR, ih = H - PT - PB;
    const x = (i) => PL + (values.length === 1 ? iw / 2 : (i / (values.length - 1)) * iw);
    const y = (v) => PT + ih - (v / maxV) * ih;
    const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `${line} L${x(values.length - 1).toFixed(1)},${(PT + ih).toFixed(1)} L${x(0).toFixed(1)},${(PT + ih).toFixed(1)} Z`;
    const ticks = [0, Math.floor(values.length / 2), values.length - 1].filter((v, i, a) => a.indexOf(v) === i);
    svg.innerHTML =
      '<defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#364152" stop-opacity=".18"/><stop offset="100%" stop-color="#364152" stop-opacity="0"/></linearGradient></defs>' +
      `<line x1="${PL}" y1="${PT + ih}" x2="${W - PR}" y2="${PT + ih}" stroke="#dce2ea" stroke-width="1.4"/>` +
      `<path d="${area}" fill="url(#og)"/>` +
      `<path d="${line}" fill="none" stroke="#364152" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` +
      ticks.map((i) => `<text x="${x(i).toFixed(1)}" y="${H - 7}" text-anchor="middle" font-size="10.5" fill="#8191aa">${dmy(labels[i])}</text>`).join('');
  }

  /* ==========================================================================
     DATA: OPERASIONAL AKTIF (live) & ARSIP HISTORIS (history)
     ========================================================================== */
  function monthCtx(s) {
    const [y, m] = s.mode === 'year' ? [s.year, 12] : [s.year, s.month];
    const start = s.year + '-' + pad(s.mode === 'year' ? 1 : s.month) + '-01';
    const endM = s.mode === 'year' ? 12 : s.month;
    const end = (endM === 12 ? s.year + 1 : s.year) + '-' + pad(endM === 12 ? 1 : endM + 1) + '-01';
    void y;
    return { start, end, endM };
  }

  function liveRatio(slug, ym, boost) {
    const rnd = mulberry32(seedOf('live|' + slug + '|' + ym));
    const base = 0.55 + rnd() * 0.55;
    return Math.max(0.28, Math.min(1.28, base * boost));
  }

  function liveData(s) {
    const codes = s.outlets === 'all' ? UNITS.map((u) => u.slug) : [s.outlets];
    const months = s.mode === 'month' ? [s.year + '-' + pad(s.month)] : monthsOfYear(s.year);
    const days = s.mode === 'month' ? daysIn(s.year, s.month) : 360;
    const elapsed = s.mode === 'month' ? Math.min(1, days / daysIn(s.year, s.month)) : 0.92;

    const outlets = codes.map((code) => {
      const u = unitOf(code);
      const target = Math.round((u.base * (s.mode === 'year' ? 11 : 1) * 1.06) / 100000) * 100000;
      const ratioSum = months.reduce((a, ym) => a + liveRatio(code, ym, s.mode === 'year' ? 0.94 : 1), 0);
      const percent = (ratioSum / months.length) * 100;
      const actual = Math.round((target * percent) / 100 / 1000) * 1000;
      const previousActual = Math.round((actual / (0.9 + (seedOf(code) % 17) / 100)) / 1000) * 1000;
      const property = isProperty(u);
      const cogs = property ? null : Math.round((actual * u.cogs) / 1000) * 1000;
      return {
        key: code,
        slug: code,
        name: u.name,
        unit: u.unit,
        emoji: u.emoji,
        target,
        actual,
        percent,
        previousActual,
        change: previousActual ? ((actual - previousActual) / previousActual) * 100 : null,
        gap: Math.max(0, target - actual),
        band: band(percent),
        label: percent < 50 ? 'Kurang' : percent < 80 ? 'Ideal' : 'Aman',
        pace: Math.round((percent / (elapsed * 100)) * 100),
        expectedToDate: Math.round((target * elapsed) / 1000) * 1000,
        cogs,
        grossProfit: cogs === null ? null : actual - cogs,
        netRevenue: Math.round((actual * 0.98) / 1000) * 1000,
        unpaidBills: property ? Math.round((actual * 0.06) / 50000) * 50000 : 0,
        receipts: Math.round(actual / u.basket),
        costWarning: code === 'maja-koffie' ? 3 : 0,
        lastActivity: new Date(Date.UTC(s.year, s.mode === 'month' ? s.month - 1 : 11, Math.max(1, days - 1), 3, 15)).toISOString(),
        dataStatus: 'Demo · data dummy operasional',
      };
    });

    const actual = outlets.reduce((a, o) => a + o.actual, 0);
    const target = outlets.reduce((a, o) => a + o.target, 0);
    const alerts = [];
    outlets.forEach((o) => {
      if (o.costWarning) {
        alerts.push({
          name: o.name,
          severity: 'warn',
          title: o.costWarning + ' nota HPP nol',
          detail: 'Ada nota tanpa HPP pada periode ini. Laba kotor outlet bisa lebih rendah dari yang tercatat.',
          kind: 'cogs',
        });
      }
      if (o.unpaidBills) {
        alerts.push({
          name: o.name,
          severity: 'warn',
          title: 'Tagihan belum dibayar ' + rp(o.unpaidBills),
          detail: 'Tagihan berjalan belum masuk penerimaan. Cocokkan dengan mutasi sebelum menutup periode.',
          kind: 'billing',
        });
      }
    });

    return {
      outlets,
      totals: {
        actual,
        target,
        percent: target ? (actual / target) * 100 : null,
        receipts: outlets.reduce((a, o) => a + o.receipts, 0),
        cogs: outlets.reduce((a, o) => a + (o.cogs || 0), 0),
        netRevenue: outlets.reduce((a, o) => a + o.netRevenue, 0),
        laba: outlets.reduce((a, o) => a + o.netRevenue, 0) - outlets.reduce((a, o) => a + (o.cogs || 0), 0),
      },
      alerts,
      calculatedAt: new Date(Date.UTC(2026, 10, 23, 4, 12)).toISOString(),
      period: monthCtx(s),
      limitations: [
        'Seluruh nilai dan penanggung jawab pada demo adalah dummy.',
        'Laba kotor belum dikurangi beban operasional (gaji, sewa, utilitas).',
        'Settlement bukan saldo bank langsung.',
      ],
      actions: [
        { title: 'Periksa margin dan biaya bahan', assignee: 'Manajer Demo', due_on: '2026-11-25', status: 'IN_PROGRESS', evidence: '' },
        { title: 'Cocokkan settlement QRIS dengan mutasi', assignee: 'Admin Demo', due_on: '2026-11-21', status: 'OPEN', evidence: '' },
      ],
    };
  }

  function historyData(s) {
    const codes = s.outlets === 'all' ? HISTORY_UNITS : [s.outlets].filter((c) => HISTORY_UNITS.includes(c));
    const months = (s.mode === 'month' ? [s.year + '-' + pad(s.month)] : monthsOfYear(s.year)).filter((ym) => HISTORY_MONTHS.includes(ym));
    const wn = s.mode === 'month' ? 4 : 48;

    const rows = codes.map((code) => {
      const u = unitOf(code);
      let omzet = 0, gross = 0, bebanSum = 0, weeks = 0, issues = 0;
      const detailWeeks = [];
      months.forEach((ym) => {
        const mo = oseraMonth(code, ym);
        omzet += mo.net;
        gross += mo.gross;
        const wcount = 4;
        weeks += wcount;
        const rnd = mulberry32(seedOf('hist|' + code + '|' + ym));
        for (let i = 0; i < wcount; i++) {
          const startD = 1 + i * 7;
          const endD = Math.min(startD + 6, daysIn(Number(ym.slice(0, 4)), Number(ym.slice(5))));
          const wOmzet = Math.round(mo.net / wcount / 1000) * 1000;
          /* Properti (kosan/penginapan) tidak punya HPP barang, tetapi punya beban operasional */
          const wCogs = isProperty(u) ? 0 : Math.round(wOmzet * u.cogs);
          const wBeban = Math.round(wOmzet * (isProperty(u) ? 0.4 : 0.15));
          bebanSum += wCogs + wBeban;
          const issueRoll = rnd();
          const issue = issueRoll > 0.82 ? { sev: 'warning', text: 'Beban minggu ini ' + pct((wBeban / wOmzet)) + ' dari omzet' } : null;
          if (issue) issues += 1;
          detailWeeks.push({
            start: ym + '-' + pad(startD),
            end: ym + '-' + pad(endD),
            omzet: wOmzet,
            laba: wOmzet - wCogs - wBeban,
            beban: wBeban,
            transaksi: Math.round(wOmzet / u.basket),
            issues: issue ? [issue] : [],
          });
        }
      });
      const avgCogs = u.cogs;
      /* Laba = Net − Total Beban (identitas pasti untuk semua unit, termasuk properti) */
      const laba = omzet - bebanSum;
      return {
        id: code,
        name: u.name,
        category: labels[u.unit],
        emoji: u.emoji,
        gross,
        omzet,
        beban: bebanSum,
        laba,
        margin: omzet ? laba / omzet : null,
        labaConfidence: isProperty(u) ? 0.4 : 0.97,
        weeks,
        expectedWeeks: wn,
        issues,
        deltaOmzet: (mulberry32(seedOf('d|' + code))() - 0.42) * 0.3,
        avgBasket: u.basket,
        detailWeeks,
      };
    });

    const omzet = rows.reduce((a, r) => a + r.omzet, 0);
    const laba = rows.reduce((a, r) => a + (r.laba || 0), 0);
    rows.forEach((r) => (r.share = omzet ? r.omzet / omzet : 0));

    const asks = [];
    rows.forEach((r) => {
      if (r.issues > 0) {
        asks.push({
          sev: 'warning',
          emoji: r.emoji,
          outlet: r.name,
          title: 'Beban mingguan perlu ditinjau',
          detail: 'Ada ' + r.issues + ' minggu dengan beban di atas 15% omzet. Ini contoh demo, bukan temuan audit.',
          ask: 'Apakah biaya promosi dan lembur sudah dievaluasi untuk periode ini?',
        });
      }
      if (r.labaConfidence && r.labaConfidence < 0.999) {
        asks.push({
          sev: 'info',
          emoji: r.emoji,
          outlet: r.name,
          title: 'HPP belum lengkap',
          detail: 'Laba hanya dihitung dari ' + pct(r.labaConfidence) + ' omzet yang melaporkan HPP.',
          ask: 'Minta kelengkapan HPP sebelum memakai angka laba untuk keputusan.',
        });
      }
    });

    const trend = [];
    const stepLabels = s.mode === 'month' ? ['W1', 'W2', 'W3', 'W4'] : months.map((ym) => monthLabel(ym).split(' ')[0].slice(0, 3));
    const buckets = s.mode === 'month' ? 4 : months.length;
    for (let i = 0; i < buckets; i++) {
      const om = omzet / buckets * (0.86 + ((i * 7) % 10) / 42);
      trend.push({
        label: stepLabels[i] || String(i + 1),
        full: s.mode === 'month' ? 'Minggu ' + (i + 1) : months[i],
        omzet: Math.round(om),
        laba: isProperty(unitOf(codes[0])) ? 0 : Math.round(om * (laba / (omzet || 1))),
      });
    }

    const periodLabel = s.mode === 'month' ? monthLabel(s.year + '-' + pad(s.month)) : 'Tahun ' + s.year;
    const critical = asks.filter((a) => a.sev === 'critical').length;
    const warning = asks.filter((a) => a.sev === 'warning').length;

    return {
      totals: {
        gross: rows.reduce((a, r) => a + r.gross, 0),
        omzet,
        beban: rows.reduce((a, r) => a + (r.beban || 0), 0),
        laba,
        margin: omzet ? laba / omzet : null,
        labaCoverageOmzet: 0.94,
        weeks: rows.reduce((a, r) => a + r.weeks, 0),
      },
      previous: { omzet: omzet / 1.07, laba: laba / 1.05 },
      period: { label: periodLabel, prevLabel: s.mode === 'month' ? 'periode sebelumnya (dummy)' : 'tahun sebelumnya (dummy)' },
      rows,
      issues: { critical, warning },
      asks,
      trend,
      missing: rows.reduce((a, r) => a + Math.max(0, r.expectedWeeks - r.weeks), 0),
      importedMonths: months.length,
      expectedMonths: s.mode === 'month' ? 1 : 12,
    };
  }

  /* =============================== TREND CHART ============================= */
  function trendChart(series) {
    if (!series || !series.length) return '<div class="empty-ok">Belum ada data tren.</div>';
    const W = 420, H = 190, PL = 8, PR = 8, PT = 14, PB = 26;
    const maxV = Math.max(...series.map((x) => Math.max(x.omzet, x.laba || 0)), 1);
    const iw = W - PL - PR, ih = H - PT - PB;
    const x = (i) => PL + (series.length === 1 ? iw / 2 : (i / (series.length - 1)) * iw);
    const y = (v) => PT + ih - (v / maxV) * ih;
    const path = (key) => series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v[key] || 0).toFixed(1)}`).join(' ');
    const areaPath = `${path('omzet')} L${x(series.length - 1).toFixed(1)},${(PT + ih).toFixed(1)} L${x(0).toFixed(1)},${(PT + ih).toFixed(1)} Z`;
    const dots = series
      .map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v.omzet).toFixed(1)}" r="3" fill="#364152"><title>${esc(v.full)}: ${compact(v.omzet)}</title></circle>`)
      .join('');
    const xlabels = series
      .map((v, i) => `<text x="${x(i).toFixed(1)}" y="${H - 7}" text-anchor="middle" font-size="10.5" fill="#8191aa">${esc(v.label)}</text>`)
      .join('');
    return `<div class="trend-wrap">
      <svg class="trend-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Grafik tren omzet dan laba">
        <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#364152" stop-opacity=".16"/>
          <stop offset="100%" stop-color="#364152" stop-opacity="0"/>
        </linearGradient></defs>
        <line x1="${PL}" y1="${PT + ih}" x2="${W - PR}" y2="${PT + ih}" stroke="#dce2ea" stroke-width="1.4"/>
        <path d="${areaPath}" fill="url(#grad)"/>
        <path d="${path('omzet')}" fill="none" stroke="#364152" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        <path d="${path('laba')}" fill="none" stroke="#F26A1B" stroke-width="2.2" stroke-dasharray="5 4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
        ${dots}${xlabels}
      </svg>
      <div class="trend-legend">
        <span class="legend-item"><span class="legend-dot" style="background:#364152"></span>Omzet</span>
        <span class="legend-item"><span class="legend-dot" style="background:#F26A1B"></span>Laba</span>
        <span class="legend-item" style="margin-left:auto;color:var(--faint)">Puncak ${compact(maxV)}</span>
      </div>
    </div>`;
  }

  /* ====================== RENDER: ARSIP HISTORIS ========================== */
  function renderHistory(s) {
    const d = historyData(s);
    if (!d.rows.length) {
      return {
        tag: 'Tidak ada arsip',
        data: d,
        kpi: '',
        body: panel(
          'hist-empty',
          'Arsip Historis Belum Tersedia',
          'Arsip unggahan lama dibaca terpisah dari operasional aktif.',
          'Belum ada arsip untuk outlet/periode ini. Arsip historis hanya mencakup 7 outlet (tanpa Sikecut Manis dan Mitra Kost) pada bulan Maret–November 2026.',
        ),
        mount: null,
      };
    }
    const t = d.totals;
    const p = d.previous;
    const dOmzet = p.omzet > 0 ? (t.omzet - p.omzet) / p.omzet : null;
    const dLaba = p.laba ? (t.laba - p.laba) / p.laba : null;
    const labaCaveat = t.labaCoverageOmzet < 0.999 ? `<span class="caveat" title="Tidak semua laporan mengisi HPP/beban">laba dari ${pct(t.labaCoverageOmzet)} omzet</span>` : '';
    const totalIssues = d.issues.critical + d.issues.warning;
    const healthPill = totalIssues === 0 ? '<span class="pill ok">Bersih</span>' : d.issues.critical > 0 ? `<span class="pill crit">${d.issues.critical} kritis</span>` : `<span class="pill warn">${d.issues.warning} perlu dicek</span>`;

    const hasLaba = d.rows.some((r) => r.laba !== null);
    const heroHtml = finCards({
      gross: compact(t.gross),
      net: compact(t.omzet),
      beban: hasLaba ? compact(t.beban) : '—',
      laba: hasLaba ? compact(t.laba) : '—',
      notes: {
        gross: 'Omzet kotor arsip sebelum retur · ' + t.weeks + ' laporan',
        net:
          'Setelah retur · ' + deltaHTML(dOmzet) + ' <span>vs ' + esc(d.period.prevLabel) + '</span>',
        beban: hasLaba ? 'HPP item + beban operasional outlet' : 'Properti: tanpa HPP barang',
        laba: hasLaba
          ? 'Net − beban · ' + pct(t.margin) + ' margin ' + deltaHTML(dLaba) + ' ' + labaCaveat
          : 'Tidak dihitung untuk unit properti',
      },
    });

    const tableRows = d.rows
      .map((r) => {
        const labaCell = r.laba ? compact(r.laba) : '<span style="color:var(--faint)">—</span>';
        const conf = r.labaConfidence < 0.999 ? `<div class="outlet-cat" style="color:var(--warnb)">laba ${pct(r.labaConfidence)} omzet</div>` : '';
        const wkRatio = r.expectedWeeks ? r.weeks / r.expectedWeeks : 1;
        const wkPill = wkRatio >= 0.999 ? `<span class="pill ok">${r.weeks}/${r.expectedWeeks}</span>` : `<span class="pill ${wkRatio < 0.6 ? 'crit' : 'warn'}">${r.weeks}/${r.expectedWeeks}</span>`;
        return `<tr>
          <td><div class="outlet-cell"><div class="outlet-emoji">${r.emoji}</div>
            <div style="min-width:0"><div class="outlet-name">${esc(r.name)}</div>
              <div class="outlet-cat">${esc(r.category)}</div>
              <div class="share-bar" title="${pct(r.share)} dari total"><span style="width:${Math.max(2, r.share * 100).toFixed(1)}%"></span></div>
            </div></div></td>
          <td class="num">${compact(r.omzet)}<div class="outlet-cat">${pct(r.share)}</div></td>
          <td class="num">${labaCell}${conf}</td>
          <td class="num">${pct(r.margin)}</td>
          <td class="num">${deltaHTML(r.deltaOmzet)}</td>
          <td class="num">${wkPill}</td>
          <td class="num">${r.issues > 0 ? `<span class="pill ${r.issues > 3 ? 'crit' : 'warn'}">${r.issues}</span>` : `<span class="pill ok">0</span>`}</td>
        </tr>`;
      })
      .join('');

    const asksHTML = d.asks.length
      ? d.asks.map((a) => `<div class="ask sev-${a.sev}"><div class="ask-icon"></div><div class="ask-body">
          <div class="ask-outlet">${a.emoji} ${esc(a.outlet)}</div>
          <div class="ask-title">${esc(a.title)}</div>
          <div class="ask-detail">${esc(a.detail)}</div>
          <div class="ask-q">→ ${esc(a.ask)}</div></div></div>`).join('')
      : `<div class="empty-ok">Tidak ada yang perlu dipertanyakan di periode ini.<br><span style="font-size:12px">Angka konsisten dan laporan lengkap.</span></div>`;

    const detailHTML = d.rows
      .map((o) => {
        const weekRows = o.detailWeeks
          .map((w) => {
            const flags = (w.issues || []).map((i) => `<span class="week-flag ${i.sev === 'critical' ? 'crit' : ''}">• ${esc(i.text)}</span>`).join('');
            return `<tr><td>${dmy(w.start)}–${dmy(w.end)}</td>
              <td class="num">${compact(w.omzet)}</td>
              <td class="num">${w.laba !== null ? compact(w.laba) : '<span style="color:var(--faint)">—</span>'}</td>
              <td class="num">${w.beban !== null ? compact(w.beban) : '<span style="color:var(--faint)">—</span>'}</td>
              <td class="num">${w.transaksi ? nf.format(w.transaksi) : '—'}</td>
              <td>${flags || '<span style="color:var(--faint)">—</span>'}</td></tr>`;
          })
          .join('');
        return `<div class="outlet-block" data-outlet="${esc(o.id)}">
          <div class="outlet-row">
            <svg class="caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
            <div class="outlet-row-main"><div class="outlet-emoji">${o.emoji}</div>
              <div><div class="outlet-name">${esc(o.name)}</div><div class="outlet-cat">${o.detailWeeks.length} laporan mingguan</div></div></div>
            <div class="outlet-row-nums">
              <div><div class="lbl">Omzet</div>${compact(o.omzet)}</div>
              <div><div class="lbl">Laba</div>${o.laba ? compact(o.laba) : '—'}</div>
              <div><div class="lbl">Margin</div>${pct(o.margin)}</div>
              <div><div class="lbl">Basket</div>${o.avgBasket ? compact(o.avgBasket) : '—'}</div>
            </div>
          </div>
          <div class="week-detail"><table class="week-tbl">
            <thead><tr><th>Minggu</th><th class="num">Omzet</th><th class="num">Laba</th><th class="num">Beban</th><th class="num">Trx</th><th>Catatan</th></tr></thead>
            <tbody>${weekRows}</tbody></table></div>
        </div>`;
      })
      .join('');

    const bodyHtml =
      '<div class="ex-toolbar"><span class="pill neutral">ARSIP HISTORIS · UNGGAHAN 19 NOVEMBER 2026</span>' +
      '<div><button class="btn-ghost" id="hist-csv">Ekspor CSV</button> <button class="btn-ghost" id="hist-print">Cetak / PDF</button></div></div>' +
      '<p class="ex-note">Data tersedia untuk <b>' + d.importedMonths + ' dari ' + d.expectedMonths + ' bulan</b>. Laporan tahunan tidak diekstrapolasi; angka arsip tidak dijumlahkan dengan operasional aktif.</p>' +
      secBlock(
        'hist-asks',
        'Perlu dipertanyakan',
        'Hal yang sebaiknya Bapak/Ibu tanyakan ke tim sebelum ambil keputusan',
        '<div class="panel"><div class="ask-list">' + asksHTML + '</div></div>',
      ) +
      secBlock(
        'hist-bestseller',
        'Best Seller',
        'Produk paling laku pada arsip historis. Omzet produk dibagi dari neto blok ini saja, tidak dijumlahkan dengan sumber lain.',
        '<div class="panel"><div class="panel-body">' +
          bestSellerMarkup(
            bestseller(
              d.rows.map((r) => r.id),
              Array.from(new Set(d.rows.flatMap((r) => r.detailWeeks.map((w) => w.start.slice(0, 7))))),
              t.omzet,
              'hist-bs',
            ),
          ) +
          '</div></div>',
      ) +
      '<div class="split" style="margin-top:26px"><div>' +
      secBlock(
        'hist-contrib',
        'Kontribusi per outlet',
        'Diurutkan dari omzet terbesar',
        '<div class="panel"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Outlet</th><th class="num">Omzet</th><th class="num">Laba</th><th class="num">Margin</th><th class="num">Δ Omzet</th><th class="num">Laporan</th><th class="num">Isu</th></tr></thead>' +
          '<tbody>' + (tableRows || '<tr><td colspan="7" class="empty-ok">Tidak ada data pada periode ini.</td></tr>') + '</tbody></table></div></div>',
      ) +
      '</div><div>' +
      secBlock(
        'hist-trend',
        'Tren ' + (s.mode === 'month' ? 'mingguan' : 'bulanan'),
        esc(d.period.label),
        '<div class="panel">' + trendChart(d.trend) + '</div>',
      ) +
      '</div></div>' +
      secBlock(
        'hist-weekly',
        'Rincian mingguan per outlet',
        'Klik outlet untuk melihat angka tiap minggu &amp; catatannya',
        '<div class="panel"><div class="detail-grid">' + (detailHTML || '<div class="empty-ok">Tidak ada data.</div>') + '</div></div>',
      );

    return {
      tag: 'ARSIP · ' + d.importedMonths + '/' + d.expectedMonths + ' bulan',
      data: d,
      kpi: heroHtml,
      body: bodyHtml,
      mount: (block) => {
        block.querySelectorAll('.outlet-row').forEach((el) => {
          el.addEventListener('click', () => el.closest('.outlet-block').classList.toggle('open'));
        });
        const csv = block.querySelector('#hist-csv');
        if (csv)
          csv.onclick = () =>
            exportRowsCSV('Simaung-Arsip-Historis-' + s.year + (s.mode === 'month' ? '-' + s.month : ''), [
              ['Outlet', 'Kategori', 'Omzet', 'Laba', 'Margin', 'Laporan mingguan'],
              ...d.rows.map((r) => [r.name, r.category, r.omzet, r.laba ?? '', r.margin ?? '', r.weeks]),
            ]);
        const pr = block.querySelector('#hist-print');
        if (pr) pr.onclick = () => window.print();
      },
    };
  }

  /* ====================== RENDER: OPERASIONAL AKTIF ======================= */
  function renderLive(s) {
    const d = liveData(s);
    const t = d.totals;
    const heroHtml = finCards({
      gross: rp(t.actual),
      net: rp(t.netRevenue),
      beban: rp(t.cogs),
      laba: rp(t.laba),
      notes: {
        gross: 'POS lunas periode terpilih · ' + nf.format(t.receipts) + ' nota',
        net: 'Setelah penyesuaian retur/pajak pada POS aktif',
        beban: 'HPP barang tercatat · properti tanpa HPP',
        laba: 'Net − HPP · beban operasional belum masuk',
      },
    });

    const performance = table(
      ['Outlet / bisnis', 'Omzet lunas', 'Periode sebelumnya*', 'Nota', 'Rata-rata / nota', 'Bukti'],
      d.outlets.map((o) =>
        row([
          '<b>' + esc(o.name) + '</b><div class="panel-sub">' + labels[o.unit] + '</div>',
          rp(o.actual),
          rp(o.previousActual) + (o.change === null ? '<div class="panel-sub">belum ada pembanding</div>' : '<div class="panel-sub">' + deltaHTML(o.change / 100) + '</div>'),
          nf.format(o.receipts),
          o.receipts ? rp(o.actual / o.receipts) : '—',
          '<button class="btn-ghost ex-evidence" data-key="' + esc(o.key) + '">Lihat nota</button>',
        ]),
      ),
    );

    const finance = table(
      ['Outlet', 'Pendapatan sebelum pajak', 'HPP tercatat', 'Laba kotor*', 'Tagihan belum dibayar'],
      d.outlets.map((o) =>
        row([
          esc(o.name),
          rp(o.netRevenue),
          o.cogs === null ? '<span style="color:var(--faint)">Properti · tanpa HPP barang</span>' : rp(o.cogs) + (o.costWarning ? '<div class="panel-sub">' + o.costWarning + ' nota HPP nol perlu diperiksa</div>' : ''),
          o.grossProfit === null ? '—' : rp(o.grossProfit),
          rp(o.unpaidBills),
        ]),
      ),
    );

    const alerts = d.alerts.length
      ? d.alerts
          .map((a) => '<article class="ex-alert"><div>' + badge(a.severity === 'crit' ? 'Prioritas tinggi' : 'Periksa', a.severity) + '</div><div><b>' + esc(a.name) + ' · ' + esc(a.title) + '</b><p>' + esc(a.detail) + '</p></div></article>')
          .join('')
      : '<p>Tidak ada peringatan terukur pada cakupan ini. Tetap periksa kelengkapan sumber data.</p>';

    const actions = table(
      ['Tindak lanjut', 'PIC', 'Tenggat', 'Status', 'Bukti'],
      d.actions.map((a) =>
        row([
          esc(a.title),
          esc(a.assignee),
          esc(a.due_on) + (a.status !== 'DONE' && a.due_on < '2026-11-23' ? '<div>' + badge('Lewat tenggat', 'crit') + '</div>' : ''),
          badge({ OPEN: 'Terbuka', IN_PROGRESS: 'Dikerjakan', DONE: 'Selesai' }[a.status] || a.status, a.status === 'DONE' ? 'ok' : 'warn'),
          esc(a.evidence || 'Belum ada bukti'),
        ]),
      ),
    );

    const quality = table(
      ['Outlet', 'Aktivitas terakhir pada periode', 'Kondisi data'],
      d.outlets.map((o) => row([esc(o.name), esc(dt(o.lastActivity)), esc(o.dataStatus)])),
    );

    const bodyHtml =
      '<div class="ex-toolbar"><span>' + badge('DEMO · Data dummy', 'neutral') + ' Dihitung ' + esc(dt(d.calculatedAt)) + '</span>' +
      '<div><button class="btn-ghost" id="live-csv">Ekspor CSV</button> <button class="btn-ghost" id="live-print">Cetak / PDF</button></div></div>' +
      '<nav class="ex-nav" aria-label="Bagian laporan"><a href="#ex-performance">Kinerja outlet</a><a href="#ex-bestseller">Best seller</a><a href="#ex-finance">Keuangan</a><a href="#ex-alerts">Peringatan</a><a href="#ex-quality">Kualitas data</a></nav>' +
      panel('ex-performance', 'Kinerja per Outlet', '*Periode berjalan dibanding tanggal kalender setara sebelumnya; periode selesai dibanding satu periode penuh. Angka target dan pencapaian target tidak ditampilkan pada halaman ini.', performance) +
      panel('ex-bestseller', 'Best Seller', 'Produk paling laku pada POS aktif. Omzet produk dibagi dari omzet blok ini saja, tidak dijumlahkan dengan sumber lain.', bestSellerMarkup(bestseller(d.outlets.map((o) => o.slug), monthsFor(s), t.actual, 'live-bs'))) +
      panel('ex-finance', 'Keuangan yang Dapat Ditelusuri', '*Laba kotor belum dikurangi gaji, sewa dan beban lainnya. Angka settlement bukan saldo rekening.', finance + '<p class="ex-note">Saldo kas/bank langsung dan proyeksi kewajiban pemasok belum tersedia. Angka tersebut tidak diestimasi dari omzet.</p>') +
      panel('ex-alerts', 'Peringatan &amp; Tindak Lanjut', 'Peringatan berasal dari angka dan kondisi yang terukur. Penugasan dicatat terpisah dari halaman laporan.', alerts + '<h3>Tugas &amp; Penanggung Jawab</h3>' + actions) +
      panel('ex-quality', 'Kelengkapan &amp; Sumber Data', 'Aktivitas terakhir bukan jaminan seluruh transaksi sudah terkirim. Status koneksi outlet tidak disimpulkan dari tidak adanya transaksi.', quality + '<ul>' + d.limitations.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>') +
      panel('ex-cashier', 'Kasir Harian (POS)', 'Transaksi POS aktif per tanggal WIB, mengikuti filter periode &amp; outlet.', '<div id="cashier-daily"></div>') +
      '<div id="ex-detail" aria-live="polite"></div>';

    return {
      tag: 'POS · ' + d.outlets.length + ' outlet',
      data: d,
      kpi: heroHtml,
      body: bodyHtml,
      mount: (block) => {
        const box = block.querySelector('#ex-detail');
        block.querySelectorAll('.ex-evidence').forEach((btn) => {
          btn.onclick = () => {
            const o = d.outlets.find((x) => x.key === btn.dataset.key);
            if (!o || !box) return;
            const rows = Array.from({ length: 6 }, (_, i) => ({
              ref: 'DEMO-' + String(i + 1).padStart(3, '0'),
              date: d.period.start,
              cashier: CASHIERS[i % CASHIERS.length],
              amount: Math.round(o.actual / 6 / 1000) * 1000,
              status: i === 2 ? 'REFUND' : 'PAID',
            }));
            box.innerHTML = panel(
              'ex-evidence',
              'Bukti ' + esc(o.name),
              'Halaman 1 · maksimal 50 baris per halaman · data dummy.',
              table(
                ['Referensi', 'Tanggal', 'Kasir', 'Nilai', 'Status'],
                rows.map((r) => row([esc(r.ref), esc(r.date), esc(r.cashier), rp(r.amount), r.status === 'PAID' ? badge('PAID', 'ok') : badge('REFUND', 'warn')])),
              ),
            );
            box.scrollIntoView({ behavior: 'smooth', block: 'start' });
          };
        });
        renderCashiers(s, block.querySelector('#cashier-daily'));
        const printBtn = block.querySelector('#live-print');
        if (printBtn) printBtn.onclick = () => window.print();
        const csvBtn = block.querySelector('#live-csv');
        if (csvBtn)
          csvBtn.onclick = () =>
            exportRowsCSV('Simaung-Operasional-' + d.period.start, [
              ['Outlet', 'Unit', 'Omzet', 'Nota', 'HPP', 'Laba kotor'],
              ...d.outlets.map((o) => [o.name, labels[o.unit], o.actual, o.receipts, o.cogs ?? '', o.grossProfit ?? '']),
            ]);
      },
    };
  }

  /* ============================== CASHIER DAILY =========================== */
  function renderCashiers(s, box) {
    if (!box) return;
    const codes = s.outlets === 'all' ? UNITS.map((u) => u.slug) : [s.outlets];
    const months = s.mode === 'month' ? [s.year + '-' + pad(s.month)] : monthsOfYear(s.year).filter((ym) => ym <= DATA_END);
    const rows = [];
    codes.forEach((code) => {
      const u = unitOf(code);
      months.forEach((ym) => {
        const mo = oseraMonth(code, ym);
        mo.rows.forEach((r) => {
          const rnd = mulberry32(seedOf('csh|' + code + '|' + r.day));
          rows.push({ day: r.day, code, outlet: u.name, cashier: r.cashier, receipts: r.receipts, sales: r.net, voids: rnd() > 0.9 ? 1 : 0, refunds: r.retur > 0 && rnd() > 0.5 ? 1 : 0 });
        });
      });
    });
    rows.sort((a, b) => b.day.localeCompare(a.day) || b.sales - a.sales);
    const slice = rows.slice(0, 40);
    box.innerHTML = slice.length
      ? '<div class="tbl-wrap"><table class="outlet-table"><thead><tr><th>Tanggal</th><th>Outlet</th><th>Kasir</th><th class="num">Nota lunas</th><th class="num">Penjualan lunas</th><th class="num">Void</th><th class="num">Refund</th></tr></thead><tbody>' +
        slice
          .map(
            (r) =>
              '<tr><td>' + esc(r.day) + '</td><td>' + esc(r.outlet) + '</td><td>' + esc(r.cashier) + '</td>' +
              '<td class="num">' + nf.format(r.receipts) + '</td><td class="num"><b>' + rp(r.sales) + '</b></td>' +
              '<td class="num">' + (r.voids ? '<span class="pill crit">' + r.voids + '</span>' : '<span class="pill neutral">0</span>') + '</td>' +
              '<td class="num">' + (r.refunds ? '<span class="pill warn">' + r.refunds + '</span>' : '<span class="pill neutral">0</span>') + '</td></tr>',
          )
          .join('') +
        '</tbody></table></div>'
      : '<div class="empty-block">Belum ada transaksi POS aktif untuk periode dan outlet ini.</div>';
  }

  /* ================================ ANALYSIS ============================== */
  function analysisText(s) {
    const L = liveData(s);
    const O = oseraData(s);
    const H = historyData(s);
    const topLive = L.outlets.slice().sort((a, b) => b.actual - a.actual)[0];
    const out = [
      'CONTOH ANALISIS DEMO — bukan respons Gemini langsung.',
      '',
      'Satu halaman · ' + s.year + ' · ' + (s.outlets === 'all' ? 'seluruh outlet' : unitName(s.outlets)) + '. Ketiga sumber dibaca terpisah dan tidak dijumlahkan.',
      '',
      'OPERASIONAL AKTIF (POS)',
      '• Omzet ' + rp(L.totals.actual) + ' dari ' + nf.format(L.totals.receipts) + ' nota lunas pada ' + L.outlets.length + ' outlet.',
    ];
    if (topLive) out.push('• Kontributor terbesar: ' + topLive.name + ' ' + rp(topLive.actual) + '.');
    out.push('• ' + L.alerts.length + ' hal perlu diperiksa (HPP nol / tagihan); ' + L.actions.length + ' tindak lanjut tercatat.');

    out.push('', 'ARSIP PENJUALAN (IMPOR)');
    if (O.empty) {
      out.push('• Belum ada arsip pada cakupan ini — tidak ada angka pengganti.');
    } else {
      const topMethod = O.methods[0];
      const byCashier = {};
      O.cashiers.forEach((c) => (byCashier[c.cashier] = (byCashier[c.cashier] || 0) + c.net));
      const best = Object.keys(byCashier).sort((a, b) => byCashier[b] - byCashier[a])[0];
      out.push(
        '• Pendapatan net ' + rp(O.totals.netRevenue) + ' dari ' + nf.format(O.receipts) + ' nota lunas; retur ' + rp(O.totals.returns) + ' sudah masuk angka neto.',
        '• Metode terbesar: ' + (topMethod ? topMethod.mode + ' ' + rp(topMethod.amount) : '—') + '; kasir kontributor terbesar: ' + (best || '—') + '.',
        '• HPP item ' + rp(O.totals.itemCogs) + '; beban operasional tidak ada pada arsip, sehingga laba tidak dihitung.',
      );
    }

    out.push('', 'ARSIP HISTORIS (UNGGAHAN)');
    if (!H.rows.length) {
      out.push('• Belum ada arsip untuk outlet/periode ini.');
    } else {
      out.push(
        '• Omzet ' + compact(H.totals.omzet) + ' dengan margin ' + pct(H.totals.margin) + ' dari ' + H.rows.length + ' outlet.',
        '• ' + H.totals.weeks + ' laporan mingguan; ' + (H.missing > 0 ? H.missing + ' minggu belum masuk.' : 'semua minggu masuk.'),
        '• ' + H.asks.length + ' hal perlu ditanyakan ke tim (beban mingguan dan kelengkapan HPP).',
      );
    }

    out.push(
      '',
      'Keterbatasan data: beban operasional tidak tersedia pada arsip; laba kotor belum dikurangi gaji, sewa dan utilitas.',
      'Perlu diverifikasi: cocokkan total dengan settlement bank/POS dan periksa HPP nol sebelum menilai margin.',
    );
    return out.join('\n');
  }

  /* ================================ EXPORTS =============================== */
  function exportRowsCSV(filename, rows) {
    const cell = (x) => '"' + String(x ?? '').replace(/^[=+@\-\t\r]/, "'").replace(/"/g, '""') + '"';
    const blob = new Blob(['\uFEFF' + rows.map((r) => r.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportOlseraCSV(s, d) {
    const t = d.totals;
    exportRowsCSV('Simaung-Arsip-Penjualan-' + s.year + (s.mode === 'month' ? '-' + pad(s.month) : ''), [
      ['Sumber', 'Simaung · arsip penjualan', 'Cakupan bulan', d.importedMonths + '/' + d.expectedMonths],
      ['Ukuran', 'Rupiah'],
      ['Pendapatan gross', t.grossRevenue],
      ['Pendapatan net', t.netRevenue],
      ['HPP item', t.itemCogs],
      ['Beban operasional outlet', 'Belum tersedia'],
      ['Laba', 'Belum dapat dihitung: net − HPP − beban operasional'],
      ['Data sumber', 'settledNet', t.settledNet],
      ['Data sumber', 'settledGross', t.settledGross],
      ['Data sumber', 'returns', t.returns],
      ['Data sumber', 'itemCogs', t.itemCogs],
    ]);
  }

  /* ================================== WIRING ============================== */
  const heroKpi = document.getElementById('hero-kpi');
  const root = document.getElementById('root');
  const seg = document.getElementById('mode-seg');
  const selMonth = document.getElementById('sel-month');
  const selYear = document.getElementById('sel-year');
  const selOutlet = document.getElementById('sel-outlet');
  const monthCtrl = document.getElementById('month-ctrl');
  const yearCtrl = document.getElementById('year-ctrl');
  const btnRefresh = document.getElementById('btn-refresh');
  const aiBtn = document.getElementById('owner-ai');
  const aiOut = document.getElementById('owner-ai-result');

  const ALL_MONTHS_HTML = (() => {
    let out = '';
    for (let m = 11; m >= 1; m--) {
      out += '<option value="' + m + '" data-year="2026">' + monthLabel('2026-' + pad(m)) + '</option>';
    }
    return out;
  })();

  function configurePeriods() {
    selMonth.innerHTML = ALL_MONTHS_HTML;
    selYear.innerHTML = '<option value="2026">2026</option><option value="2025">2025</option>';
    selMonth.value = String(state.month);
    selYear.value = String(state.year);
  }

  /* ---------------------- komposisi satu halaman (3 blok) ------------------ */
  /* status buka/tutup tiap blok, disimpan agar tidak hilang saat filter diganti */
  const BLOCK_IDS = ['live', 'olsera', 'history'];
  const COLLAPSE_KEY = 'simaung-collapsed-blocks';
  const collapsed = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');
      return { live: !!raw.live, olsera: !!raw.olsera, history: !!raw.history };
    } catch (e) {
      return { live: false, olsera: false, history: false };
    }
  })();

  function persistCollapsed() {
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
    } catch (e) {
      /* penyimpanan lokal tidak tersedia — status hanya berlaku di sesi ini */
    }
  }

  function srcBlock({ id, title, sub, tag, cols, kpi, body, summary }) {
    const open = !collapsed[id];
    const kpiHtml = kpi
      ? '<div class="kpi-grid light' + (cols === 3 ? ' cols-3' : '') + '">' + (Array.isArray(kpi) ? kpi.join('') : kpi) + '</div>'
      : '';
    return (
      '<section class="src-block' + (open ? '' : ' is-collapsed') + '" id="src-' + id + '" aria-labelledby="ttl-' + id + '">' +
      '<div class="src-head" data-toggle="' + id + '">' +
      '<div class="src-head-main">' +
      '<h2 class="src-title" id="ttl-' + id + '">' + title + '</h2>' +
      '<p class="src-sub">' + sub + '</p>' +
      '<p class="src-mini" aria-hidden="true">' + (summary ? esc(summary) : '') + '</p>' +
      '</div>' +
      '<div class="src-head-actions">' +
      '<span class="pill neutral">' + esc(tag) + '</span>' +
      '<button class="src-toggle" type="button" data-toggle-btn="' + id + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="body-' + id + '">' +
      '<span class="src-toggle-label">' + (open ? 'Tutup' : 'Buka') + '</span>' +
      '<svg class="src-caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
      '</button>' +
      '</div></div>' +
      '<div class="src-clip" id="body-' + id + '"><div class="src-clip-inner">' + kpiHtml +
      '<div class="src-body">' + body + '</div>' +
      '</div></div>' +
      '</section>'
    );
  }

  function setBlockOpen(id, open, persist) {
    collapsed[id] = !open;
    const block = root.querySelector('#src-' + id);
    if (!block) return;
    block.classList.toggle('is-collapsed', !open);
    const btn = block.querySelector('[data-toggle-btn="' + id + '"]');
    if (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      const lbl = btn.querySelector('.src-toggle-label');
      if (lbl) lbl.textContent = open ? 'Tutup' : 'Buka';
    }
    if (persist !== false) persistCollapsed();
  }

  function setAllBlocks(open) {
    BLOCK_IDS.forEach((id) => setBlockOpen(id, open, false));
    persistCollapsed();
  }

  /* ---------------- buka/tutup per poin (panel & grup seksi) --------------- */
  function setPanelOpen(id, open) {
    panelState[id] = !open;
    persistPanels();
    let host = null;
    if (id.indexOf('sec:') === 0) {
      host = root.querySelector('.sec-collapse > .section-head[data-p-toggle="' + id + '"]');
      host = host ? host.parentElement : null;
    } else {
      host = root.querySelector('.panel[data-pid="' + id + '"]') || root.querySelector('#' + id);
    }
    if (!host) return;
    host.classList.toggle('is-collapsed', !open);
    const head = host.querySelector('[data-p-toggle]');
    if (head) {
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      const lbl = head.querySelector('.panel-toggle .src-toggle-label');
      if (lbl) lbl.textContent = open ? 'Tutup' : 'Buka';
    }
  }

  function setAllPanels(open) {
    const heads = root.querySelectorAll('[data-p-toggle]');
    heads.forEach((head) => {
      const id = head.dataset.pToggle;
      if (!id) return;
      panelState[id] = !open;
      const host = head.classList.contains('section-head') ? head.parentElement : head.closest('.panel');
      if (host) host.classList.toggle('is-collapsed', !open);
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      const lbl = head.querySelector('.panel-toggle .src-toggle-label');
      if (lbl) lbl.textContent = open ? 'Tutup' : 'Buka';
    });
    persistPanels();
  }

  /* delegasi klik & keyboard untuk semua poin yang bisa dibuka/tutup */
  function bindPanelToggles() {
    root.addEventListener('click', (e) => {
      const head = e.target.closest('[data-p-toggle]');
      if (!head || !root.contains(head)) return;
      /* jangan bentrok dengan tombol/elemen interaktif di dalam header */
      if (e.target.closest('button:not(.panel-toggle), a, select, input, summary, [data-batch], [data-key]')) return;
      const host = head.classList.contains('section-head') ? head.parentElement : head.closest('.panel');
      if (!host) return;
      setPanelOpen(head.dataset.pToggle, host.classList.contains('is-collapsed'));
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const head = e.target.closest('[data-p-toggle]');
      if (!head || !root.contains(head)) return;
      if (e.target.closest('button, a, select, input, summary')) return;
      e.preventDefault();
      const host = head.classList.contains('section-head') ? head.parentElement : head.closest('.panel');
      if (!host) return;
      setPanelOpen(head.dataset.pToggle, host.classList.contains('is-collapsed'));
    });
  }

  function heroSummary(L, O, H) {
    /* Kartu utama memakai satu sumber agar tidak mencampur angka:
       Arsip Penjualan bila sudah diimpor, jika tidak POS aktif. */
    if (!O.empty) {
      const t = O.totals;
      return finCards({
        gross: rp(t.grossRevenue),
        net: rp(t.netRevenue),
        beban: rp(t.itemCogs),
        /* Laba = Net − Beban (identitas pasti) */
        laba: rp(t.netRevenue - t.itemCogs),
        notes: {
          gross: 'Arsip penjualan · sebelum retur',
          net: 'Setelah retur & pembulatan · ' + O.importedMonths + ' bulan terimpor',
          beban: 'HPP item tercatat pada arsip',
          laba: 'Net − HPP · beban operasional belum tersedia',
        },
      });
    }
    const tl = L.totals;
    return finCards({
      gross: rp(tl.actual),
      net: rp(tl.netRevenue),
      beban: rp(tl.cogs),
      laba: rp(tl.laba),
      notes: {
        gross: 'POS aktif periode terpilih · tidak dijumlahkan dengan arsip',
        net: 'Setelah penyesuaian retur/pajak · ' + nf.format(tl.receipts) + ' nota',
        beban: 'HPP barang tercatat · properti tanpa HPP',
        laba: 'Net − HPP · beban operasional belum masuk',
      },
    });
  }

  const BLOCK_META = {
    live: {
      title: 'Operasional Aktif',
      sub: 'Angka POS Simaung yang sedang berjalan: kinerja, keuangan, peringatan, dan kelengkapan sumber data.',
      cols: 4,
    },
    olsera: {
      title: 'Arsip Penjualan',
      sub: 'Laporan penjualan historis yang sudah diimpor dan dicocokkan. Terpisah dari transaksi POS aktif.',
      cols: 4,
    },
    history: {
      title: 'Arsip Historis',
      sub: 'Arsip laporan unggahan 19 November 2026 untuk 7 outlet. Tidak dijumlahkan dengan sumber lain.',
      cols: 4,
    },
  };

  function load() {
    heroKpi.innerHTML = '<div class="loading-state" style="grid-column:1/-1"><div class="spinner"></div><p>Menghitung ringkasan…</p></div>';
    root.innerHTML = '<div class="loading-state"><div class="spinner" style="border-top-color:#364152"></div><p>Memuat rincian…</p></div>';
    if (aiOut) aiOut.textContent = '';
    if (aiBtn) aiBtn.disabled = false;

    const s = { ...state };
    const live = renderLive(s);
    const olsera = renderOlsera(s);
    const history = renderHistory(s);

    heroKpi.innerHTML = heroSummary(live.data, olsera.data, history.data);

    const L = live.data;
    const O = olsera.data;
    const H = history.data;
    const summaries = {
      live: rp(L.totals.actual) + ' · ' + nf.format(L.totals.receipts) + ' nota · ' + L.outlets.length + ' outlet',
      olsera: O.empty
        ? 'Belum ada data impor pada cakupan ini'
        : rp(O.totals.netRevenue) + ' net · ' + nf.format(O.receipts) + ' nota · ' + O.importedMonths + ' bulan',
      history: H.rows.length
        ? compact(H.totals.omzet) + ' omzet · margin ' + pct(H.totals.margin) + ' · ' + H.rows.length + ' outlet'
        : 'Belum ada arsip pada cakupan ini',
    };

    root.innerHTML = [
      srcBlock({ id: 'live', ...BLOCK_META.live, tag: live.tag, kpi: live.kpi, body: live.body, summary: summaries.live }),
      srcBlock({ id: 'olsera', ...BLOCK_META.olsera, tag: olsera.tag, kpi: olsera.kpi, body: olsera.body, summary: summaries.olsera }),
      srcBlock({ id: 'history', ...BLOCK_META.history, tag: history.tag, kpi: history.kpi, body: history.body, summary: summaries.history }),
    ].join('');

    /* klik judul blok = buka/tutup; tombol eksplisit tetap tersedia */
    root.querySelectorAll('.src-head').forEach((head) => {
      head.addEventListener('click', () => {
        const id = head.dataset.toggle;
        const isOpen = !head.closest('.src-block').classList.contains('is-collapsed');
        setBlockOpen(id, !isOpen);
      });
    });

    /* navigasi internal: buka blok & poin yang tertutup, lalu gulir */
    root.querySelectorAll('.ex-nav a[href^="#ex-"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = root.querySelector(a.getAttribute('href'));
        if (!target) return;
        let prevented = false;
        if (target.closest('.src-block.is-collapsed')) {
          e.preventDefault();
          setBlockOpen('live', true);
          prevented = true;
        }
        const hostPanel = target.classList.contains('panel') ? target : target.closest('.panel.is-collapsed');
        if (hostPanel && hostPanel.id) {
          e.preventDefault();
          setPanelOpen(hostPanel.id, true);
          prevented = true;
        }
        if (prevented) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    [
      ['live', live],
      ['olsera', olsera],
      ['history', history],
    ].forEach(([id, r]) => {
      const block = root.querySelector('#src-' + id);
      if (block && r.mount) r.mount(block);
    });
  }

  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.mode = btn.dataset.mode;
    seg.querySelectorAll('.seg-btn').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    monthCtrl.hidden = state.mode !== 'month';
    yearCtrl.hidden = state.mode !== 'year';
    load();
  });

  selMonth.addEventListener('change', () => {
    state.month = Number(selMonth.value);
    load();
  });
  selYear.addEventListener('change', () => {
    state.year = Number(selYear.value);
    load();
  });
  selOutlet.addEventListener('change', () => {
    state.outlets = selOutlet.value;
    load();
  });
  const btnExpandAll = document.getElementById('btn-expand-all');
  const btnCollapseAll = document.getElementById('btn-collapse-all');
  if (btnExpandAll)
    btnExpandAll.addEventListener('click', () => {
      setAllBlocks(true);
      setAllPanels(true);
    });
  if (btnCollapseAll)
    btnCollapseAll.addEventListener('click', () => {
      setAllBlocks(false);
      setAllPanels(false);
    });

  btnRefresh.addEventListener('click', () => {
    btnRefresh.classList.add('is-spinning');
    load();
    setTimeout(() => btnRefresh.classList.remove('is-spinning'), 500);
  });

  const exitBtn = document.getElementById('btn-exit');
  if (exitBtn)
    exitBtn.onclick = () => {
      aiOut.textContent = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toastDemo('Demo tanpa akun — Anda sudah berada di dashboard.');
    };

  function toastDemo(msg) {
    let t = document.getElementById('demo-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'demo-toast';
      t.style.cssText =
        'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#161b24;color:#fff;' +
        'font:700 12.5px "Plus Jakarta Sans",system-ui;padding:12px 18px;border-radius:12px;z-index:10000;' +
        'box-shadow:0 18px 40px -16px rgba(0,0,0,.55);opacity:0;transition:opacity .25s';
      document.body.append(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => (t.style.opacity = '1'));
    clearTimeout(t.__h);
    t.__h = setTimeout(() => (t.style.opacity = '0'), 2400);
  }

  if (aiBtn)
    aiBtn.onclick = () => {
      aiBtn.disabled = true;
      aiOut.textContent = 'Menyiapkan contoh analisis…';
      setTimeout(() => {
        aiOut.textContent = analysisText({ ...state });
        aiBtn.disabled = false;
      }, 220);
    };

  function syncControls() {
    seg.querySelectorAll('.seg-btn').forEach((b) => {
      const on = b.dataset.mode === state.mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    monthCtrl.hidden = state.mode !== 'month';
    yearCtrl.hidden = state.mode !== 'year';
    if (selOutlet) selOutlet.value = state.outlets;
  }

  configurePeriods();
  syncControls();
  bindPanelToggles();
  load();
})();
