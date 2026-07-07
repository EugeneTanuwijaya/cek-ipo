# Belajar Deploy: cek-ipo ke VPS

Dokumen ini menjelaskan **langkah demi langkah** apa yang dilakukan saat men-deploy
project `cek-ipo` ke VPS, **kenapa** tiap langkah perlu, **bagaimana** cara kerjanya,
dan **hal-hal penting** yang sebaiknya kamu tahu. Ditulis supaya kamu bisa
mengulanginya sendiri lain kali tanpa bingung.

> Konteks: VPS Tencent (Ubuntu), IP publik `43.157.247.45`. Aplikasi terdiri dari
> backend FastAPI (Python) + frontend Next.js + reverse proxy Caddy, dijalankan
> dengan Docker Compose.

---

## Peta besar: apa itu "deploy" di sini?

Deploy = menjalankan aplikasimu di server yang menyala 24 jam supaya bisa diakses
orang lewat internet. Bedanya dengan `npm run dev` di laptop:

- Server harus **tetap jalan** walau kamu tutup terminal / laptop mati.
- Harus bisa **hidup lagi otomatis** kalau server reboot atau aplikasi crash.
- Harus bisa diakses lewat **port 80** (HTTP standar) pakai IP/domain, bukan
  `localhost:3000`.

Project ini sudah disiapkan pakai **Docker Compose**, jadi tugas utama kita adalah:
pasang Docker → siapkan konfigurasi → nyalakan → isi data → verifikasi.

---

## Langkah 0 — Cek kondisi awal server (jangan asal pasang)

Sebelum mengubah apa pun, saya cek dulu keadaan server. Prinsip penting:
**lihat dulu sebelum bertindak**, supaya tidak menimpa sesuatu yang sudah jalan.

```bash
docker --version          # -> "command not found" = Docker belum ada
systemctl is-active docker
ss -tlnp | grep ':80 '    # siapa yang sedang pakai port 80?
```

Hasilnya: Docker belum terpasang, **tapi port 80 sudah dipakai proses `caddy`**
milik sistem (bukan punya project). Ini temuan penting — kalau saya langsung
menyalakan Compose, Caddy milik project akan gagal karena port 80 sudah dipakai.

**Pelajaran:** Dua program tidak bisa mendengarkan (listen) di port yang sama.
Selalu cek "port bentrok" sebelum deploy.

---

## Langkah 1 — Pasang Docker & Docker Compose

**Kenapa Docker?** Aplikasi ini butuh Python, Node.js, dan Caddy dengan versi
tertentu. Tanpa Docker kamu harus pasang & atur semuanya manual di server (rawan
"di laptopku jalan, di server error"). Docker membungkus tiap bagian aplikasi ke
dalam **container** — kotak terisolasi berisi semua yang dibutuhkan. `docker-compose.yml`
adalah resep yang mendeskripsikan container apa saja dan bagaimana mereka terhubung.

Cara pasang (script resmi Docker):

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

Lalu supaya bisa menjalankan `docker` tanpa `sudo` setiap kali:

```bash
sudo usermod -aG docker $USER
# efek baru terasa setelah logout-login (atau pakai `sudo docker` dulu)
```

**Verifikasi:**

```bash
docker --version          # Docker version 29.x
docker compose version    # v2 (perhatikan: "docker compose", bukan "docker-compose")
```

**Penting — "compose v2":** perintah modern adalah `docker compose` (dua kata,
subcommand), bukan `docker-compose` (satu kata, versi lama). Project ini butuh v2.

---

## Langkah 2 — Selesaikan konflik port 80 (Caddy sistem vs Caddy project)

Ingat temuan di Langkah 0: ada Caddy sistem yang menempel di port 80 (cuma
menyajikan halaman default bawaan, tidak kita butuhkan). Saya matikan supaya
Caddy milik project bisa memakai port 80/443.

```bash
sudo systemctl disable --now caddy
# disable = jangan nyala lagi saat reboot;  --now = matikan sekarang juga
```

**Kenapa tidak dihapus saja?** `disable` lebih aman daripada uninstall: reversible,
dan kita hanya perlu port-nya bebas. Caddy yang benar-benar melayani aplikasi kita
adalah yang dijalankan oleh Compose (lihat `docker-compose.yml` service `caddy`).

