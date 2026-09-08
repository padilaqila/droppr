# PRD — Droppr
**Personal Airdrop Workspace & Task Tracker**

Versi: 1.0 (Draft) · Tanggal: 8 September 2026

---

## 1. Latar Belakang & Masalah

Airdrop hunter biasanya mengikuti puluhan proyek sekaligus, dengan informasi tersebar di:
- Grup Telegram/Discord berbeda per proyek
- Thread X (Twitter) yang panjang dan tidak terstruktur
- Notion/spreadsheet manual yang cepat berantakan
- Ingatan sendiri soal wallet mana dipakai untuk proyek mana

**Akibatnya:** task terlewat, deadline snapshot kelewat, tidak jelas progress tiap proyek sampai mana, dan sulit tahu proyek mana yang paling dekat ke fase klaim.

**Riset kompetitor** (Notion template seperti "Web3 Airdrop Tracker OS", "Airdrop Farming Log", dan platform discovery seperti Airdrops.io/DappRadar) menunjukkan pola yang berulang:
- Kebutuhan intinya bukan "menemukan airdrop baru" (itu domain platform discovery), tapi **mengelola airdrop yang SUDAH diikuti**.
- Struktur data yang selalu muncul: Project → Task → Wallet, saling terhubung.
- Reminder di template Notion mayoritas manual (klik tombol reset harian) — ini keluhan umum dan jadi celah UX yang bisa Droppr menangkan dengan reminder otomatis.

**Posisi Droppr:** bukan discovery tool, tapi **command center personal** untuk airdrop yang sudah diikuti user.

---

## 2. Tujuan Produk

**Goals:**
- Satu tempat terpusat untuk seluruh task, dokumentasi, dan status tiap proyek airdrop.
- Reminder otomatis (harian/mingguan/custom) supaya tidak ada task/snapshot terlewat.
- Progress tiap proyek transparan dari "baru gabung" sampai "klaim reward".
- Data aman tersinkron di cloud (Supabase) — bisa diakses dari device manapun.

**Non-goals (di luar scope):**
- Bukan discovery platform (tidak menampilkan daftar airdrop baru/rekomendasi dari luar).
- Bukan password manager — tidak menyimpan seed phrase/private key/password.
- Bukan tool auto-farming/auto-transaksi (tidak menjalankan transaksi atas nama user).
- Auto-verifikasi on-chain penuh per-protokol → **Phase 2**, bukan MVP.

---

## 3. Target Pengguna

**Persona: "Rian, Airdrop Farmer Aktif"**
- Mengikuti 15–40 proyek airdrop paralel (testnet, Galxe/Zealy quest, DeFi retroactive).
- Pakai 3–5 wallet berbeda untuk multi-akun/anti-sybil.
- Cek progress tiap hari, sering lupa task mana yang sudah dikerjakan hari ini.
- Teknis cukup melek (paham wallet connect, tapi bukan developer).

---

## 4. Alur Kerja Utama (User Flow)

### 4.1 Flow: Onboarding & Setup Awal
```
Daftar/Login (Supabase Auth)
   → Connect wallet pertama (opsional, bisa dilewati)
   → Buat folder/kategori pertama (mis. "Testnet", "DeFi", "L2")
   → Tambah project pertama
   → Selesai → masuk Dashboard
```

### 4.2 Flow: Menambahkan Project Baru
```
Dashboard → "+ Tambah Project"
   → Isi: nama project, folder, chain/network, link sosial (X, Discord, Telegram, website)
   → Isi panduan kerja (step-by-step guide, bisa paste dari grup)
   → Hubungkan wallet yang dipakai (pilih dari wallet tersimpan / connect baru)
   → Set status awal: "Belum Mulai"
   → Tambah task-task turunan (manual atau dari template)
   → Simpan → Project masuk ke folder terkait
```

### 4.3 Flow: Rutinitas Harian (core loop — paling sering dipakai)
```
Buka Droppr / notifikasi reminder masuk
   → Dashboard: lihat "Task Hari Ini" (agregat dari semua project)
   → Klik task → tandai selesai / tunda / lewati
   → Jika task perlu interaksi wallet → tombol "Buka Explorer" untuk cek wallet terkait
   → Update status project jika ada progress signifikan
   → Task recurring otomatis muncul lagi besok (bukan manual reset)
```

### 4.4 Flow: Reminder & Notifikasi
```
User set jadwal reminder (harian/mingguan/custom/tanggal snapshot)
   → Sistem (cron via Supabase Edge Function) cek H-1 / H-0
   → Kirim ke channel yang aktif: in-app + email + push browser
   → User klik notifikasi → langsung ke task/project terkait
```

### 4.5 Flow: Menuju Klaim
```
Status project berubah manual: Belum Mulai → Sedang Dikerjakan → Menunggu TGE/Snapshot → Siap Klaim → Klaim Selesai
   → Saat "Siap Klaim": reminder khusus muncul (prioritas tinggi)
   → User catat hasil klaim (jumlah token, tanggal, nilai estimasi) → arsip otomatis ke "Selesai"
```

