export interface FakturPihak {
  nama: string;
  alamat: string;
  npwp: string;
  nik?: string;
  nomor_paspor?: string;
  identitas_lain?: string;
  email?: string;
}

export interface FakturBarangJasa {
  nomor: string;
  kode: string;
  nama: string;
  harga_jual: string;
  kuantitas: string;
  satuan: string;
  total_harga_jual: string;
}

export interface FakturData {
  header: {
    nomor_seri: string;
    tanggal: string;
    referensi: string;
    penanda_tangan: string;
  };
  penjual: FakturPihak;
  pembeli: FakturPihak;
  barang_jasa: FakturBarangJasa[];
  total_harga_jual: string;
  dpp: string;
  ppn: string;
  ppnbm: string;
}