**Pelajaran:** kalau nanti port 80 tampak "sudah dipakai" lagi, curigai apakah
Caddy sistem hidup lagi. Container Compose-lah yang seharusnya memegang port 80.

---

## Langkah 3 — Siapkan konfigurasi rahasia (`.env`)

Project punya `.env.example` sebagai contoh. File `.env` yang asli **tidak ikut
di Git** (lihat `.gitignore`) karena berisi rahasia. Isinya:

```bash
ADMIN_TOKEN=<nilai acak panjang>   # token untuk endpoint admin (trigger scrape manual)
DOMAIN=:80                         # domain publik untuk Caddy
```

Cara membuat token acak yang kuat (jangan pakai "admin123"):

```bash
openssl rand -hex 32               # menghasilkan 64 karakter hex acak
```

Tentang `DOMAIN`:
- Kalau punya domain (mis. `saham-ipo.example.com`), isi itu → Caddy otomatis
  mengurus **HTTPS gratis** via Let's Encrypt.
- Karena kita belum punya domain, saya set `DOMAIN=:80` → Caddy melayani **HTTP
  polos di port 80**, cocok untuk diakses lewat IP (`http://43.157.247.45`).

Amankan file-nya:

```bash
chmod 600 .env    # hanya pemilik yang boleh baca/tulis
```

**Penting soal rahasia:**
- Jangan pernah commit `.env` ke Git / GitHub.
- `ADMIN_TOKEN` = kunci untuk memicu scraping. Bocor = orang bisa membebani
  server-mu. Simpan baik-baik.

---

## Langkah 4 — Nyalakan semua container

```bash
cd /home/ubuntu/cek-ipo
docker compose up --build -d
```

Arti tiap bagian:
- `up` — buat & jalankan semua service di `docker-compose.yml`.
- `--build` — build dulu image dari kode sumber (backend & frontend punya
  `Dockerfile` masing-masing) sebelum menjalankan.
- `-d` — *detached*, jalan di latar belakang (terminal bisa ditutup).

Yang terjadi (baca `docker-compose.yml` untuk paham arsitekturnya):

```
Internet :80/:443
      │
   [caddy]  ── reverse proxy
      ├── /api/*  → [backend]:8000   (FastAPI, Python)
      └── selain itu → [frontend]:3000 (Next.js)
                         [backend] menyimpan data ke volume "ipo-data" (SQLite)
```

**Konsep penting — reverse proxy:** pengunjung hanya bicara ke Caddy di port 80.
Caddy yang meneruskan: request diawali `/api/` dikirim ke backend, sisanya ke
frontend. Backend & frontend sendiri **tidak** membuka port ke internet — mereka
hanya bisa dihubungi dari dalam jaringan Docker. Ini lebih aman.

**Konsep penting — volume:** container bersifat "sekali pakai" — kalau dihapus,
isinya hilang. Supaya database SQLite tidak ikut hilang saat rebuild, ia disimpan
di **volume** bernama `ipo-data` (di luar container). Data pun awet antar-update.

Cek status:

```bash
docker compose ps                 # semua harus "Up"
curl http://localhost/api/health  # -> {"status":"ok", ...}
curl -I http://localhost/         # -> HTTP 200
```

---

## Langkah 5 — Isi database pertama kali (initial scrape)

Aplikasi baru = database kosong. Data IPO diambil dengan *scraping* dari situs
BEI e-IPO. Scheduler bawaan hanya sinkron ringan tiap hari; untuk mengisi arsip
penuh dari nol, jalankan sekali:

```bash
docker compose exec backend python -m app.scraper.initial
```

`exec` = jalankan perintah **di dalam** container backend yang sedang hidup.
Datanya ditulis ke volume `ipo-data`, bukan ke folder di host.

### Di sinilah muncul masalah nyata — dan cara mendiagnosisnya

Scrape pertama **gagal**: semua halaman dijawab `403 Forbidden`. Ini bagian
paling berharga untuk dipelajari, karena begini cara membedah masalah:

1. **Baca error-nya, jangan panik.** `403` = server menolak kita. Bukan bug kode
   kita, tapi situs target menolak.

2. **Uji hipotesis satu per satu.** Apakah karena IP VPS diblokir?
   - Coba dengan User-Agent browser → tetap 403.
   - Coba dari IP rumah (lewat perangkat lain via jaringan pribadi) → tetap 403.
   - Kesimpulan: **bukan** soal IP.

