# Spesifikasi Desain — Website Saham IPO Indonesia

Tanggal: 2026-07-06
Status: Disetujui untuk perencanaan implementasi

## 1. Ringkasan

Website publik berbahasa Indonesia tentang saham IPO di Bursa Efek Indonesia. Fitur inti:

1. **Informasi IPO** — profil perusahaan, jadwal, harga, jumlah lot yang ditawarkan, porsi penjatahan; data diambil otomatis dari e-ipo.co.id.
2. **Kalkulator ARA/ARB & profit/loss** — user memasukkan jumlah lot; sistem menampilkan harga ARA/ARB (hari pertama dan proyeksi berjenjang), modal yang dibutuhkan, dan potensi untung/rugi.
3. **Kalkulator estimasi penjatahan** — user memasukkan jumlah lot yang dipesan; sistem memperkirakan lot yang didapat berdasarkan aturan penjatahan terpusat OJK dan rasio oversubscription.
4. **Analisis underwriter** — track record tiap penjamin emisi: jumlah IPO, % ARA hari pertama, rata-rata return hari pertama, total nilai emisi.

Hosting: VPS milik pemilik proyek. Target pengguna: publik (investor ritel IPO).

## 2. Arsitektur

Dua aplikasi + satu database di satu VPS, di belakang reverse proxy (Nginx atau Caddy):

```
Pengunjung ── HTTPS ──> Reverse proxy ──> Next.js (frontend, SSR)
                              │                │ HTTP internal (REST JSON)
                              └── /api/* ──────▼
                                          FastAPI (backend)
                                              │ SQLAlchemy
                                              ▼
                                           SQLite
                                              ▲
                                APScheduler (dalam proses FastAPI):
                                scraper e-IPO + fetcher harga Yahoo Finance
```

- **FastAPI (Python 3.12+)** — pemilik tunggal database. Menyediakan REST API untuk Next.js, menjalankan scraper terjadwal via APScheduler (in-process, tanpa cron OS).
- **Next.js (TypeScript, App Router)** — murni frontend; SSR/ISR untuk SEO. Tidak menyentuh database. Kalkulator berjalan sepenuhnya client-side.
- **SQLite** via SQLAlchemy — cukup untuk skala data (ratusan IPO); jalur migrasi ke PostgreSQL terbuka karena akses via SQLAlchemy.
- **Repo**: monorepo — `backend/` (FastAPI) dan `frontend/` (Next.js).
- **Deploy**: Docker Compose (satu service per aplikasi + reverse proxy) — reproducible di VPS mana pun dan menyatukan Python + Node dalam satu perintah deploy.

## 3. Model Data

### `ipos`
| Kolom | Keterangan |
|---|---|
| `id` | PK internal |
| `eipo_id` | ID numerik dari URL e-IPO (unik; kunci upsert) |
| `ticker`, `company_name`, `sector`, `description` | Identitas emiten |
| `logo_url`, `prospectus_url`, `source_url` | Tautan |
| `price_low`, `price_high` | Rentang harga bookbuilding (Rp) |
| `final_price` | Harga penawaran final (nullable sampai diumumkan) |
| `shares_offered` | Jumlah saham ditawarkan; `lots_offered` = saham ÷ 100 (derivasi) |
| `ipo_value` | Nilai emisi = harga final (atau titik tengah rentang) × saham |
| `percent_of_capital` | % saham ditawarkan terhadap modal disetor |
| `bookbuilding_start/end`, `offering_start/end`, `allotment_date`, `listing_date` | Jadwal |
| `status` | `bookbuilding` → `offering` → `allotment` → `listed` (mengikuti label e-IPO) |
| `pooling_pct` | Porsi penjatahan terpusat (%), nullable |
| `oversub_ratio` | Rasio oversubscription penjatahan terpusat, **nullable** — e-IPO tidak selalu mempublikasikan; jika kosong, kalkulator meminta input manual user |
| `scraped_at`, `created_at`, `updated_at` | Meta |

### `underwriters` dan `ipo_underwriters`
- `underwriters`: `id`, `code` (kode broker, mis. "CC"), `name`.
- `ipo_underwriters`: `ipo_id`, `underwriter_id`, `is_lead` (penjamin pelaksana vs peserta). Satu IPO bisa punya banyak underwriter.

### `ipo_performance`
Satu baris per IPO yang sudah listing: `ipo_id`, `day1_open`, `day1_high`, `day1_low`, `day1_close`, `day1_return_pct` (close vs harga IPO), `day1_ara` (boolean: close menyentuh batas ARA hari pertama), `fetched_at`. Sumber: Yahoo Finance (ticker `.JK`), diambil satu kali per saham setelah listing.

Statistik underwriter (jumlah IPO, % ARA hari 1, rata-rata return, total emisi) **dihitung agregat saat query**, tidak disimpan — skala data kecil.

### `scrape_runs`
Log tiap eksekusi: `id`, `kind` (`eipo` | `prices`), `started_at`, `finished_at`, `status` (`success` | `partial` | `failed`), `items_processed`, `message`. Dipakai untuk pemantauan kesehatan scraper.

