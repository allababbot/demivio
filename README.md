# Demivio - Kalkulator Faktur Pajak

Demivio adalah aplikasi simulasi perhitungan "Reverse Calculator" untuk PPN (Pajak Pertambahan Nilai) di Indonesia. Aplikasi ini membantu pengguna mencari kombinasi Harga Satuan, Kuantitas, dan Diskon yang tepat untuk mencapai target PPN tertentu.

## Fitur Utama

- **Reverse Calculation**: Menghitung mundur dari Target PPN yang diinginkan untuk menemukan Harga Satuan yang sesuai.
- **Simulasi Cerdas**: Menggunakan pendekatan matematis dan algoritma prioritas untuk menemukan kombinasi yang valid tanpa brute-force yang berat.
- **High Performance**: Mendukung ruang pencarian hingga 1 miliar kombinasi dengan tetap responsif.
- **Web Worker**: Menjalankan kalkulasi berat di background thread agar UI tidak pernah freeze.
- **Kustomisasi Parameter**:
  - Mengatur toleransi selisih PPN.
  - Mengatur variance (penyimpangan) harga dan diskon dari transaksi acuan.
  - Menentukan range kuantitas minimum dan maksimum.
- **Ranking Hasil**: Menampilkan hasil terbaik berdasarkan skor kedekatan dengan target dan kewajaran harga.

## Cara Menggunakan

1.  **Transaksi Acuan**: Masukkan data transaksi normal (Harga Satuan, Qty, Diskon) sebagai referensi.
2.  **Target & Toleransi**: Tentukan berapa PPN yang ingin dicapai dan toleransi selisih yang diizinkan (misal: +/- Rp 5.000).
3.  **Parameter Pencarian**: Sesuaikan batasan pencarian seperti variance harga (%), variance potongan (%), dan range quantity.
4.  **Jalankan Simulasi**: Klik tombol simulasi. Anda dapat membatalkan simulasi kapan saja jika diperlukan.
5.  **Hasil**: Lihat daftar kombinasi yang ditemukan beserta waktu eksekusi.

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
