# MEMORY.md — Catatan Kesalahan & Pembelajaran Proyek Droppr

> File ini ditulis oleh agen AI, bukan oleh manusia. Dibaca otomatis di awal sesi (bagian atas file diprioritaskan). Lihat `AGENTS.md` §5 untuk format entri dan aturan pemangkasan.

## [2026-09-08] Layout Shell Hardcoded ml-64 dan Ketiadaan Mobile Drawer Navigasi
- Apa yang salah: Tampilan aplikasi rusak dan konten terpotong pada layar mobile karena sidebar fixed `w-64` menutupi layar dan area konten utama didorong margin kiri tetap `ml-64` (256px), serta topbar mengalami tabrakan elemen.
- Kenapa terjadi (root cause, bukan cuma gejala): Layout utama `app/(app)/layout.tsx` menggunakan class desktop statis tanpa breakpoint responsif (`ml-64` alih-alih `ml-0 md:ml-64`), komponen Sidebar tidak memiliki drawer state, backdrop overlay, atau tombol tutup mobile, serta Topbar tidak menyediakan tombol toggle hamburger.
- Perbaikan yang dilakukan: Membuat komponen `AppShell` (`components/features/app-shell.tsx`) yang mengontrol pembukaan drawer mobile dengan gesture esc/route change/backdrop click, mengubah Sidebar menjadi slide-over drawer di mobile dengan animasi transisi dan tombol close X, menambahkan tombol hamburger dan mini brand logo di Topbar, memadatkan tombol aksi (Tambah, Wallet, Filter pills), serta mengoptimalkan padding konten halaman dan touch targets checklist.
- Aturan ke depan: Semua shell layout dan navigasi wajib memiliki breakpoint mobile-first (`ml-0 md:ml-...`), sediakan mobile slide-over drawer dengan backdrop untuk navigasi sidebar, dan pastikan container filter selalu memiliki `overflow-x-auto max-w-full`.

## [2026-09-08] Preferensi Desain Resmi User: Signature Aesthetic Landing Page
- Apa yang disukai: User sangat menyukai gaya visual landing page Droppr (Stitch/Awwwards style) dan menginstruksikan agar gaya ini dijadikan standar identitas visual utama untuk halaman publik & otentikasi (Landing, Login, Register).
- Karakteristik desain yang disukai:
  1. Kanvas gelap pekat Midnight Obsidian (`#07090E` / `bg-bg-base`).
  2. Background dot matrix interaktif (`HeroDotGrid`) yang merespons kursor mouse pada 60 FPS dengan spotlight radial pendaran amber (`#F0A93B`) & violet (`#8B7FE8`).
  3. Gelombang neon aurora ribbon (`AuroraWave`) yang melengkung mulus dari kiri bawah ke kanan atas tanpa garis batas yang terpotong.
  4. Komponen card frosted glass transparan: `bg-[#0f1420]/50 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6),inset_0_1px_1px_0_rgba(255,255,255,0.2),0_0_35px_-5px_rgba(139,127,232,0.25)]` dengan rounded corners modern (`rounded-2xl`).
  5. Form input semi-transparan `bg-white/[0.04]` dengan `border-white/15` dan fokus ring amber.
  6. Tipografi Plus Jakarta Sans modern dengan tracking ketat dan aksen badge mono fungsional.
- Aturan ke depan: Untuk setiap penambahan atau pembaruan UI pada halaman publik, auth, atau marketing, selalu gunakan signature aesthetic landing page ini secara konsisten.