**Catatan penting:** transisi status project **manual** (user yang klik), bukan otomatis dari on-chain — karena "siap klaim" itu keputusan bisnis proyek, bukan sesuatu yang bisa dideteksi generik dari wallet.

---

## 5. Struktur Halaman (Sitemap)

```
1. Auth (Login/Register/Reset Password)
2. Dashboard (home)
3. Folders/Projects
   3a. Folder List
   3b. Project List (dalam folder)
   3c. Project Detail
4. Tasks (agregat semua project)
5. Wallets & Accounts
6. Reminders/Notification Center
7. Settings
```

### 5.1 Dashboard
**Tujuan:** ringkasan cepat begitu login — jawab "apa yang harus saya kerjakan hari ini?"

Komponen:
- **Task Hari Ini** — list task due today dari semua project, checkbox langsung di sini
- **Overdue** — task lewat deadline, ditandai merah, di-highlight paling atas
- **Ringkasan status project** — kartu jumlah project per status (mis. 5 Sedang Dikerjakan, 2 Siap Klaim, 12 Menunggu TGE)
- **Kalender mini** — snapshot/TGE dalam 7 hari ke depan
- **Quick add** — tombol tambah task cepat tanpa masuk ke project detail

### 5.2 Folder List
- Grid/list folder (mis. "Testnet L2", "Galxe Quest", "Modal Besar")
- Tiap folder card: jumlah project di dalamnya, progress bar agregat
- Bisa drag-drop project antar folder (nice-to-have, bukan MVP wajib)
- Tombol buat folder baru, rename, hapus (dengan konfirmasi jika ada project di dalamnya)

### 5.3 Project List (dalam folder)
- Tabel/kanban toggle:
  - **Table view**: nama, status, chain, deadline terdekat, wallet terhubung
  - **Kanban view**: kolom per status (Belum Mulai / Dikerjakan / Menunggu / Siap Klaim / Selesai)
- Filter: chain, status, folder, ada deadline dekat atau tidak
- Sort: deadline terdekat, terakhir diupdate, nama

### 5.4 Project Detail — halaman paling kompleks
Tab/section di dalam satu halaman:

| Section | Isi |
|---|---|
| **Header** | Nama project, logo (upload/URL), status (dropdown), folder, chain/network |
| **Info Sosial** | Link X, Discord, Telegram, Website, Docs — semua clickable |
| **Panduan Kerja** | Rich text editor (mirip Notion) — bisa embed gambar/link, step-by-step |
| **Task List** | Task khusus project ini, dengan tipe: one-time / daily / weekly / custom recurring |
| **Wallet Terhubung** | Wallet address yang dipakai (bisa lebih dari satu), tombol lihat di explorer |
| **Akun Terkait** | Username/email yang dipakai daftar (⚠️ bukan password) |
| **Catatan/Log** | Free text log — histori progress, catatan pribadi |
| **Riwayat Klaim** | Kalau sudah klaim: jumlah token, tanggal, nilai estimasi saat itu |

### 5.5 Tasks (halaman agregat)
- Semua task lintas project dalam satu tempat, grup by: Hari Ini / Minggu Ini / Overdue / Semua
- Filter by project/folder
- Bulk action: tandai selesai beberapa sekaligus, reschedule
- Task recurring ditandai icon khusus (🔁) beda dari one-time

### 5.6 Wallets & Accounts
- Daftar wallet tersimpan (alamat publik + label, mis. "Wallet Utama", "Wallet Sybil #3")
- Tombol "Connect Wallet" (WalletConnect/wagmi) untuk tambah wallet baru
- Tiap wallet: lihat project mana saja yang pakai wallet ini (cross-reference)
- Info on-chain dasar (read-only, via API publik): saldo native token, jumlah tx, chain aktif
- **Peringatan keamanan permanen di halaman ini:** "Droppr tidak pernah meminta/menyimpan private key atau seed phrase"

### 5.7 Reminders / Notification Center
- List semua reminder terjadwal, per project
- Buat reminder baru: pilih project → pilih task → pilih frekuensi (sekali/harian/mingguan/tanggal spesifik) → pilih channel (in-app/email/push)
- History notifikasi terkirim (biar user bisa cek notif yang terlewat)
- Setting default channel per jenis reminder (mis. reminder "Siap Klaim" selalu email + push, reminder harian cukup in-app)

### 5.8 Settings
- Profil & keamanan akun (ubah password, 2FA jika ada)
- Preferensi notifikasi (channel default, jam pengiriman)
- Kelola wallet terhubung (disconnect)
- Export data (JSON/CSV) — penting untuk trust, user harus bisa keluarkan datanya kapan saja
- Hapus akun

---

## 6. Model Data (garis besar skema Supabase)

