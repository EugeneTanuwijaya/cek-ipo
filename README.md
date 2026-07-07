# Saham IPO

Aplikasi pelacak IPO Bursa Efek Indonesia (BEI): data emiten, harga penawaran,
kinerja hari pertama, statistik penjamin emisi (underwriter), serta kalkulator
estimasi penjatahan dan Auto Rejection (ARA/ARB). Backend FastAPI + SQLite
(scraping e-IPO BEI), frontend Next.js.

## Struktur repo

- `backend/` — FastAPI + SQLAlchemy + APScheduler (scraper harian e-IPO & harga).
- `frontend/` — Next.js 16 (App Router), fetch data dari backend saat render.
- `docker-compose.yml`, `Caddyfile`, `.env.example` — deploy produksi (VPS).

## Setup development

### Backend

Butuh Python 3.10+ (image Docker pakai 3.12).

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend berjalan di `http://localhost:8000`. Env yang dikenali (lihat
`app/config.py` dan `app/main.py`):

| Env | Default | Keterangan |
|---|---|---|
| `DB_PATH` | `data/ipo.db` | Lokasi file SQLite. |
| `ADMIN_TOKEN` | `change-me` | Bearer token untuk endpoint `/api/admin/scrape`. |
| `DISABLE_SCHEDULER` | (tidak diset) | Set ke `1` untuk mematikan APScheduler (dipakai di test). **Jangan diset di produksi** — scheduler yang menjalankan sinkronisasi harian. |

### Frontend

Butuh Node.js 20.9+ (image Docker pakai Node 22).

```bash
cd frontend
npm ci
npm run dev
```

Frontend berjalan di `http://localhost:3000`. Env `API_URL` (default
`http://localhost:8000`) menentukan alamat backend yang dipanggil — dibaca
saat runtime (setiap request server-side) maupun saat build (untuk prerender
statis halaman `/` dan `/underwriter`; jika backend tidak terjangkau saat
build, halaman tetap ter-build dengan fallback UI kosong).

## Menjalankan test

```bash
# backend
cd backend
pytest

# frontend
cd frontend
npm test
```

## Initial scrape (mengisi database pertama kali)

Backend hanya melakukan sinkronisasi terjadwal (06:00 & 18:00 WIB). Untuk
mengisi database secara manual dari awal (mis. setelah `init_db()` membuat
skema baru dan tabel masih kosong):

```bash
cd backend
python -m app.scraper.initial            # default: 30 halaman index e-IPO
python -m app.scraper.initial 5          # atau batasi jumlah halaman
```

## Trigger manual scrape (endpoint admin)

Endpoint `POST /api/admin/scrape` menjadwalkan sinkronisasi e-IPO + harga di
background (butuh bearer token `ADMIN_TOKEN`) dan langsung membalas `202`
tanpa menunggu selesai:

```bash
curl -i -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://domain-anda/api/admin/scrape
```

Cek status sinkronisasi terakhir lewat `GET /api/health` (field `last_scrapes`).

## Deploy ke VPS (Docker Compose + Caddy)

Prasyarat: Docker + Docker Compose v2 di VPS, domain (opsional untuk HTTPS
otomatis via Caddy/Let's Encrypt — tanpa domain, set `DOMAIN=http://localhost`
agar Caddy melayani HTTP polos di port 80).

```bash
cp .env.example .env
# isi ADMIN_TOKEN (nilai acak yang kuat) dan DOMAIN (mis. saham-ipo.example.com)
# untuk uji lokal tanpa TLS: DOMAIN=http://localhost

docker compose up --build -d
docker compose ps
```

Arsitektur: Caddy (port 80/443) me-reverse-proxy `/api/*` ke service
`backend:8000` dan sisanya ke `frontend:3000`. Data SQLite backend disimpan
di volume Docker `ipo-data` (mount ke `/data`) agar persist antar rebuild.
Scheduler (sinkronisasi harian 06:00 & 18:00 WIB) berjalan otomatis di
container backend — jangan set `DISABLE_SCHEDULER` di compose produksi.

Cek kesehatan setelah deploy:

```bash
curl http://localhost/api/health     # -> {"status":"ok", "last_scrapes": {...}}
curl -I http://localhost/            # -> 200 (beranda, boleh dalam kondisi data kosong)
```

Update ke versi baru:

```bash
git pull
docker compose up --build -d
```

Matikan (data tetap tersimpan di volume):

```bash
docker compose down
```

### Daftar environment variable (produksi)

| Env | Dipakai di | Keterangan |
|---|---|---|
| `ADMIN_TOKEN` | backend (`.env` → compose) | Wajib diisi nilai acak kuat sebelum deploy. |
| `DOMAIN` | Caddy (`.env` → compose) | Domain publik untuk TLS otomatis. `http://localhost` untuk uji lokal tanpa TLS (kosong = `localhost` dengan sertifikat internal + redirect HTTPS 308). |
| `DB_PATH` | backend (image) | Sudah di-set `/data/ipo.db` di `backend/Dockerfile`, cocok dengan volume `ipo-data:/data`. |
| `API_URL` | frontend (image) | Sudah di-set `http://backend:8000` di `frontend/Dockerfile` (nama service Docker Compose). |

## Catatan verifikasi aturan (BEI II-A & SEOJK 25/2025)

Aturan Auto Rejection (ARA/ARB, fraksi harga) dan Penjatahan Terpusat yang
dipakai kalkulator disimpan sebagai **konstanta konfigurasi**, bukan hardcode
tersebar, di dua tempat yang harus tetap sinkron:

- `frontend/lib/rules.ts`
- `backend/app/rules.py`

Sumber & status verifikasi terakhir (lihat commit `350588f` — "chore:
verifikasi aturan BEI II-A dan SEOJK 25/2025"):

- **Auto Rejection (BEI Peraturan II-A)** — pita ARA 35/25/20% per rentang
  harga dan fraksi harga (tick) dikonfirmasi dari teks primer PDF Kep-00055/BEI/03-2023
  dan tidak berubah oleh revisi Kep-00003/BEI/04-2025 (berlaku 8 Apr 2025).
  ARB 15% seragam untuk semua rentang berlaku sejak revisi 8 Apr 2025
  (sebelumnya mengikuti tier ARA), dikonfirmasi via siaran pers BEI dan
  liputan media pasca-8-Apr-2025, tidak ada perubahan lebih lanjut ditemukan
  sampai Juli 2026. Batas hari pertama IPO memakai persentase normal
  (multiplier 1x, bukan 2x seperti diklaim sejumlah sumber sekunder) —
  dikonfirmasi empiris dari data hari-1 Yahoo Finance untuk 7 IPO yang ARA
  hari pertama sepanjang 2025 (COIN 100→135 [+35%], EMAS 2880→3600 [+25%],
  RLCO 168→226, dll., semua terkunci persis di harga ARA 1x) — lihat
  komentar sitasi di `frontend/lib/rules.ts` untuk detail.
- **Penjatahan Terpusat (SEOJK 25/SEOJK.04/2025)** — seluruh angka golongan
  IPO, alokasi minimum, dan tabel penyesuaian oversubscription diverifikasi
  langsung dari salinan resmi PDF di ojk.go.id (menggantikan SEOJK
  15/SEOJK.04/2020).

Bila ada perubahan regulasi di kemudian hari, perbarui kedua file konstanta
di atas secara bersamaan dan catat sumber verifikasi baru di komentar kode.