3. **Lihat petunjuk di header respons.** Header menunjukkan `server: cloudflare`
   dan cookie `__cf_bm`. Artinya situs dilindungi **Cloudflare bot protection**.

4. **Pahami akar masalahnya.** Cloudflare mengenali "ini bukan browser sungguhan"
   bukan cuma dari User-Agent, tapi dari **sidik jari TLS** (cara program memulai
   koneksi terenkripsi — dikenal sebagai JA3/fingerprint). Library Python biasa
   (`requests`) punya sidik jari yang khas "robot", jadi langsung ditolak.

**Pelajaran besar:** kalau scraping tiba-tiba kena 403, sering kali bukan soal
IP atau User-Agent, tapi **sidik jari TLS**. Situs modern mendeteksi ini.

---

## Langkah 6 — Perbaiki: ganti client HTTP ke `curl_cffi`

Solusinya: pakai library yang bisa **meniru sidik jari TLS browser asli**, yaitu
`curl_cffi` dengan mode `impersonate="chrome"`. Dari sudut Cloudflare, koneksinya
tampak seperti Chrome betulan.

Uji dulu di container sekali-pakai sebelum menyentuh kode (biar yakin berhasil):

```bash
docker run --rm python:3.12-slim sh -c \
  'pip install -q curl_cffi && python -c "
from curl_cffi import requests
r = requests.Session(impersonate=\"chrome\").get(
    \"https://e-ipo.co.id/id/ipo/index?page=1\", timeout=30)
print(r.status_code)"'          # -> 200  🎉
```

Berhasil (200). Baru setelah itu ubah kode, minimal & terpusat:

- `backend/app/scraper/http.py` — ganti `import requests` → `from curl_cffi import
  requests`, dan `requests.Session()` → `requests.Session(impersonate="chrome")`.
- `backend/requirements.txt` — tambah baris `curl_cffi`.
- `backend/app/scraper/prices.py` **tidak** diubah — targetnya Yahoo Finance yang
  tidak diproteksi Cloudflare, jadi `requests` biasa masih cukup. **Jangan ubah
  yang tidak perlu.**

Build ulang **hanya** service yang berubah, lalu jalankan lagi:

```bash
docker compose up -d --build backend
docker compose exec backend python -m app.scraper.initial
```

Hasil: **0 error 403**, 250 IPO + 66 underwriter masuk ke database.

**Pelajaran alur kerja:**
- Uji perbaikan di lingkungan terisolasi (`docker run --rm`) sebelum mengubah kode.
- Ubah sekecil mungkin; jangan sentuh bagian yang sudah jalan.
- Build ulang cukup service yang terdampak (lebih cepat).

---

## Langkah 7 — Jebakan halus: halaman depan tetap "belum tersedia"

Setelah data masuk, API sudah mengembalikan data, tapi **beranda masih kosong**
("belum tersedia"). Kenapa?

Next.js mem-*prerender* (membuat versi statis) halaman `/` **saat build image**,
dan menyimpannya (cache ISR) selama 1 jam. Waktu image frontend pertama di-build,
database masih kosong → yang tersimpan versi kosong.

Lebih halus lagi: saat `docker compose build`, proses build **tidak tersambung**
ke jaringan Compose, jadi ia tak bisa menghubungi `backend` → prerender kosong
lagi walau database sudah terisi.

**Perbaikannya:** build image frontend sambil menempelkannya ke jaringan Compose,
supaya langkah prerender bisa menjangkau backend dan mengambil data asli:

```bash
# BuildKit menolak nama network kustom; pakai builder legacy:
sudo DOCKER_BUILDKIT=0 docker build --network cek-ipo_default -t cek-ipo-frontend ./frontend
docker compose up -d --no-build frontend
```

Setelah itu beranda menampilkan data asli.

**Pelajaran:** "prerender / static generation / ISR" berarti halaman dibuat **saat
build**, bukan saat diakses. Kalau data berubah setelah build, halaman statis bisa
tertinggal sampai cache-nya kedaluwarsa. Ini karakter Next.js yang perlu diingat.

---

## Langkah 8 — Verifikasi menyeluruh

Jangan anggap selesai sampai benar-benar dicek:

```bash
docker compose ps                          # semua "Up"
curl -I http://localhost/                  # 200
curl -I http://localhost/underwriter       # 200
curl -I http://localhost/kalkulator        # 200
curl -s http://localhost/api/ipos | head   # ada data
```

