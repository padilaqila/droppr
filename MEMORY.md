# MEMORY.md — Catatan Kesalahan & Pembelajaran Proyek Droppr

> File ini ditulis oleh agen AI, bukan oleh manusia. Dibaca otomatis di awal sesi (bagian atas file diprioritaskan). Lihat `AGENTS.md` §5 untuk format entri dan aturan pemangkasan.

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

## [2026-09-08] PowerShell execution policy memblokir npm script wrapper
- Apa yang salah: Menjalankan `npm` dan `npx` di PowerShell menghasilkan security error `PSSecurityException`.
- Kenapa terjadi (root cause, bukan cuma gejala): PowerShell mencoba memanggil `npm.ps1` yang terkena script restriction Windows.
- Perbaikan yang dilakukan: Menggunakan executable langsung `npm.cmd` dan `npx.cmd`.
- Aturan ke depan: Di environment Windows PowerShell, selalu panggil `npm.cmd` dan `npx.cmd` secara eksplisit untuk eksekusi perintah terminal.