## [2026-09-08] SVG default overflow:hidden memotong pendaran blur gradient dan HTML entities Telegram tidak terdecode
- Apa yang salah: Gradient violet di pojok kiri bawah landing page terpotong garis horizontal tajam, dan teks airdrop yang disinkronkan dari Telegram memunculkan string raw HTML entity seperti `&#036;` (bukan `$`).
- Kenapa terjadi (root cause, bukan cuma gejala): Elemen `<svg>` secara spesifikasi W3C memiliki property bawaan `overflow: hidden`. Komponen pita cahaya aurora membungkus filter feGaussianBlur di dalam SVG fixed height, sehingga setiap blur stroke yang meluber ke bawah terpotong rata. Selain itu, scraper Telegram web mengembalikan teks mentah berformat HTML entity yang belum dikonversi ke karakter standar.
- Perbaikan yang dilakukan: Mengatur container SVG aurora wave menjadi `inset-0 w-full h-full` dengan class `overflow-visible`, menambahkan ambient bleed glow di pojok bawah untuk memastikan transisi warna mulus tanpa garis potong, serta menambahkan regex decoder entity HTML (`&#036;`, `&amp;`, `&quot;`, dll.) pada modul scraper Telegram `app/api/feed/live/route.ts`.
- Aturan ke depan: Pastikan elemen SVG yang menggunakan efek gaussian blur diberi class `overflow-visible` atau padding/bleed yang cukup agar tidak terpotong garis batas canvas, dan selalu decode HTML entities pada teks hasil web scrape Telegram.

## [2026-09-08] Missing parser tautan manual pada konversi feed dan waitlist ke proyek airdrop
- Apa yang salah: Saat tombol manual "Buat Proyek" ditekan dari kartu Feed atau Waitlist, field `social_links` hanya menyimpan link Telegram sumber tanpa mem-parse link DApp, Website, Faucet, Docs, X/Twitter, Discord, dan Referral link yang ada di teks. Akibatnya tombol aksi cepat di workstation proyek ("Buka DApp", "Faucet", dll.) tidak muncul.
- Kenapa terjadi (root cause, bukan cuma gejala): Logika awal `convertFeedToProject` dan `convertWaitlistToProject` mengandalkan AI untuk ekstraksi link mendalam dan hanya mengisi fallback minimal (`telegram`) pada mode manual, padahal teks Telegram memuat tautan penting yang bisa diekstrak 100% secara deterministik dengan regex dan klasifikasi URL tanpa biaya token AI ($0).
- Perbaikan yang dilakukan: Membuat modul utility parser mandiri `lib/supabase/airdrop-parser.ts` yang mengklasifikasikan link (Website, DApp, Faucet, Docs, X, Telegram, Discord, Ref Link, Form, Explorer, Extension), membersihkan nama proyek, mendeteksi 25+ blockchain network, memisahkan tugas harian vs one-time secara rapi, serta menyaring baris label link agar tidak masuk ke daftar checklist. Menghubungkan parser ini ke tombol konversi manual Feed, Waitlist, transfer tugas, dan modal tambah proyek.
- Aturan ke depan: Semua konversi teks ke entitas proyek wajib melewati modul parser deterministik `airdrop-parser.ts` terlebih dahulu sehingga semua tombol resource bar aktif tanpa tergantung AI.

## [2026-09-08] Teks bertumpuk 3 baris di kartu waitlist akibat penumpukan aksi dan teks sekunder
- Apa yang salah: Footer kartu Waitlist yang sudah bergabung menampilkan teks yang terpotong dan ter-wrap menjadi 3 baris rapat yang tidak terbaca pada container kartu grid (~300px).
- Kenapa terjadi (root cause, bukan cuma gejala): Terlalu banyak item aksi yang diletakkan dalam satu baris flex horizontal tunggal (`Opsi AI • Pindah Tugas` di kiri, serta `Batal Join • Hapus` di kanan), sehingga saat lebar kolom mengecil, browser terpaksa memecah teks menjadi 3 baris yang saling bertumpuk. Ditambah keberadaan tombol opsi AI yang memakan ruang dan jarang dipakai.
- Perbaikan yang dilakukan: Menghapus opsi AI dari kartu, membagi footer menjadi 2 baris terstruktur rapi: Baris 1 berupa grid 2 tombol aksi utama (`Update TG` & `Buat Proyek`), dan Baris 2 berupa flex satu baris lega yang memuat `Pindah Tugas` di kiri serta `Batal Join • Hapus` di kanan.
- Aturan ke depan: Pada kartu grid dengan lebar dinamis/sempit (<320px), jangan menumpuk lebih dari 2 aksi teks di sisi kanan/kiri flex; pisahkan aksi tombol primer ke baris tersendiri dan jaga baris utilitas tetap maksimal 2-3 teks pendek.

