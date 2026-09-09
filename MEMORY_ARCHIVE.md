# MEMORY_ARCHIVE.md — Arsip Pembelajaran Lama Droppr

## [2026-09-08] Navigasi antar tab berat akibat remote auth di middleware pada request RSC
- Apa yang salah: Berpindah halaman atau tab (seperti klik notifikasi/reminders) terasa sangat berat, dan muncul 404/500 MODULE_NOT_FOUND akibat cache Webpack dev bentrok dengan sisa `next build`.
- Kenapa terjadi (root cause, bukan cuma gejala): Setiap kali berpindah tab di Next.js App Router (RSC request), `middleware.ts` memanggil `await supabase.auth.getUser()`, memaksa browser menunggu roundtrip HTTP remote ke Supabase cloud sebelum merender tab baru. Selain itu, menjalankan `next dev` langsung setelah `next build` tanpa membersihkan direktori `.next` menyebabkan hash chunk lama di-request oleh browser dan menghasilkan 404.
- Perbaikan yang dilakukan: Menambahkan bypass di `middleware.ts` untuk request ber-header `rsc: 1` jika cookie auth sudah ada (cukup divalidasi lokal tanpa remote HTTP call tambahan), mengatur `refetchOnWindowFocus: false` pada TanStack Query provider, serta membersihkan total direktori cache `.next` sebelum memulai server dev baru.
- Aturan ke depan: Jangan jalankan remote auth call di middleware pada request `rsc: 1` ketika auth cookie valid; dan selalu hapus folder `.next` jika beralih antara `next build` dan `next dev`.

## [2026-09-08] Regresi background putih pada landing page akibat inline theme script global
- Apa yang salah: Landing page (`/`) tampil dengan latar belakang putih/terang padahal `docs/DESIGN.md` menetapkan landing page dan dark mode sebagai default (`#14181F`).
- Kenapa terjadi (root cause, bukan cuma gejala): Script sinkron inline di `<head>` pada root `app/layout.tsx` membaca `localStorage.getItem('droppr-theme')` tanpa memfilter rute URL. Jika user sebelumnya pernah memilih tema terang di `/dashboard`, script ini langsung menambahkan class `.light` ke `<html>`, yang menyebabkan CSS tokens `--color-bg-base` di seluruh halaman tertimpa menjadi `#F5F3EF`.
- Perbaikan yang dilakukan: Memperbarui inline script di `app/layout.tsx` untuk mengecualikan rute landing page (`/`) dan auth gateway (`/login`, `/auth`), membuat `app/(marketing)/layout.tsx` dan `theme-sync.tsx` yang secara deterministik me-remove class `.light`, serta mengisolasi scoped CSS variables `.marketing-root` di `styles/tokens.css` agar selalu terkunci pada token dark `#14181F`.
- Aturan ke depan: Halaman publik/showcase yang memiliki spesifikasi desain gelap eksklusif WAJIB diisolasi dari injeksi class tema global di root layout dan memiliki scoped CSS variables independen.

## [2026-09-08] Browser autofill merusak kontras gelap form auth dan tombol intip password terhalang z-index/autofill
- Apa yang salah: Saat browser (Chrome/Edge/Brave) melakukan autofill email/password di halaman login, background input berubah menjadi putih/biru terang (`#e8f0fe`) sehingga icon form (`Mail` & `Lock`) yang berwarna putih transparan menjadi tidak terlihat, serta tombol intip kata sandi (`Eye`/`EyeOff`) tidak muncul atau terhalang.
- Kenapa terjadi (root cause, bukan cuma gejala): (1) Chromium secara default menginjeksi pseudo-class `input:-webkit-autofill` dengan background terang dan teks gelap jika tidak dioverride dengan `-webkit-box-shadow inset`. (2) Tombol intip password sebelumnya tidak memiliki `z-index` yang cukup (`z-20`), sehingga terhalang layer autofill browser dan native Edge password reveal (`::-ms-reveal`). (3) Halaman register belum mengimplementasikan state `showPassword` dan `showConfirmPassword`.
- Perbaikan yang dilakukan: Menambahkan override global `input:-webkit-autofill` di `styles/globals.css` dengan `-webkit-box-shadow: 0 0 0 1000px #0f1420 inset !important` dan teks `#F4F6F8`, menonaktifkan native reveal Chromium/Edge (`input::-ms-reveal, input::-ms-clear { display: none !important; }`), menaikkan kontras warna icon (`text-text-secondary` dengan alignment presisi `top-1/2 -translate-y-1/2` dan `z-10`), serta memasang tombol intip password interaktif (`z-20`, tooltip, hit area nyaman) pada login dan kedua field password register.
- Aturan ke depan: Setiap form autentikasi gelap WAJIB memiliki CSS override `:-webkit-autofill` dan `::-ms-reveal`, icon input harus memiliki `z-10`, dan tombol aksi di dalam input wajib memiliki `z-20` dengan alignment `top-1/2 -translate-y-1/2`.

