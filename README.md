# Demivio - Kalkulator Faktur Pajak

Demivio adalah aplikasi simulasi perhitungan "Reverse Calculator" untuk PPN (Pajak Pertambahan Nilai) di Indonesia. Aplikasi ini membantu pengguna mencari kombinasi Harga Satuan, Kuantitas, dan Diskon yang tepat untuk mencapai target PPN tertentu.

## Fitur Utama

- **Reverse Calculation**: Menghitung mundur dari Target PPN yang diinginkan untuk menemukan Harga Satuan yang sesuai.
- **Simulasi Cerdas**: Menggunakan pendekatan matematis untuk menemukan kombinasi yang valid tanpa brute-force yang berat.
- **Kustomisasi Parameter**:
  - Mengatur toleransi selisih PPN.
  - Mengatur variance (penyimpangan) harga dan diskon dari transaksi acuan.
  - Menentukan range kuantitas minimum dan maksimum.
- **Ranking Hasil**: Menampilkan hasil terbaik berdasarkan skor kedekatan dengan target dan kewajaran harga.

## Cara Menggunakan

1.  **Transaksi Acuan**: Masukkan data transaksi normal (Harga Satuan, Qty, Diskon) sebagai referensi.
2.  **Target & Toleransi**: Tentukan berapa PPN yang ingin dicapai dan toleransi selisih yang diizinkan (misal: +/- Rp 5.000).
3.  **Parameter Pencarian**: Sesuaikan batasan pencarian seperti variance harga (%), range quantity, dan step pencarian.
4.  **Jalankan Simulasi**: Klik tombol simulasi untuk melihat daftar kombinasi yang menghasilkan PPN mendekati target.

## Teknologi

- SvelteKit
- TypeScript
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
