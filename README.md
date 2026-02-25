# Demivio - Kalkulator PPN

Demivio adalah aplikasi simulasi perhitungan "Reverse Calculator" untuk PPN (Pajak Pertambahan Nilai). Aplikasi ini membantu pengguna mencari kombinasi Harga Satuan, Kuantitas, dan Diskon yang tepat untuk mencapai target PPN tertentu.

## Fitur Utama

- **Reverse Calculation**: Menghitung mundur dari Target PPN yang diinginkan untuk menemukan Harga Satuan yang sesuai.
- **Simulasi Cerdas**: Menggunakan pendekatan matematis dan algoritma prioritas untuk menemukan kombinasi yang valid tanpa brute-force yang berat.
- **High Performance & Precision**: Mendukung pencarian hingga 5 juta kombinasi dinamis secara paralel tanpa lag, dilengkapi resolusi desimal tak berhingga untuk menghindari _dead-zones_ pada pencarian nilai eksak.
- **Web Worker**: Menjalankan kalkulasi berat di background thread agar UI tidak pernah freeze.
- **Kustomisasi Parameter**:
  - Mengatur toleransi selisih PPN.
  - Mengatur rentang (range) harga dan diskon dari transaksi acuan.
  - Menentukan range kuantitas minimum dan maksimum.
  - Fitur **Lock**: Mengunci salah satu parameter (Harga, Qty, atau Diskon) agar tidak berubah selama simulasi.
- **Smart Defaults**: Secara otomatis menghitung _step_ terbaik berdasarkan rentang untuk mencegah _infinite loops_ dan menjaga performa peramban.
- **Copy to Clipboard**: Menyalin hasil perhitungan (Harga, Diskon, DPP Nilai Lain) dengan satu klik dalam format yang siap digunakan.
- **Ranking Hasil**: Menampilkan hasil terbaik berdasarkan persentase kedekatan (_Percentage Error Ratio_) dengan referensi transaksi.

## Cara Menggunakan

1.  **Transaksi Acuan**: Masukkan data transaksi normal (Harga Satuan, Qty, Potongan) sebagai referensi. Anda bisa mengunci (lock) parameter tertentu jika tidak ingin nilainya bergeser.
2.  **Target & Toleransi**: Tentukan berapa PPN yang ingin dicapai dan toleransi selisih yang diizinkan (misal: +/- Rp 1).
3.  **Parameter Pencarian**: Sesuaikan batasan pencarian seperti Harga Min/Max, Potongan Min/Max, dan batasan Qty.
4.  **Jalankan Simulasi**: Klik tombol "Jalankan". Worker di background akan memecah kalkulasi dan melaporkan progresnya secara _real-time_.
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
