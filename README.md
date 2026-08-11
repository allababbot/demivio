# Demivio - Tax Utility Suite

Demivio adalah sekumpulan utilitas berbasis web untuk mempercepat dan mengotomasi pekerjaan administrasi perpajakan di Indonesia. Semua pemrosesan dilakukan sepenuhnya di sisi klien (browser) — tidak ada data yang dikirim ke server.

## Fitur

### 1. Kalkulator PPN (Reverse Calculator)

Simulasi cerdas untuk menemukan kombinasi Harga Satuan, Kuantitas, dan Potongan/Diskon yang menghasilkan target PPN tertentu.

- **Reverse calculation** — menghitung mundur dari target PPN ke komponen harga yang sesuai.
- **High performance** — menggunakan Web Workers untuk mengeksplorasi kombinasi dalam jumlah besar tanpa membekukan browser.
- **Kustomisasi parameter** — atur rentang toleransi selisih PPN, batas rentang pencarian, atau kunci (lock) nilai tertentu agar tidak ikut dicari.

### 2. Rekonsiliasi Penjualan

Membandingkan dan mencocokkan data transaksi penjualan bulanan antara sistem perusahaan dan DJP (Coretax).

- **Automated matching** — menggabungkan data CSV Coretax dan CSV Aplikasi Penjualan berdasarkan Nomor Referensi.
- **Deteksi selisih** — menyoroti baris transaksi yang memiliki perbedaan pada nilai DPP maupun PPN.
- **Filter & sort** — quick-filter untuk melihat data Hanya Coretax, Hanya Aplikasi, atau Ada Selisih, dengan pengurutan terintegrasi.

### 3. Mutasi Bank

Mengubah raw data mutasi rekening bank menjadi file Excel standar yang siap dianalisis atau direkonsiliasi.

- **Deteksi bank otomatis** — mengenali format mutasi BCA, BNI, dan BRI.
- **Normalisasi kolom** — menghasilkan format seragam: Keterangan, Tanggal, Debit, Kredit, Saldo, dan Status.
- **Validasi saldo** — menghitung ulang saldo BCA/BRI baris demi baris dan menandai baris yang selisih. Untuk BNI, saldo dihitung dari saldo awal manual.
- **Export Excel** — unduh per file atau gabungkan banyak file dalam satu workbook.

### 4. Faktur Extractor

Mengekstrak data terstruktur dari file PDF Faktur Pajak (e-Faktur DJP).

- **Multi-file** — proses banyak PDF sekaligus dengan drag & drop.
- **Ekstraksi lengkap** — mengambil data penjual, pembeli, nomor seri, tanggal, referensi, dan seluruh baris barang/jasa beserta kode, nama, kuantitas, satuan, harga jual, dan total harga jual.
- **Nama barang multi-baris** — menangani nama barang/jasa yang terpotong (word-wrap) di PDF.
- **Export Excel** — satu baris per barang/jasa, termasuk metadata faktur (DPP, PPN, PPnBM). Format tanggal dikonversi otomatis ke DD/MM/YYYY saat export.
- **Export semua sekaligus** — gabungkan hasil dari banyak PDF ke satu file Excel.

### 5. BPPU Extractor

Mengekstrak data terstruktur dari file PDF Bukti Pemotongan/Pemungutan Unifikasi (BPPU) Coretax.

- **Multi-file** — proses banyak PDF sekaligus dengan drag & drop.
- **Ekstraksi lengkap** — mengambil identitas penerima, pemotong, objek pajak (kode, DPP, tarif, PPh), dan dokumen dasar.
- **Export Excel** — satu baris per objek pajak, termasuk metadata bukti potong.
- **Export semua sekaligus** — gabungkan hasil dari banyak PDF ke satu file Excel.

## Cara Menggunakan

### Kalkulator PPN

1. Masukkan **Transaksi Acuan** (Harga Satuan, Qty, Potongan).
2. Tentukan **Target PPN** dan batas **Toleransi**.
3. Sesuaikan rentang parameter pencarian, lalu klik **Jalankan**.
4. Hasil diurutkan berdasarkan tingkat akurasi terdekat ke target.

### Rekonsiliasi

1. Siapkan data sesuai **Template CSV** yang tersedia di aplikasi.
2. Unggah file dari **Coretax** dan file dari **Aplikasi Penjualan**.
3. Tabel otomatis menampilkan perbandingan dan menyorot baris yang ada selisih.
4. Klik baris mana saja untuk melihat rincian sumber aslinya.

### Mutasi Bank

1. Drag & drop atau pilih satu atau lebih file mutasi **BCA**, **BNI**, atau **BRI**.
2. Sistem otomatis mendeteksi bank dan menampilkan preview dalam kolom standar.
3. Untuk file **BNI**, masukkan **Saldo Awal** agar saldo berjalan dapat dihitung.
4. Klik **Excel File Ini** untuk mengunduh satu file, atau **Export Semua Excel** untuk workbook gabungan.

### Faktur Extractor

1. Drag & drop atau pilih satu atau lebih file **PDF e-Faktur**.
2. Klik **Ekstrak** — hasil tampil per tab untuk setiap file.
3. Periksa data barang/jasa, lalu klik **Excel** untuk mengunduh per file atau **Export Semua Excel** untuk menggabungkan semuanya.

### BPPU Extractor

1. Drag & drop atau pilih satu atau lebih file **PDF BPPU Coretax**.
2. Klik **Ekstrak** — hasil tampil per tab untuk setiap file.
3. Periksa data objek pajak, lalu klik **Excel** untuk mengunduh per file atau **Export Semua Excel** untuk menggabungkan semuanya.

## Teknologi

- **SvelteKit** — UI & routing
- **TypeScript** — type safety di seluruh codebase
- **pdfjs-dist** — ekstraksi teks dari PDF di sisi klien
- **Web Workers** — komputasi berat di background thread
- **Decimal.js** — kalkulasi finansial presisi tinggi
- **SheetJS (xlsx)** — export Excel
- **IndexedDB** — caching hasil simulasi di browser
- **@vercel/analytics** — analytics

## Menjalankan Secara Lokal

```bash
pnpm install
pnpm dev
```

atau dengan npm:

```bash
npm install
npm run dev
```
