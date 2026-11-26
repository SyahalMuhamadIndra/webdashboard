# Pusat Laporan Outlet — Simaung Corporation

Rebuild 1:1 halaman **"Pusat Laporan Outlet — Simaung Corporation"**, dengan tambahan mekanisme **buka/tutup (close up / close in)** pada setiap poin di dalam tiga blok sumber (**Arsip Penjualan**, **Operasional Aktif**, **Arsip Historis**) ditambah satu blok tersendiri **Best Seller**.

## Ringkasan Proyek

- **Nama**: webapp — Pusat Laporan Outlet (demo laporan seluruh outlet)
- **Tujuan**: Menyajikan omzet, laba, margin, dan temuan dari tiga sumber data (Arsip Penjualan, Operasional Aktif, Arsip Historis) dalam satu layar, dengan filter periode & outlet. Setiap blok dan setiap poin di dalamnya dapat dibuka/ditutup agar layar tidak penuh.
- **Status kesamaan**: HTML hasil render **identik dengan halaman aslinya** (0 baris berbeda); aset CSS/JS diambil utuh dari sumber aslinya.
- **Catatan data**: seluruh angka adalah **data dummy deterministik** (seeded) yang dihasilkan di sisi klien — tidak ada data produksi maupun API eksternal.

## URL

- **Preview sandbox**: https://3000-ixu605l4cw1ooifi7cvsm-2e77fc33.sandbox.novita.ai
- **Health check**: `/api/health` → `{ ok, app, updatedAt }`

## Stack

- Hono + TypeScript (Cloudflare Pages / Workers)
- Vite build (`@hono/vite-build/cloudflare-pages`)
- Frontend statis: `public/static/outlet-dashboard.css`, `dashboard.js`, `screen.js`
- HTML halaman di `src/dashboard.html`, di-import sebagai raw string (`?raw`) dan disajikan di `/`

## Struktur

```
src/index.tsx          # Hono app: GET / -> dashboard.html, GET /api/health
src/dashboard.html     # markup halaman (identik dengan aslinya)
src/raw.d.ts           # type declaration untuk import *.html?raw
public/static/         # css + js aset
ecosystem.config.cjs   # PM2 config (wrangler pages dev, port 3000)
```

## Mekanisme Buka/Tutup (3 tingkat)

| Tingkat | Yang bisa diklik | Perilaku |
|---|---|---|
| 1 | Judul blok (**Operasional Aktif**, **Arsip Penjualan**, **Arsip Historis**, **Best Seller**) | Membuka/menutup seluruh isi blok |
| 2 | Judul poin/panel di dalam blok (**Kinerja per Outlet**, **Keuangan yang Dapat Ditelusuri**, **Peringatan & Tindak Lanjut**, **Kelengkapan & Sumber Data**, **Kasir Harian**, **Asal Data & Riwayat Impor**, **Pencocokan Angka**, **Kasir/Penjual per Hari**, **Penjualan Harian Sumber**, **Metode pada Nota Sumber**) | Membuka/menutup poin tersebut saja |
| 3 | Judul grup di **Arsip Historis** (**Perlu dipertanyakan**, **Kontribusi per outlet**, **Tren mingguan/bulanan**, **Rincian mingguan per outlet**) | Membuka/menutup grup beserta tabel/grafiknya |

Detail perilaku:

- **Klik di mana saja pada header** (bukan hanya tombol) untuk buka/tutup; ada juga tombol **Buka/Tutup** dengan caret yang berputar.
- **Animasi halus** memakai `grid-template-rows: 1fr ↔ 0fr` (tanpa mengukur tinggi manual), dihormati `prefers-reduced-motion`.
- **Status tersimpan** di `localStorage` (`simaung-collapsed-panels` + `simaung-collapsed-blocks`), jadi tidak hilang saat filter periode/outlet diganti atau halaman dimuat ulang.
- **Tombol "Buka semua" / "Tutup semua"** di control bar mengatur blok **dan** semua poin sekaligus.
- **Navigasi internal** (`Kinerja outlet`, `Keuangan`, `Peringatan`, `Kualitas data`) otomatis membuka blok/poin yang sedang tertutup sebelum menggulir ke sana.
- **Aksesibilitas**: `aria-expanded`, `aria-controls`, `role="button"`, `tabindex="0"`, dukung `Enter`/`Space`, dan `focus-visible`.
- **Cetak/PDF**: semua poin otomatis terbuka (`@media print`), tombol toggle disembunyikan.

## Fitur Lain yang Sudah Jalan

- Header/topbar, hero, dan kartu KPI yang dihitung dari data dummy
- Filter periode: segmen **Bulanan / Tahunan** + dropdown bulan/tahun
- Filter **Outlet** (9 outlet: Sikecut Manis, Mitra Kost, Cherry Bakes House, Maja Koffie, Mitra Water, RM Sindang Hurip, River Inn, Sweet Escape, Toko Kartini)
- Tombol **Muat ulang** data
- Tiga blok sumber data ditampilkan **terpisah** (tidak saling dijumlahkan)
- Panel **Analisis Gemini** → tombol "Lihat contoh analisis" menghasilkan narasi contoh
- Bukti nota per outlet, ekspor CSV per blok, tombol layar penuh (`screen.js`), toast "Kembali ke Login"
- Mendukung query string `?mode=month|year&month=..&year=..` untuk state awal

