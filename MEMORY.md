# MEMORY.md — Catatan Kesalahan & Pembelajaran Proyek Droppr

> File ini ditulis oleh agen AI, bukan oleh manusia. Dibaca otomatis di awal sesi (bagian atas file diprioritaskan). Lihat `AGENTS.md` §5 untuk format entri dan aturan pemangkasan.

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
