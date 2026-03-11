export interface BppuHeader {
  nomor: string;
  masa_pajak: string;
  sifat_pemotongan: string;
  status_bukti_pemotongan: string;
}

export interface BppuPenerima {
  npwp_nik: string;
  nama: string;
  nitku: string;
}

export interface ObjekPajak {
  kode_objek_pajak: string;
  objek_pajak: string;
  dpp: string;
  tarif_persen: string;
  pajak_penghasilan: string;
}

export interface DokumenDasar {
  jenis_dokumen: string;
  tanggal_dokumen: string;
  nomor_dokumen: string;
}

export interface BppuPemotongan {
  jenis_fasilitas: string;
  jenis_pph: string;
  objek_pajak: ObjekPajak[];
  dokumen_dasar: DokumenDasar;
  nomor_sp2d: string;
}

export interface BppuPemotong {
  npwp_nik: string;
  nitku: string;
  nama_pemotong: string;
  tanggal: string;
  nama_penandatangan: string;
}

export interface BppuData {
  header: BppuHeader;
  penerima: BppuPenerima;
  pemotongan: BppuPemotongan;
  pemotong: BppuPemotong;
}

export interface BppuResult {
  fileName: string;
  fileSize: number;
  data?: BppuData;
  ok: boolean;
  error?: string;
}