Pastikan juga aplikasi **selamat dari reboot**:

```bash
docker inspect cek-ipo-backend-1 --format '{{.HostConfig.RestartPolicy.Name}}'
# -> "unless-stopped": container nyala lagi otomatis setelah reboot/crash
systemctl is-enabled docker    # -> "enabled": Docker sendiri nyala saat boot
```

`restart: unless-stopped` (di `docker-compose.yml`) + Docker yang `enabled` saat
boot = aplikasi bangkit sendiri setelah server restart. Ini wajib untuk produksi.

---

## Langkah 9 — Simpan perubahan ke GitHub (commit & push via SSH)

Perbaikan `curl_cffi` di Langkah 6 tadinya baru ada **di server ini saja**. Kalau
server hilang, perbaikan ikut hilang. Maka simpan permanen ke GitHub.

### 9a. Commit dulu (menyimpan snapshot di dalam repo lokal)

```bash
cd /home/ubuntu/cek-ipo
git status                 # lihat file apa yang berubah
git add backend/app/scraper/http.py backend/requirements.txt belajar.md
git commit -m "fix(scraper): pakai curl_cffi agar lolos Cloudflare"
```

Catatan: `.env` **tidak** ikut ter-commit karena ada di `.gitignore` — memang
sengaja, jangan pernah commit rahasia.

> Praktik yang dipakai di sini: perubahan ditaruh di **branch** terpisah
> (`git checkout -b fix/cloudflare-scraper-curl-cffi`) dulu, bukan langsung ke
> `master`. Tujuannya supaya bisa di-review lewat Pull Request sebelum masuk ke
> cabang utama. Untuk repo pribadi, commit langsung ke `master` juga boleh.

### 9b. Otentikasi ke GitHub — kenapa perlu SSH key

`git push` mengirim commit ke GitHub, tapi GitHub perlu yakin **kamu memang kamu**.
GitHub sudah lama tidak menerima login password biasa untuk Git. Dua cara umum:

- **SSH key** (dipakai di sini) — sepasang kunci: *private key* rahasia yang tetap
  di server, dan *public key* yang kamu daftarkan ke GitHub. Saat push, server
  membuktikan identitas pakai private key tanpa mengirim rahasia apa pun. Sekali
  set, tidak perlu ketik apa-apa lagi.
- **Personal Access Token (PAT)** — token rahasia berbentuk teks yang dipakai
  sebagai ganti password lewat HTTPS. Lebih ringkas tapi tokennya rahasia dan
  harus dijaga.

**Analogi:** SSH key seperti sidik jari — GitHub menyimpan "foto sidik jarimu"
(public key); saat masuk, kamu menempelkan jari asli (private key). Sidik jari
aslinya tidak pernah berpindah tangan.

### 9c. Cara mendaftarkan SSH key ke GitHub

1. Lihat **public** key di server (yang berakhiran `.pub`, aman untuk dibagikan):
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # contoh output: ssh-ed25519 AAAAC3Nza...IYyImQ nama-key
   ```
   > Kalau belum punya key sama sekali, buat dengan:
   > `ssh-keygen -t ed25519 -C "email@kamu.com"` (tekan Enter mengikuti default).
   > **Jangan pernah** menampilkan/membagikan file tanpa `.pub` (itu private key).

2. Buka **https://github.com/settings/ssh/new**, isi **Title** bebas, tempel
   isi public key tadi, klik **Add SSH key**.

3. Arahkan remote repo ke alamat SSH (bukan HTTPS):
   ```bash
   git remote set-url origin git@github.com:USERNAME/NAMA-REPO.git
   ```
   Beda formatnya:
   - HTTPS: `https://github.com/USER/REPO.git` → minta username+token saat push
   - SSH:   `git@github.com:USER/REPO.git`     → pakai key, tanpa ketik apa-apa

4. Pertama kali konek, server belum kenal "sidik jari" GitHub. Tambahkan supaya
   tidak muncul peringatan "Host key verification failed":
   ```bash
   ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts
   ```

5. Tes otentikasinya:
   ```bash
   ssh -T git@github.com
   # sukses -> "Hi USERNAME! You've successfully authenticated, ..."
   ```

### 9d. Push

```bash
git push -u origin fix/cloudflare-scraper-curl-cffi
# -u = set upstream, jadi lain kali cukup `git push` saja
```