```
users (dari Supabase Auth)

folders
 - id, user_id, name, created_at

projects
 - id, user_id, folder_id, name, chain, status, logo_url,
   social_links (jsonb), guide_content (text/rich), created_at, updated_at

tasks
 - id, project_id, title, type (one_time/daily/weekly/custom),
   due_date, recurrence_rule, status (pending/done/skipped), completed_at

wallets
 - id, user_id, address, chain, label, created_at

project_wallets (many-to-many)
 - project_id, wallet_id

accounts (akun non-sensitif per project)
 - id, project_id, label, username/email, notes

reminders
 - id, task_id / project_id, frequency, channel (array), next_trigger_at

claims
 - id, project_id, token_amount, token_symbol, claim_date, estimated_value

notification_log
 - id, user_id, reminder_id, channel, sent_at, status
```

**Catatan keamanan:** tabel `accounts` **tidak boleh** punya kolom password/seed phrase secara desain — cegah dari level skema, bukan cuma UI.

### Catatan Tambahan Implementasi Skema SQL (Migration 20260908101500)
Untuk memenuhi integritas data, audit trail, performa RLS, dan cascading rule:
- **Timestamp Audit:** Kolom `updated_at` ditambahkan pada `folders`, `wallets`, `accounts`, `reminders`, dan `claims`. Kolom `created_at` serta `updated_at` ditambahkan pada `tasks`. Seluruh tabel dengan `updated_at` dilengkapi trigger otomatis `BEFORE UPDATE`.
- **Status Proyek:** Kolom `projects.status` diimplementasikan menggunakan enum Postgres `project_status` ('not_started', 'in_progress', 'waiting', 'ready_to_claim', 'completed') yang 1:1 sesuai dengan 5 status lifecycle pada PRD §4.5 dan DESIGN.md.
- **Relasi Folder-Project:** Kolom `projects.folder_id` menggunakan constraint `ON DELETE SET NULL`, sehingga penghapusan folder tidak menghapus project di dalamnya.
- **Tabel Reminders:** Kolom `user_id` ditambahkan secara eksplisit pada tabel `reminders` untuk mempermudah eksekusi cron Edge Function per pengguna dan menyederhanakan isolasi RLS. Diberikan constraint `CHECK (project_id IS NOT NULL OR task_id IS NOT NULL)`.
- **Tabel Tasks:** `recurrence_rule` disimpan bertipe `TEXT` untuk menampung ekspresi string standar iCalendar (RRULE) atau pola kustom.
- **Tabel Project Wallets:** Composite primary key didefinisikan pada `(project_id, wallet_id)` dengan tambahan kolom `created_at`.

---

## 7. Kebutuhan Teknis Kunci

| Kebutuhan | Pendekatan |
|---|---|
| Auth & DB | Supabase (Auth + Postgres + RLS per user_id) |
| Wallet connect | wagmi/viem + WalletConnect — untuk simpan alamat & baca data on-chain publik, **bukan** signing transaksi atas nama user |
| Reminder terjadwal | Supabase Edge Function + pg_cron, cek `next_trigger_at` tiap interval |
| Email | Resend/SendGrid via Edge Function |
| Push browser | Web Push API + service worker (⚠️ hanya reliable di desktop; di mobile browser, push butuh PWA installed — perlu di-komunikasikan ke user, jangan janjikan "pasti masuk" di semua device) |
| Rich text guide | Editor seperti Tiptap/Editor.js, simpan sebagai JSON/HTML di kolom `guide_content` |

---

## 8. MVP vs Phase 2

**MVP (harus ada):**
- Auth, Folder, Project CRUD, Task CRUD (termasuk recurring)
- Dashboard task hari ini + overdue
- Reminder in-app + email
- Wallet connect untuk simpan alamat (read-only info on-chain dasar)
- Field akun non-sensitif

**Phase 2:**
- Push notification browser
- Auto-verifikasi task per-protokol (integrasi Galxe/Zealy API, dsb.)
- Kanban drag-drop
- Export/import data
- Statistik ROI (biaya gas vs estimasi reward)

---

## 9. Risiko & Hal yang Perlu Diputuskan Lagi

1. **Auto-tracking wallet** — sudah dijelaskan di atas: MVP hanya baca data publik dasar, bukan verifikasi task otomatis per protokol. Perlu disepakati ulang kalau ekspektasinya lebih dari itu.
2. **Push notification mobile** — keterbatasan teknis nyata, bukan bug. Perlu keputusan: apakah butuh PWA di fase awal atau cukup desktop dulu?
3. **Data sensitif di field "akun"** — perlu aturan tegas di level produk (dan mungkin validasi UI) agar user tidak coba-coba paste password/seed phrase di sana.
4. **Recurring task logic** — perlu didefinisikan lebih detail: kalau task harian dilewati (tidak dicentang), apakah otomatis jadi "missed" dan hilang, atau tetap muncul di overdue sampai dicentang? Ini pengaruh ke UX inti (core loop harian).

---

## 10. Metrik Keberhasilan (usulan)

- Retensi harian (user buka Droppr tiap hari — ini produk yang harus jadi kebiasaan)
- % task yang diselesaikan tepat waktu vs overdue
- Jumlah project aktif rata-rata per user
- Jumlah project yang sampai status "Klaim Selesai" (bukti produk membantu sampai akhir, bukan cuma pencatatan awal)