## [2026-09-08] Redundansi icon SVG dengan emoji unicode dan pemaksaan action AI boros token
- Apa yang salah: Komponen tombol memunculkan icon Lucide SVG sekaligus emoji unicode secara ganda (misal `<Sparkles /> ✨ Buat Proyek`), serta tombol konversi AI dijadikan aksi utama default yang memboroskan kuota token pengguna.
- Kenapa terjadi (root cause, bukan cuma gejala): Terjadi inkonsistensi penulisan label teks tombol saat menambahkan fitur AI, di mana emoji hiasan dimasukkan ke dalam teks string padahal icon SVG Lucide sudah dirender, serta tidak memisahkan tombol konversi manual ($0 token) sebagai aksi default.
- Perbaikan yang dilakukan: Menghapus seluruh emoji ganda dari label tombol dan modal, menetapkan tombol manual ("Buat Proyek") sebagai aksi utama default yang instan dan hemat token, serta menempatkan AI ("Gunakan AI" / "Ekstrak via AI") sebagai opsi tambahan opsional on-demand.
- Aturan ke depan: JANGAN pernah menggabungkan icon Lucide dengan emoji unicode pada label tombol/heading, dan selalu jadikan aksi manual sebagai default hemat token sebelum menawarkan opsi AI.

## [2026-09-08] Fallback border-color putih (#e5e7eb) akibat slash opacity pada CSS variable HEX di Tailwind v3
- Apa yang salah: Tampilan dark mode di feed dan antarmuka Droppr memunculkan garis-garis border putih terang yang tajam dan memaksakan pada sidebar, topbar, filter, dan kotak-kotak checklist task.
- Kenapa terjadi (root cause, bukan cuma gejala): Token border didefinisikan dalam format HEX (`--color-border-hairline: #222A35`). Di berbagai komponen digunakan class slash opacity seperti `border-border-hairline/50` atau `/40`. Di Tailwind CSS v3, variabel HEX tanpa format raw RGB tidak mendukung sintaks slash opacity, sehingga Tailwind mengabaikan class warna tersebut dan browser jatuh ke preflight default `borderColor.DEFAULT` (`#e5e7eb` abu-abu terang / putih).
- Perbaikan yang dilakukan: Mengonfigurasi `borderColor.DEFAULT: "var(--color-border-hairline)"` di `tailwind.config.ts`, menambahkan preflight `*, ::before, ::after { border-color: var(--color-border-hairline); }` di `styles/globals.css`, menambahkan token `--color-border-subtle` dengan nilai `rgba(255,255,255,0.04)` dan `--color-border-hairline: rgba(255,255,255,0.08)` yang menyatu alami dengan background dark mode, mendesain ulang daftar langkah task di feed agar tidak menggunakan kotak kaku bergaris putih, serta mengganti seluruh class `border-border-hairline/xx` yang rusak dengan token styling yang valid.
- Aturan ke depan: JANGAN pernah gunakan sintaks slash opacity (`/50`, `/40`) pada class warna custom yang memetakan ke CSS variable HEX, dan selalu pastikan `borderColor.DEFAULT` disetel ke token border hairline agar tidak jatuh ke warna putih.