### Best Seller — blok tersendiri

Best Seller adalah **blok ke-4 yang berdiri sendiri**, di luar Operasional Aktif, Arsip Penjualan, dan Arsip Historis.

| Blok | ID blok | Render |
|---|---|---|
| Best Seller | `src-bs` | `renderBestseller(s)` |

Isi: **3 kartu peringkat** (emas/perak/perunggu) + baris ringkasan + **tabel peringkat lengkap** (Peringkat · Produk · Kategori · Terjual · Omzet · Kontribusi), plus **Ekspor CSV** dan **Cetak / PDF**.

Blok ini bisa dibuka/ditutup seperti blok lain (klik judul atau tombol Buka/Tutup), ikut terhitung di **Buka semua / Tutup semua** (4 blok), dan statusnya tersimpan di `localStorage` (`simaung-collapsed-blocks`).

**Aturan angka**: omzet produk dibagi ke produk dengan bobot popularitas deterministik, lalu totalnya **dipaksa persis sama** dengan neto Arsip Historis pada cakupan yang sama (selisih pembulatan dimasukkan ke produk teratas). Jadi omzet produk tidak pernah dijumlahkan dengan blok lain.

Best Seller **tidak** lagi berada di dalam Arsip Historis, dan tidak dipasang di Operasional Aktif maupun Arsip Penjualan.

## Catatan Layout: Tabel Kontribusi vs Kartu Tren

Tabel **Kontribusi per outlet** (7 kolom) di Arsip Historis pernah menembus batas kolom dan menimpa kartu **Tren** di sebelahnya. Penyebab dan perbaikannya:

| Penyebab | Perbaikan |
|---|---|
| `.panel-clip` memakai `display:grid` **tanpa** `grid-template-columns`, sehingga kolomnya berukuran `auto` (selebar konten) dan tabel lebar melebarkan kolom melewati batas. | Ditambah `grid-template-columns:minmax(0,1fr)` dan `.panel-clip-inner{min-width:0}`. |
| `.split` memakai `1.3fr 1fr`; minimum `auto` pada `fr` juga membuat kolom bisa melebihi jatah. | Diganti `minmax(0,1.3fr) minmax(0,1fr)`; `.split > div{min-width:0}`, dan satu kolom di ≤1024px. |

Catatan: `overflow:hidden` **tidak** dipakai pada `.split > div`, karena mematikan `thead` sticky di dalam `.tbl-wrap`.

## Ringkasan URI

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/` | Halaman dashboard |
| GET | `/api/health` | Health check |
| GET | `/static/outlet-dashboard.css` | Styling (termasuk CSS buka/tutup) |
| GET | `/static/dashboard.js` | Logika data dummy, filter, dan buka/tutup |
| GET | `/static/screen.js` | Tombol layar penuh |

## Menjalankan

```bash
npm run build
pm2 start ecosystem.config.cjs   # http://localhost:3000
```

## Hasil Verifikasi

| Cek | Hasil |
|---|---|
| `/` | 200 · judul "Pusat Laporan Outlet — Simaung Corporation" |
| Diff HTML vs aslinya | **0 baris berbeda (identik)** |
| `/static/outlet-dashboard.css` | 200 · 35.030 byte |
| `/static/dashboard.js` | 200 · 76.576 byte |
| `/api/health` | `{"ok":true,"app":"Pusat Laporan Outlet",...}` |
| Uji klik (jsdom) | Tutup/buka **Kinerja per Outlet** & **Keuangan** ✓ · grup Arsip Historis ✓ · Tutup semua 3/3 blok + 10/10 poin + 4/4 grup ✓ · Buka semua ✓ · state tersimpan ✓ |
| Tombol Tutup/Buka semua | kini mencakup **4 blok** (`BLOCK_IDS = ['live','olsera','history','bs']`) |
| Blok Best Seller (diukur di DOM, viewport 1280px) | blok = `[src-live, src-olsera, src-history, src-bs]` · `bsDiDalamArsipHistoris = 0` · 3 kartu · 24 baris tabel · 1 ringkasan · buka/tutup blok berfungsi ✓ |
| Playwright | Tanpa error console |

## Belum Diimplementasi

- Analisis AI sungguhan (masih narasi contoh statis, sama seperti aslinya tanpa endpoint backend)
- Login/otentikasi & data produksi (mode demo)
- Penyimpanan data (tidak diperlukan untuk demo ini)

## Catatan

Deploy belum dilakukan. Ada dua jalur yang tersedia — akun Cloudflare Anda sendiri (perlu API token di panel Deploy) atau hosting Genspark (tanpa token).