## [2026-09-08] FOUC (Flash of Unstyled Content) saat reload di Mode Terang
- Apa yang salah: Saat menggunakan mode terang, setiap reload halaman muncul flash layar gelap selama beberapa saat sebelum warna terang diterapkan.
- Kenapa terjadi (root cause, bukan cuma gejala): Class `.light` sebelumnya disematkan ke `<html>` melalui `useEffect` di komponen React yang baru berjalan setelah hidrasi selesai, sedangkan HTML default yang di-render server adalah mode gelap.
- Perbaikan yang dilakukan: Menambahkan script inline sinkron di `<head>` pada `app/layout.tsx` yang langsung membaca `localStorage.getItem('droppr-theme')` dan menyematkan class `light` ke `documentElement` sebelum paint pertama.
- Aturan ke depan: State tema tampilan (dark/light) yang tersimpan di localStorage WAJIB diaplikasikan via synchronous inline script di `<head>` layout untuk mencegah FOUC.

## [2026-09-08] 500 Internal Server Error di dev mode akibat stale crashed node process
- Apa yang salah: Navigasi ke `/dashboard` (dan rute `(app)` lainnya) memunculkan teks "Internal Server Error" (HTTP 500).
- Kenapa terjadi (root cause, bukan cuma gejala): Setelah runtime error Webpack sebelumnya (`undefined.call`), proses `next dev` yang berjalan di background mengalami memory leak (konsumsi RAM melonjak hingga 5.2 GB) dan compiler cache-nya berada di state korup permanen. Next.js mengembalikan 500 generik ke browser tanpa me-recover modul yang rusak.
- Perbaikan yang dilakukan: Mematikan proses node lama yang macet/leak, menambahkan graceful error boundary try-catch pada `middleware.ts`, dan menyalakan kembali server `next dev` bersih di port 3000.
- Aturan ke depan: Jika Next.js dev server menghasilkan 500 generik setelah runtime build error selesai diperbaiki, cek penggunaan memori proses node dan restart proses dev server dari nol.

## [2026-09-08] Next.js Link prefetch membanjiri middleware auth dan membekukan navigasi
- Apa yang salah: Perpindahan antar tab/halaman via sidebar terasa sangat berat dan lambat (menunggu 5-8 detik).
- Kenapa terjadi (root cause, bukan cuma gejala): Next.js App Router secara default melakukan prefetching otomatis untuk semua komponen `<Link>` yang ada di viewport. Setiap prefetch mengeksekusi `middleware.ts` yang memanggil `await supabase.auth.getUser()`. Panggilan HTTP jarak jauh paralel ke server Supabase cloud memenuhi batas koneksi browser (head-of-line blocking), sehingga navigasi yang diklik user mengantri lama di belakang request prefetch.
- Perbaikan yang dilakukan: Menambahkan bypass di `lib/supabase/middleware.ts` untuk request prefetch jika auth cookie sudah ada, serta menambahkan `prefetch={false}` pada link sidebar di `components/features/sidebar.tsx`.
- Aturan ke depan: Jangan biarkan middleware melakukan remote HTTP auth validation pada header `next-router-prefetch` / `purpose: prefetch`, dan matikan prefetching pada navigasi utama sidebar jika tidak krusial.

## [2026-09-08] Stale state pada Client Component setelah router.refresh()
- Apa yang salah: Setelah menambah project, folder, wallet, atau task baru melalui modal, data baru tidak langsung muncul di UI dan user harus me-refresh browser secara manual.
- Kenapa terjadi (root cause, bukan cuma gejala): Client component menginisialisasi `useState(initialData)` sekali saja saat mount. Ketika modal memanggil `router.refresh()`, Server Component berhasil mengambil data baru dari Supabase dan meneruskannya sebagai prop baru, namun `useState` di client mengabaikan perubahan prop tersebut.
- Perbaikan yang dilakukan: Menambahkan `useEffect` untuk menyinkronkan state lokal setiap kali prop dari Server Component berubah (`useEffect(() => setProjects(initialProjects), [initialProjects])`).
- Aturan ke depan: Komponen Client yang meng-cache server prop ke dalam `useState` WAJIB menyertakan `useEffect` sinkronisasi agar reaktif terhadap `router.refresh()`.

