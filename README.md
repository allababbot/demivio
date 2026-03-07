# Demivio - Tax Utility Suite

Demivio adalah sekumpulan utilitas berbasis web yang dirancang untuk mempermudah perhitungan dan pengelolaan administrasi perpajakan yang kompleks menjadi lebih cepat dan otomatis. Saat ini Demivio memiliki dua fitur utama: **Kalkulator PPN** dan **Rekonsiliasi**.

## Fitur Utama

### 1. Kalkulator PPN (Reverse Calculator)

Aplikasi simulasi cerdas untuk menemukan kombinasi Harga Satuan, Kuantitas, dan Potongan/Diskon yang paling tepat untuk mencapai target PPN yang spesifik.

- **Reverse Calculation**: Menghitung mundur dari Target PPN ke Harga Satuan yang sesuai.
- **High Performance & Precision**: Menggunakan algoritma matematis dan _Web Workers_ untuk mengeksplorasi hingga 5 juta kombinasi tanpa membuat browser _freeze_.
- **Kustomisasi Parameter**: Tentukan rentang toleransi selisih PPN, batas pencarian komponen harga, atau kunci (lock) parameter tertentu.

### 2. Rekonsiliasi Penjualan

Tool otomatisasi untuk membandingkan dan mencocokkan (rekonsiliasi) data transaksi penjualan bulanan antara sistem perusahaan dan DJP (Coretax).

- **Automated Matching**: Menggabungkan data dari CSV Coretax dan CSV Aplikasi Penjualan berdasarkan Nomor Referensi secara kilat.
- **Deteksi Selisih Detil**: Secara otomatis menyoroti baris transaksi yang memiliki selisih pada nilai DPP maupun PPN.
- **Filter & Sort**: Dilengkapi _quick-filters_ untuk melihat kombinasi data (Hanya Coretax, Hanya Aplikasi, Ada Selisih) serta pengurutan data terintegrasi.
- **Bebas Server**: Proses parsing, deduplikasi, dan komparasi CSV dilakukan seratus persen di sisi _client_ (browser) menggunakan File API demi privasi dan kecepatan maksimal.

## Cara Menggunakan

### Kalkulator PPN

1. Masukkan **Transaksi Acuan** (Harga Satuan, Qty, Potongan).
2. Tentukan **Target PPN** dan batas **Toleransi**.
3. Sesuaikan batasan rentang pencarian komponen sebelum menekan tombol **Jalankan**.
4. Hasil komputasi akan diurutkan berdasarkan tingkat akurasi terdekat.

### Rekonsiliasi

1. Siapkan data penjualan sesuai **Template CSV** yang tersedia di aplikasi.
2. Unggah file data dari **Coretax** dan file data dari **Aplikasi Penjualan**.
3. Tabel akan otomatis menampilkan perbandingan dan menyorot baris yang terdapat selisih pencatatan.
4. Klik pada baris tabel mana saja untuk melihat rincian sumber aslinya.

## Teknologi

- SvelteKit (UI & Routing)
- TypeScript
- Web Workers (Background Processing)
- Decimal.js (High-precision financial calculation)
- PapaParse (CSV Parsing & Export)

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