## 4. Scraper

### Sumber 1 — e-IPO (`e-ipo.co.id`)
Terverifikasi: halaman server-rendered, merespons 200 dengan User-Agent browser; tidak butuh headless browser. Stack: `requests` + `BeautifulSoup`.

Jadwal (APScheduler) — prinsip: IPO jarang terjadi, scraping harus minimal:
1. **Cek indeks 1× sehari** — halaman pertama daftar e-IPO saja, untuk mendeteksi IPO baru dan perubahan status.
2. **Scrape detail hanya IPO aktif** (status belum `listed`) + IPO yang baru terdeteksi. IPO `listed` dianggap final, tidak di-scrape ulang.
3. **Scrape awal satu kali** saat setup: seluruh arsip e-IPO (~250 emiten, paginasi `?page=N&per-page=12`) untuk data historis.
4. **Trigger manual**: `POST /api/admin/scrape` (dilindungi bearer token dari env `ADMIN_TOKEN`) untuk refresh paksa.
5. Jeda antar-request ±2 detik; User-Agent browser.

### Sumber 2 — Harga hari pertama (Yahoo Finance)
- Job harian: untuk setiap IPO berstatus `listed` yang belum punya baris `ipo_performance`, ambil data harian ticker `.JK` dan simpan OHLC hari perdagangan pertama.
- Saham baru kadang belum tersedia di Yahoo → retry otomatis di run harian berikutnya; tidak memblokir saham lain.
- `day1_ara` dihitung dengan membandingkan `day1_close` terhadap harga batas ARA hari pertama (lihat §7).

## 5. API (FastAPI)

| Endpoint | Fungsi |
|---|---|
| `GET /api/ipos?status=&page=&q=` | Daftar IPO (filter status, cari nama/ticker, paginasi) |
| `GET /api/ipos/{ticker}` | Detail satu IPO termasuk underwriter dan performa hari 1 |
| `GET /api/underwriters` | Daftar underwriter + statistik agregat |
| `GET /api/underwriters/{code}` | Detail underwriter: statistik + daftar IPO garapannya |
| `GET /api/health` | Status aplikasi + waktu scrape sukses terakhir per `kind` |
| `POST /api/admin/scrape` | Trigger scrape manual (bearer `ADMIN_TOKEN`) |

Semua respons JSON; CORS tidak dibuka publik (Next.js memanggil server-side via jaringan internal).

## 6. Halaman Frontend (Next.js)

1. **Beranda `/`** — IPO dikelompokkan: sedang bookbuilding/offering (atas), akan listing, baru listing (dengan return hari 1). Kartu per IPO: logo, ticker, nama, status, harga/rentang, tanggal penting.
2. **Detail IPO `/ipo/[ticker]`** — profil, jadwal, harga & jumlah lot, porsi penjatahan, daftar underwriter (tautan ke halaman underwriter), dan dua kalkulator tertanam yang terisi otomatis harga IPO tersebut.
3. **Kalkulator mandiri `/kalkulator`** — kalkulator ARA/ARB untuk harga bebas (tidak terikat IPO tertentu).
4. **Underwriter `/underwriter` dan `/underwriter/[code]`** — daftar + detail track record.

Rendering: SSR/ISR (revalidate ± 1 jam) agar halaman IPO ter-index mesin pencari. Bahasa antarmuka: Indonesia. Format angka: Rupiah dengan pemisah ribuan Indonesia.

## 7. Logika Kalkulator (TypeScript, client-side, `frontend/lib/`)

Semua aturan bursa/OJK disimpan sebagai **objek konfigurasi berversi** (bukan angka mati tersebar di kode), karena BEI/OJK beberapa kali mengubah aturan. Nilai awal di bawah ini diverifikasi terhadap sumber per Juli 2026; verifikasi ulang terhadap teks peraturan resmi (Peraturan BEI II-A dan lampiran SEOJK 25/2025 di ojk.go.id) adalah tugas eksplisit dalam rencana implementasi.

### 7a. Kalkulator ARA/ARB & profit/loss

Konfigurasi awal:
- **ARA reguler** per rentang harga: Rp50–200 → 35%; >Rp200–5.000 → 25%; >Rp5.000 → 20%.
- **ARB reguler**: 15% seragam semua rentang (berlaku sejak 8 April 2025).
- **Hari pertama listing IPO**: batas auto rejection = **2× persentase reguler**, acuan harga penawaran (ARA 70%/50%/40%; ARB 30%).
- **Fraksi harga**: <Rp200 → Rp1; Rp200–<500 → Rp2; Rp500–<2.000 → Rp5; Rp2.000–<5.000 → Rp10; ≥Rp5.000 → Rp25. Harga ARA dibulatkan **ke bawah** ke fraksi valid; ARB **ke atas**. Harga minimum Rp50.

