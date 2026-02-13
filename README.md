# Demivio - Kalkulator Faktur Pajak

Demivio adalah aplikasi simulasi perhitungan "Reverse Calculator" untuk PPN (Pajak Pertambahan Nilai) di Indonesia. Aplikasi ini membantu pengguna mencari kombinasi Harga Satuan, Kuantitas, dan Diskon yang tepat untuk mencapai target PPN tertentu.

## Fitur Utama

- **Reverse Calculation**: Menghitung mundur dari Target PPN yang diinginkan untuk menemukan Harga Satuan yang sesuai.
- **Simulasi Cerdas**: Menggunakan pendekatan matematis dan algoritma prioritas untuk menemukan kombinasi yang valid tanpa brute-force yang berat.
- **High Performance**: Mendukung ruang pencarian hingga 1 miliar kombinasi dengan tetap responsif.
- **Web Worker**: Menjalankan kalkulasi berat di background thread agar UI tidak pernah freeze.
- **Kustomisasi Parameter**:
  - Mengatur toleransi selisih PPN.
  - Mengatur rentang (range) harga dan diskon dari transaksi acuan.
  - Menentukan range kuantitas minimum dan maksimum.
  - Fitur **Lock**: Mengunci salah satu parameter (Harga, Qty, atau Diskon) agar tidak berubah selama simulasi.
- **Reactive Defaults**: Secara otomatis menyarankan rentang pencarian (+/- 5%) saat data acuan diubah.
- **Copy to Clipboard**: Menyalin hasil perhitungan (Harga, Diskon, DPP Nilai Lain) dengan satu klik dalam format yang siap digunakan.
- **Ranking Hasil**: Menampilkan hasil terbaik berdasarkan skor kedekatan dengan target dan kewajaran harga.

## Cara Menggunakan

1.  **Transaksi Acuan**: Masukkan data transaksi normal (Harga Satuan, Qty, Potongan) sebagai referensi. Anda bisa mengunci (lock) parameter tertentu jika tidak ingin nilainya bergeser.
2.  **Target & Toleransi**: Tentukan berapa PPN yang ingin dicapai dan toleransi selisih yang diizinkan (misal: +/- Rp 1).
3.  **Parameter Pencarian**: Sesuaikan batasan pencarian seperti Harga Min/Max, Potongan Min/Max, dan range quantity. Secara default, aplikasi akan memberikan saran rentang 5% dari nilai acuan.
4.  **Jalankan Simulasi**: Klik tombol "Jalankan". Anda dapat membatalkan simulasi kapan saja jika diperlukan.
5.  **Hasil**: Lihat daftar kombinasi yang ditemukan. Klik ikon ❐ untuk menyalin nilai tertentu ke clipboard.

## Teknologi

- SvelteKit
- TypeScript
- Web Workers (untuk background processing)
- Decimal.js (untuk akurasi perhitungan keuangan)

## Cara Menjalankan

```bash
npm install
npm run dev
```

ATAU

```bash
pnpm install
pnpm dev
```
