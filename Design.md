# Design Style Guide — tokengratis.id

> Diambil dari `app/globals.css` pada repo `raymondchins/tokengratis-id`.

## Filosofi

Gaya desain: **paper / editorial / neutral**, terinspirasi dari **getaiperks.com**. Nuansa kertas hangat, tipografi editorial (serif untuk heading), dan warna netral hitam-putih dengan dua aksen warna untuk kategori tertentu.

## Palet Warna

| Token | Hex | Peran |
|---|---|---|
| `--color-ink` | `#f1f0e8` | Background halaman (warm paper) |
| `--color-ink-soft` | `#ffffff` | Card, input, permukaan konten |
| `--color-ink-line` | `#e4e2d8` | Border, divider |
| `--color-fog` | `#11181c` | Teks utama (cool near-black) |
| `--color-mute` | `#5f6a70` | Teks sekunder (cool gray) |
| `--color-ember` | `#2c3e2d` | Aksen utama → tombol (forest green gelap) |
| `--color-ember-soft` | `#3d5c3f` | Hover state tombol |

### Aksen kategori

| Token | Hex | Peran |
|---|---|---|
| `--color-grass` | `#0e793c` | Hijau — teks/ikon untuk "free tier / positif / bisa diakses" |
| `--color-grass-bg` | `#e8faf0` | Background badge hijau |
| `--color-grass-line` | `#a2e9c1` | Border badge hijau |
| `--color-grass-solid` | `#00a63e` | Hijau solid (mis. dot indikator) |
| `--color-grape` | `#7c3aed` | Ungu — teks untuk kategori "partner / sekunder" |
| `--color-grape-bg` | `#f4f3fb` | Background badge ungu |
| `--color-grape-line` | `#d8cef2` | Border badge ungu |

> Catatan: warna oranye `#dc4f1c` pernah dipakai sebagai aksen, saat ini **di-pause** tapi gampang dikembalikan lewat `globals.css`.

## Tipografi

- **Heading (`h1`–`h4`):** Georgia serif (fallback: "Times New Roman", Times, serif), weight 600, letter-spacing rapat `-0.02em` — kesan editorial/koran.
- **Body:** Inter (sans-serif), antialiased.

```css
--font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
--font-serif: Georgia, "Times New Roman", Times, serif;
```

## Interaksi & Motion

- **Selection text:** background `--color-ember` (forest green gelap), teks putih.
- **Transisi halaman:** crossfade 200ms (`ease`) pakai View Transitions API saat navigasi antar halaman.
- **Aksesibilitas:** animasi dimatikan total jika `prefers-reduced-motion: reduce`.

```css
::view-transition-old(root) { animation: 200ms ease both fade-out; }
::view-transition-new(root) { animation: 200ms ease both fade-in; }
```

## Ringkasan "vibe"

- Terang, bersih, sedikit hangat (bukan putih pucat — pakai off-white paper).
- Kontras tinggi teks vs background, tombol solid hijau tua `#2c3e2d` (bukan warna cerah) → kesan tegas/minimal, sedikit organik.
- Serif di heading memberi nuansa "editorial/majalah", bukan techy/startup generik.
- Dua aksen warna (hijau & ungu) dipakai sangat selektif — hanya untuk badge/status, bukan elemen dominan.
- Skema warna: `color-scheme: light` — situs ini tidak punya dark mode.