## [2026-09-08] TypeError: Cannot read properties of undefined (reading 'call') akibat import wagmi/connectors
- Apa yang salah: Terjadi runtime error Webpack `Cannot read properties of undefined (reading 'call')` saat membuka halaman yang memuat komponen wallet.
- Kenapa terjadi (root cause, bukan cuma gejala): Komponen client mengimpor `injected` langsung dari `"wagmi/connectors"`. Mengimpor dari barrel `"wagmi/connectors"` menarik seluruh modul konektor lain (termasuk Coinbase SDK dan WalletConnect) yang dependensinya di-stub `false` di `next.config.mjs`, sehingga Webpack gagal mengeksekusi factory module yang `undefined`.
- Perbaikan yang dilakukan: Hapus import langsung dari `"wagmi/connectors"` pada semua komponen UI (`wallet-connect-button.tsx`, `wallets-client-view.tsx`, `attach-wallet-modal.tsx`). Ambil konektor yang sudah dikonfigurasi melalui hook `const { connectors } = useConnect()` dengan `connectors.find(c => c.type === "injected")`.
- Aturan ke depan: JANGAN pernah mengimpor dari `"wagmi/connectors"` di komponen UI client; konfigurasi konektor hanya di `lib/wallet/config.ts` dan konsumsi via `useConnect().connectors`.

## [2026-09-08] Turbopack dev mode di Windows crash dengan ENOENT tmp build manifest
- Apa yang salah: Server `next dev --turbo` tiba-tiba berhenti dan menghasilkan error `ENOENT: no such file or directory` pada file temporer `_buildManifest.js.tmp...` dan `app-build-manifest.json`.
- Kenapa terjadi (root cause, bukan cuma gejala): Turbopack di Windows mengalami race condition penulisan file temporer dan tidak mengeksekusi kustomisasi `webpack: (config) => ...` yang ada di `next.config.mjs`, memicu kegagalan build runtime berkepanjangan.
- Perbaikan yang dilakukan: Mengubah script `"dev": "next dev --turbo"` menjadi `"dev": "next dev"` standar di `package.json`, mematikan proses port 3000 yang tertinggal, membersihkan `.next`, dan menyalakan kembali server.
- Aturan ke depan: Di environment Windows dengan custom Webpack fallback, gunakan `next dev` standar tanpa flag `--turbo` demi stabilitas build manifest.

## [2026-09-08] CSS Tailwind gagal ter-bundle akibat @import relatif di globals.css
- Apa yang salah: Halaman browser muncul putih polos tanpa styling Tailwind (layout.css menghasilkan 404).
- Kenapa terjadi (root cause, bukan cuma gejala): `styles/globals.css` memuat baris `@import "./tokens.css";` yang tidak didukung oleh PostCSS tanpa plugin tambahan, sehingga kompilasi CSS Tailwind terhenti.
- Perbaikan yang dilakukan: Menghapus `@import` relatif dari `globals.css` dan mengimpor `tokens.css` serta `globals.css` secara langsung di `app/layout.tsx`, lalu membersihkan cache `.next`.
- Aturan ke depan: Hindari `@import` lokal di dalam file CSS Tailwind Next.js; selalu impor file CSS terpisah langsung di level RootLayout.

## [2026-09-08] Utang teknis penulisan manual lib/supabase/database.types.ts
- Apa yang salah: File `lib/supabase/database.types.ts` dibuat dengan penulisan manual, berisiko mengalami schema drift dari skema database aktual.
- Kenapa terjadi (root cause, bukan cuma gejala): Instance Supabase belum terhubung dan Docker tidak tersedia di environment ini untuk menjalankan `supabase gen types`.
- Perbaikan yang dilakukan: Menulis tipe TypeScript secara manual memetakan 1:1 seluruh tabel, kolom, enum, dan RLS references dari migrasi `20260908101500_initial_schema.sql`.
- Aturan ke depan: Begitu project Supabase asli terhubung atau instance aktif, WAJIB jalankan `npx supabase gen types typescript` untuk meregenerate `database.types.ts` agar tipe selalu sinkron otomatis dengan database.

