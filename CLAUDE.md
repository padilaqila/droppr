# AGENTS.md — Droppr

Ini adalah aturan main untuk agen AI (Claude Code, Cursor, Codex, atau agen lain) yang mengerjakan proyek Droppr. File ini dibaca di awal setiap sesi kerja.

Kalau kamu memakai Claude Code secara spesifik, salin/symlink file ini juga sebagai `CLAUDE.md` — isinya sama, `AGENTS.md` dipakai karena sudah jadi standar lintas-tool (Codex, Cursor, dll juga membacanya).

> Aturan penulisan file ini sendiri: setiap baris di sini harus lolos tes "kalau baris ini dihapus, apakah agen jadi salah ambil keputusan?". Kalau tidak, jangan ditambahkan. Jangan tempel konten panjang di sini — rujuk ke file lain.

---

## 1. Konteks Proyek (jangan diduplikasi, baca file aslinya)

- **Apa ini:** Droppr — workspace personal untuk airdrop hunter, sync ke Supabase. Detail lengkap: `docs/PRD.md`.
- **Identitas visual & komponen UI:** `docs/DESIGN.md` — token warna/tipografi/komponen WAJIB diambil dari sini, jangan improvisasi warna/radius baru di tengah coding.
- **Stack:** Next.js (App Router, TypeScript) · Supabase (Auth, Postgres, RLS, Edge Functions untuk cron reminder) · wagmi/viem untuk wallet connect · Tailwind dengan CSS variable dari `docs/DESIGN.md`.
- Kalau ada instruksi baru dari user yang bertentangan dengan `PRD.md`/`DESIGN.md`, **tanyakan dulu** apakah itu perubahan scope resmi atau cuma eksperimen sesaat — jangan langsung timpa dokumen sumber.

## 2. Struktur Proyek

```
droppr/
├── AGENTS.md                 # file ini
├── CLAUDE.md                 # symlink/copy dari AGENTS.md (untuk Claude Code)
├── MEMORY.md                 # catatan kesalahan & pembelajaran (agen yang tulis, lihat §5)
├── MEMORY_ARCHIVE.md         # entri MEMORY.md lama yang sudah dipangkas
├── docs/
│   ├── PRD.md
│   └── DESIGN.md
├── app/                       # Next.js App Router
│   ├── (marketing)/           # landing page publik
│   └── (app)/                 # dashboard setelah login
│       ├── dashboard/
│       ├── projects/[id]/
│       ├── tasks/
│       ├── wallets/
│       └── settings/
├── components/
│   ├── ui/                    # komponen dasar (button, badge, card) — 1:1 dengan DESIGN.md
│   └── features/              # komponen spesifik (task-item, kanban-card, wallet-chip)
├── lib/
│   ├── supabase/               # client, query helpers, tipe hasil generate dari schema
│   └── wallet/                 # wagmi config, koneksi wallet
├── supabase/
│   ├── migrations/
│   └── functions/               # edge function untuk reminder cron
└── styles/
    └── tokens.css               # CSS variables hasil terjemahan dari DESIGN.md
```

Aturan: fitur baru masuk ke folder yang sudah ada sesuai polanya. Kalau ragu taruh di mana, cek dulu ada file serupa atau tidak sebelum bikin folder/pola baru.

## 3. Gaya Bahasa & Komunikasi

- **Ke user:** Bahasa Indonesia, langsung, tidak bertele-tele. Jangan mulai jawaban dengan basa-basi ("Baik, saya akan...") — langsung ke inti atau langsung kerjakan.
- **Di dalam kode:** komentar, nama variabel/fungsi, commit message → **Bahasa Inggris** (standar industri, memudahkan kalau nanti ada kontributor lain / dipublikasikan).
- Komentar kode hanya untuk hal yang **tidak jelas dari kodenya sendiri** (kenapa, bukan apa). Jangan komentari hal yang sudah jelas dari nama fungsi.
- Commit message format: `type: deskripsi singkat` (`feat`, `fix`, `refactor`, `docs`, `chore`) — konsisten sepanjang proyek.

## 4. Kemampuan Berpikir Kritis (wajib, bukan opsional)

Sebelum eksekusi task, agen HARUS:

1. **Cek dulu, jangan reka ulang.** Cari komponen/fungsi/pola yang mirip di codebase sebelum menulis yang baru. Duplikasi logic adalah kesalahan paling sering dilakukan agen AI.
2. **Verifikasi asumsi kalau taruhannya besar.** Kalau task menyentuh skema database, auth, atau alur uang/klaim reward — konfirmasi pemahaman ke user dulu sebelum eksekusi, jangan asumsikan lalu jalan.
3. **Push back kalau ada konflik.** Kalau instruksi user bertentangan dengan aturan keamanan di §6 atau scope di `PRD.md`, katakan secara eksplisit kenapa, jangan diam-diam menuruti atau diam-diam mengabaikan.
4. **Ambiguitas kecil → putuskan sendiri dengan alasan.** Tidak semua hal perlu ditanyakan; kalau dampaknya kecil dan reversibel, ambil keputusan yang paling konsisten dengan `DESIGN.md`/`PRD.md`, sebutkan asumsinya, lanjut kerja.
5. **Definition of Done** sebelum bilang "selesai": lint & type-check lolos, komponen baru memakai token dari `DESIGN.md` (bukan warna/radius hardcode baru), tidak ada secret/API key ter-commit, dan perubahan skema data sudah dicek ulang terhadap §6.

## 5. Mengingat Kesalahan — `MEMORY.md`

Agen tidak punya ingatan antar sesi kecuali ditulis ke file. Maka:

- **Di akhir sesi kerja** (atau begitu menemukan bug yang berasal dari kesalahan asumsi/pendekatan sebelumnya), tulis entri baru ke `MEMORY.md` dengan format:

```
## [YYYY-MM-DD] Judul singkat kesalahan
- Apa yang salah:
- Kenapa terjadi (root cause, bukan cuma gejala):
- Perbaikan yang dilakukan:
- Aturan ke depan (1 kalimat, actionable):
```

- **Di awal sesi kerja berikutnya**, baca `MEMORY.md` dulu sebelum mulai — terutama bagian "Aturan ke depan" — sebelum menyentuh area kode yang pernah bermasalah.
- **Jaga agar tetap ramping.** Kalau `MEMORY.md` sudah lebih dari ~200 baris, pindahkan entri yang paling lama ke `MEMORY_ARCHIVE.md`, sisakan yang masih relevan. File memory yang membengkak sama buruknya dengan tidak ada memory sama sekali — jadi kebisingan yang tidak dibaca.
- Isi MEMORY.md itu **pengalaman spesifik proyek ini** (bug yang pernah kejadian, pola yang ternyata salah, keputusan yang dibalik). Aturan umum yang berlaku selamanya taruh di AGENTS.md ini, bukan di MEMORY.md.

## 6. Aturan Keamanan — Tidak Bisa Dinegosiasikan

- **Tidak pernah** menyimpan private key, seed phrase, atau password (exchange/social media) di database, kode, log, maupun `MEMORY.md`. Field "akun" di project detail hanya untuk username/email non-sensitif.
- **Tidak pernah** commit file `.env`/kredensial ke git. Selalu cek `.gitignore` sebelum menambah file baru yang berisi config.
- Wallet connect bersifat **read-only** di MVP — tidak ada signing transaksi atas nama user tanpa aksi eksplisit dari user di UI.
- Semua tabel Supabase pakai **RLS berbasis `user_id`** — tidak ada tabel baru yang exposed tanpa RLS, tanpa kecuali, tanpa terkecuali "sementara buat testing".
- Kalau menemukan pelanggaran salah satu di atas dari kode yang sudah ada (bukan yang baru ditulis) — **berhenti, laporkan ke user, jangan diam-diam diperbaiki lalu di-commit tanpa sepengetahuan user** kalau perbaikannya menyentuh data production.

## 7. Memperbaiki AGENTS.md Sendiri

Agen **boleh** mengusulkan perubahan ke file ini kalau menemukan aturan yang sudah tidak sesuai kenyataan proyek (misal: struktur folder berubah, stack berubah). Tapi **tidak boleh menimpa file ini secara diam-diam** — alasannya: ini "konstitusi" proyek, kalau agen bisa mengubahnya sendiri tanpa jejak, aturan jadi tidak bisa dipercaya lagi oleh sesi berikutnya atau oleh manusia.

Prosedurnya:
1. Tulis usulan di bagian **"Usulan Perubahan"** di bawah ini (bukan langsung edit bagian atas), dengan format: tanggal, baris/section yang dianggap keliru, alasan, usulan penggantinya.
2. Lanjutkan kerjaan seperti biasa mengikuti aturan yang ada saat ini.
3. User yang review dan pindahkan usulan ke bagian utama kalau disetujui, lalu hapus dari daftar usulan.

### Usulan Perubahan
*(kosong — isi di sini kalau ada usulan, jangan edit section di atas secara langsung)*

## 8. Referensi

| File | Isi |
|---|---|
| `docs/PRD.md` | Kebutuhan produk, alur kerja, sitemap halaman |
| `docs/DESIGN.md` | Token warna/tipografi, spesifikasi komponen UI |
| `MEMORY.md` | Kesalahan & pembelajaran spesifik proyek ini (agen yang tulis) |
| `MEMORY_ARCHIVE.md` | Entri `MEMORY.md` lama yang sudah dipangkas |