## [2026-09-08] Missing prefetch={false} pada sidebar dan rute /feed & /waitlist di middleware membekukan navigasi dev
- Apa yang salah: Navigasi antar halaman terasa sangat lelet (menunggu hingga 57 detik), browser membeku saat membuka tab lain, dan memori Node.js melonjak hingga 2.9 GB.
- Kenapa terjadi (root cause, bukan cuma gejala): (1) Komponen `Link` navigasi sidebar untuk seluruh menu (termasuk menu baru Feed dan Waitlist) tidak menyertakan `prefetch={false}`. Setiap kali halaman dimuat, Next.js App Router memicu prefetch paralel untuk seluruh 8 halaman sekaligus. Di dev server, Webpack memaksakan kompilasi on-the-fly 8 rute (10.500+ modul) secara bersamaan, memblokir event loop Node.js. (2) Rute `/feed` dan `/waitlist` belum didaftarkan di `isAppRoute` pada `lib/supabase/middleware.ts`, dan header RSC standar browser `accept: text/x-component` belum masuk filter bypass, sehingga setiap klik navigasi memicu remote auth roundtrip ganda ke Supabase cloud.
- Perbaikan yang dilakukan: Menambahkan `prefetch={false}` pada seluruh link di `sidebar.tsx` dan `topbar.tsx`, menambahkan `/feed` dan `/waitlist` ke `isAppRoute`, menambahkan deteksi `accept: text/x-component` di bypass client navigation middleware, mematikan proses node lama yang bocor, membersihkan cache `.next`, dan me-restart dev server. Response time turun dari 57 detik menjadi ~150 milidetik.
- Aturan ke depan: Setiap penambahan item menu baru pada navigasi utama (Sidebar/Topbar) WAJIB menyertakan `prefetch={false}` dan rutenya wajib didaftarkan pada `isAppRoute` di `lib/supabase/middleware.ts`.

## [2026-09-08] PostgreSQL JSON 22P02 unicode low surrogate error menggagalkan sinkronisasi feed Telegram
- Apa yang salah: Saat sinkronisasi feed Telegram dijalankan, data tidak muncul di antarmuka dan database (`airdrop_feeds` dan `waitlists` tetap kosong).
- Kenapa terjadi (root cause, bukan cuma gejala): Teks postingan dari channel Telegram memuat emoji majemuk yang terpotong saat diparsing atau diproses, menghasilkan unpaired surrogate code units (seperti `\udd25`). PostgreSQL menolak keras insert teks tersebut ke dalam kolom `tasks JSONB` dengan error code `22P02: invalid input syntax for type json: Unicode low surrogate must follow a high surrogate`. Akibatnya transaksi insert di-rollback secara diam-diam. Selain itu, client view hanya memanggil `router.refresh()` tanpa mengupdate state React lokal `feeds`.
- Perbaikan yang dilakukan: Membuat helper `sanitizeSurrogates()` di `app/api/feed/sync/route.ts` dan `app/api/waitlist/sync/route.ts` untuk membersihkan unpaired surrogate code units dan null bytes sebelum data di-upsert ke Supabase. Serta menambahkan fetch data langsung di client setelah proses sync selesai agar state lokal segera terupdate tanpa perlu refresh browser manual.
- Aturan ke depan: Selalu sanitasi string yang bersumber dari platform eksternal (Telegram/Twitter) dengan sanitizer Unicode surrogate sebelum disimpan ke kolom PostgreSQL `JSONB`.

## [2026-09-08] Mismatch nama kolom pada tabel Supabase project_updates menyebabkan thread selalu kosong
- Apa yang salah: Setiap kali menambahkan update (baik manual maupun via AI), data tidak pernah muncul di linimasa thread dan status tetap "Thread masih kosong".
- Kenapa terjadi (root cause, bukan cuma gejala): Skrip SQL migrasi yang dieksekusi di Supabase membuat kolom `content` (text) dan `is_completed` (boolean), sedangkan kode JavaScript di `lib/supabase/thread-updates.ts` mencoba melakukan query insert dengan kolom `title`, `status`, `completed_at`, dan `source_date` yang tidak ada di tabel Postgres (error 42703). Akibatnya insert selalu gagal, sementara query select berhasil (mengembalikan array kosong `[]`) sehingga UI selalu menganggap thread kosong.
- Perbaikan yang dilakukan: Menyesuaikan seluruh fungsi CRUD (`fetchProjectThreads`, `createProjectThread`, `bulkCreateProjectThreads`, `toggleThreadTaskStatus`) di `lib/supabase/thread-updates.ts` agar 100% memetakan kolom aktual database (`content`, `is_completed`, `source_platform`, `created_at`, `source_url`).
- Aturan ke depan: Selalu verifikasi nama dan tipe kolom aktual database Supabase via query schema sebelum menulis logic insert/select pada service helper baru.

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