Input: jumlah lot (harga otomatis dari data IPO; di halaman kalkulator mandiri, harga diisi user).
Output:
- Harga ARA & ARB hari pertama.
- Proyeksi berjenjang N hari (default 5): ARA hari ke-n dihitung dari harga ARA hari ke-(n-1) dengan persentase reguler (hari ≥2 bukan lagi 2×); demikian juga ARB.
- Modal = harga × lot × 100; potensi profit/loss (Rp dan %) di tiap skenario harian.

Validasi input: lot bilangan bulat positif; harga Rp50–Rp1.000.000 (batas wajar); pesan error Bahasa Indonesia.

### 7b. Kalkulator estimasi penjatahan (SEOJK 25/SEOJK.04/2025)

Konfigurasi awal — alokasi minimal penjatahan terpusat per golongan nilai emisi (dipakai nilai yang lebih besar antara % dan nominal):

| Golongan | Nilai emisi | Alokasi minimal |
|---|---|---|
| I | ≤ Rp100 miliar | 20% atau Rp10 miliar |
| II | >Rp100–250 miliar | 20% atau Rp15 miliar |
| III | >Rp250 miliar–1 triliun | 15% atau Rp20 miliar |
| IV | >Rp1–2,5 triliun | 15% atau Rp25 miliar |
| V | > Rp2,5 triliun | 10% atau Rp30 miliar |

- Penyesuaian naik saat oversubscription melewati ambang **2,5× / 10× / 25×** (Tabel 2 SEOJK 25/2025; nilai per sel diambil langsung dari lampiran resmi saat implementasi dan dimasukkan ke objek konfigurasi yang strukturnya sudah ditetapkan di sini: `{golongan, ambang_oversub, alokasi_pct}`).
- **Porsi ritel = ½ dari penjatahan terpusat** (ritel: pesanan ≤ Rp100 juta); non-ritel ½ sisanya.
- Batas pesanan kumulatif per investor: 10% dari nilai efek yang ditawarkan (dipakai sebagai validasi input).

Input: jumlah lot dipesan; rasio oversubscription (terisi otomatis dari `oversub_ratio` bila ada, kalau tidak user isi manual).
Logika estimasi: tentukan golongan dari nilai emisi → alokasi pooling (dengan penyesuaian oversubscription) → pool ritel/non-ritel sesuai nilai pesanan → estimasi lot didapat ≈ maks(1 lot, pesanan ÷ rasio oversubscription pool), dibatasi jumlah pesanan.
Output: estimasi lot didapat, nilai efektif (Rp), % pemenuhan — selalu dengan **disclaimer** bahwa ini estimasi, bukan hasil resmi penjatahan.

## 8. Penanganan Error

- **Scraper e-IPO**: kegagalan koneksi/parsing → run dicatat `failed`/`partial` di `scrape_runs` dengan pesan; data lama tidak pernah dihapus karena scrape gagal. Field yang gagal di-parse dilewati (warning), field lain tetap di-upsert.
- **Yahoo Finance**: ticker belum tersedia → retry di run harian berikutnya; IPO tanpa data hari 1 ditampilkan "belum tersedia" dan **dikecualikan** dari agregat underwriter (bukan dihitung nol).
- **Frontend**: FastAPI tidak merespons → halaman error sopan; kalkulator mandiri tetap berfungsi (client-side murni).
- **Pemantauan**: `GET /api/health` memuat waktu scrape sukses terakhir per jenis job.

## 9. Pengujian

- **Kalkulator (Vitest, `frontend/lib/`)** — pengujian paling ketat di sini: tabel kasus per rentang harga & fraksi (termasuk tepat di batas Rp200/500/2.000/5.000), pembulatan ke fraksi, proyeksi berjenjang, kelima golongan penjatahan + ambang oversubscription, validasi input. Kasus acuan memakai angka IPO nyata yang hasilnya bisa dicocokkan.
- **Parser scraper (pytest)** — fixture HTML asli e-IPO disimpan di repo; perubahan struktur situs terdeteksi sebagai test gagal, bukan data korup.
- **API (pytest + TestClient)** — SQLite in-memory; kasus daftar/detail/filter/health/auth token admin.

## 10. Di Luar Lingkup (untuk saat ini)

- Data keuangan emiten dari prospektus (aset, laba, rasio).
- Akun user, watchlist, notifikasi.
- API publik untuk pihak ketiga dan aplikasi mobile (arsitektur FastAPI sudah menyiapkan jalannya, tapi tidak dibangun sekarang).
- Harga real-time / grafik harga berkelanjutan (hanya data hari pertama untuk track record underwriter).

## Referensi

- e-IPO: https://e-ipo.co.id (terverifikasi dapat diakses dengan User-Agent browser)
- Batas ARB 15% seragam sejak 8 April 2025: siaran pers BEI (idx.co.id), mediaperbankan.com
- Auto rejection hari pertama 2× reguler: juruscuan.com, bnisekuritas.co.id (verifikasi final: Peraturan BEI II-A)
- Penjatahan terpusat: SEOJK 25/SEOJK.04/2025 (17 November 2025) — 5 golongan, ritel ½ pooling, batas pesanan 10% (stockbit snips, hukumku.id; verifikasi final: lampiran SEOJK di ojk.go.id)