## [2026-09-08] Webpack resolver error pada optional dependencies Wagmi/Coinbase
- Apa yang salah: Next.js build gagal karena Webpack mencari module `@x402/*` dan `@react-native-async-storage/async-storage` yang merupakan peer dependency opsional dari connector Wagmi/Coinbase/MetaMask.
- Kenapa terjadi (root cause, bukan cuma gejala): Import dari `wagmi/connectors` menarik barrel export yang memuat seluruh provider eksternal.
- Perbaikan yang dilakukan: Mengonfigurasi `resolve.fallback` di `next.config.mjs` dengan nilai `false` untuk dependensi opsional tersebut.
- Aturan ke depan: Saat menambah connector web3 atau upgrade wagmi/@wagmi/connectors, selalu verifikasi `next build` dan cek apakah fallback webpack di `next.config.mjs` masih perlu atau sudah tidak relevan.

## [2026-09-08] Mismatch nama kolom pada tabel Supabase project_updates menyebabkan thread selalu kosong
- Apa yang salah: Setiap kali menambahkan update (baik manual maupun via AI), data tidak pernah muncul di linimasa thread dan status tetap "Thread masih kosong".
- Kenapa terjadi (root cause, bukan cuma gejala): Skrip SQL migrasi yang dieksekusi di Supabase membuat kolom `content` (text) dan `is_completed` (boolean), sedangkan kode JavaScript di `lib/supabase/thread-updates.ts` mencoba melakukan query insert dengan kolom `title`, `status`, `completed_at`, dan `source_date` yang tidak ada di tabel Postgres (error 42703). Akibatnya insert selalu gagal, sementara query select berhasil (mengembalikan array kosong `[]`) sehingga UI selalu menganggap thread kosong.
- Perbaikan yang dilakukan: Menyesuaikan seluruh fungsi CRUD (`fetchProjectThreads`, `createProjectThread`, `bulkCreateProjectThreads`, `toggleThreadTaskStatus`) di `lib/supabase/thread-updates.ts` agar 100% memetakan kolom aktual database (`content`, `is_completed`, `source_platform`, `created_at`, `source_url`).
- Aturan ke depan: Selalu verifikasi nama dan tipe kolom aktual database Supabase via query schema sebelum menulis logic insert/select pada service helper baru.

## [2026-09-08] Missing prefetch={false} pada sidebar dan rute /feed & /waitlist di middleware membekukan navigasi dev
- Apa yang salah: Navigasi antar halaman terasa sangat lelet (menunggu hingga 57 detik), browser membeku saat membuka tab lain, dan memori Node.js melonjak hingga 2.9 GB.
- Kenapa terjadi (root cause, bukan cuma gejala): (1) Komponen `Link` navigasi sidebar untuk seluruh menu tidak menyertakan `prefetch={false}`. Setiap kali halaman dimuat, Next.js App Router memicu prefetch paralel untuk seluruh 8 halaman sekaligus. (2) Rute `/feed` dan `/waitlist` belum didaftarkan di `isAppRoute` pada `lib/supabase/middleware.ts`.
- Perbaikan yang dilakukan: Menambahkan `prefetch={false}` pada seluruh link di `sidebar.tsx` dan `topbar.tsx`, menambahkan `/feed` dan `/waitlist` ke `isAppRoute`, menambahkan deteksi `accept: text/x-component` di bypass client navigation middleware.
- Aturan ke depan: Setiap penambahan item menu baru pada navigasi utama (Sidebar/Topbar) WAJIB menyertakan `prefetch={false}` dan rutenya wajib didaftarkan pada `isAppRoute` di `lib/supabase/middleware.ts`.

## [2026-09-08] PostgreSQL JSON 22P02 unicode low surrogate error menggagalkan sinkronisasi feed Telegram
- Apa yang salah: Saat sinkronisasi feed Telegram dijalankan, data tidak muncul di antarmuka dan database (`airdrop_feeds` dan `waitlists` tetap kosong).
- Kenapa terjadi (root cause, bukan cuma gejala): Teks postingan dari channel Telegram memuat emoji majemuk yang terpotong saat diparsing atau diproses, menghasilkan unpaired surrogate code units (seperti `\udd25`). PostgreSQL menolak insert dengan error code `22P02`.
- Perbaikan yang dilakukan: Membuat helper `sanitizeSurrogates()` di `app/api/feed/sync/route.ts` dan `app/api/waitlist/sync/route.ts` untuk membersihkan unpaired surrogate code units dan null bytes sebelum data di-upsert ke Supabase.
- Aturan ke depan: Selalu sanitasi string yang bersumber dari platform eksternal (Telegram/Twitter) dengan sanitizer Unicode surrogate sebelum disimpan ke kolom PostgreSQL `JSONB`.