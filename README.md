# Pusat Laporan Outlet — Simaung Corporation

Rebuild 1:1 halaman **"Pusat Laporan Outlet — Simaung Corporation"**, dengan tambahan mekanisme **buka/tutup (close up / close in)** pada setiap poin di dalam tiga blok utama: **Arsip Penjualan**, **Operasional Aktif**, dan **Arsip Historis**.

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
| 1 | Judul blok sumber (**Arsip Penjualan**, **Operasional Aktif**, **Arsip Historis**) | Membuka/menutup seluruh isi blok |
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
| Playwright | Tanpa error console |

## Belum Diimplementasi

- Analisis AI sungguhan (masih narasi contoh statis, sama seperti aslinya tanpa endpoint backend)
- Login/otentikasi & data produksi (mode demo)
- Penyimpanan data (tidak diperlukan untuk demo ini)

## Catatan

Deploy belum dilakukan. Ada dua jalur yang tersedia — akun Cloudflare Anda sendiri (perlu API token di panel Deploy) atau hosting Genspark (tanpa token).