Kalau pakai branch, GitHub akan memberi link untuk membuat **Pull Request**.
Buka link itu → **Create pull request** → **Merge** untuk menggabungkan ke `master`.

**Pelajaran penting:**
- **Public key** boleh disebar (didaftarkan ke GitHub, ditaruh di server).
  **Private key** (file tanpa `.pub`) rahasia mutlak — jangan pernah dikirim ke
  mana pun.
- Satu key yang sama bisa dipakai untuk beberapa keperluan (di sini key-nya juga
  dipakai untuk tunnel lain). Mendaftarkannya ke GitHub memberi server itu hak
  push ke repo-mu — wajar untuk deploy, tapi sadari implikasinya.
- `.env` dan rahasia lain tidak ikut ke GitHub karena `.gitignore`. Selalu cek
  `git status` sebelum commit untuk memastikan tidak ada rahasia yang ikut.

---

## Hal-hal penting yang HARUS kamu tahu

1. **Security Group / Firewall itu terpisah dari server.** Membuka port 80 di
   dalam VPS tidak cukup — panel cloud (Tencent) punya *Security Group* sendiri
   yang bisa memblokir dari luar. Kalau aplikasi jalan tapi tak bisa dibuka dari
   browser, cek dulu Security Group di console cloud, izinkan port 80 (dan 443).

2. **Rahasia jangan masuk Git.** `.env` (berisi `ADMIN_TOKEN`) sudah di
   `.gitignore`. Jangan pernah commit. Kalau token bocor, ganti dan restart.

3. **Data ada di volume, bukan di container.** Menghapus/rebuild container aman
   untuk data selama volume `ipo-data` tidak dihapus. Hati-hati dengan
   `docker volume rm` — itu menghapus data permanen.
   (README juga memperingatkan soal "stale volume" dari versi lama — baca bila
   nanti data harga hari-1 terlihat aneh.)

4. **Perbedaan `--build` vs tidak.** `docker compose up -d` menjalankan image yang
   sudah ada; tambahkan `--build` kalau kode berubah dan perlu image baru.

5. **Perintah untuk operasi sehari-hari:**
   ```bash
   docker compose ps                    # status
   docker compose logs -f backend       # lihat log realtime (Ctrl-C untuk keluar)
   docker compose restart backend       # restart satu service
   docker compose down                  # matikan semua (data di volume tetap aman)
   docker compose up --build -d          # nyalakan lagi / setelah update kode
   ```

6. **Alur update ke versi baru:**
   ```bash
   cd /home/ubuntu/cek-ipo
   git pull
   docker compose up --build -d
   ```
   Ingat jebakan Langkah 7: beranda mungkin perlu waktu (cache 1 jam) atau
   di-build dengan `--network` agar langsung tampil data segar.

7. **Perbaikan `curl_cffi` sudah di-commit & push ke GitHub** (lihat Langkah 9),
   di branch `fix/cloudflare-scraper-curl-cffi`. Langkah terakhir: buka Pull
   Request-nya lalu **Merge ke `master`** supaya alur update biasa (`git pull`)
   membawanya ke deploy. Selama belum di-merge, ia belum ada di `master`.

8. **Scraping situs orang punya etika & risiko.** `curl_cffi` "menyamar" sebagai
   browser. Beri jeda antar-request (kode sudah melakukannya), jangan berlebihan,
   dan sadari situs bisa memperketat proteksi kapan saja sehingga perlu penyesuaian
   lagi di kemudian hari. Perhatikan juga ketentuan layanan situs target.

---

## Ringkasan satu layar (contekan cepat)

```bash
# 0. cek kondisi
docker --version; ss -tlnp | grep ':80 '

# 1. pasang docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# 2. bebaskan port 80 (kalau ada caddy/nginx sistem)
sudo systemctl disable --now caddy

# 3. konfigurasi rahasia
cd /home/ubuntu/cek-ipo
cp .env.example .env
# isi ADMIN_TOKEN=$(openssl rand -hex 32) dan DOMAIN=:80

# 4. nyalakan
docker compose up --build -d
docker compose ps
curl http://localhost/api/health

# 5. isi data awal
docker compose exec backend python -m app.scraper.initial

# 6. verifikasi
curl -I http://localhost/
```

Selamat belajar! Kalau ada langkah yang masih bikin bingung, tandai bagiannya —
tiap perintah di atas bisa dibedah lebih dalam.
