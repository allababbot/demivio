import type { BppuData } from './types';

export const fmt = (v: string | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
};

export const fmtRp = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === '' || v === '0' || v === 0) return 'Rp 0';
  const num = parseInt(String(v).replace(/\D/g, ''), 10);
  if (Number.isNaN(num)) return fmt(v as string);
  return 'Rp ' + num.toLocaleString('id-ID');
};

export const fileSizeLabel = (b: number): string => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

export const toCSV = (data: BppuData, fileName: string): string => {
  const esc = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows: string[] = [];
  rows.push(['File', 'Seksi', 'Field', 'Nilai'].map(esc).join(','));

  const push = (sec: string, key: string, val: string | number | null | undefined) =>
    rows.push([fileName, sec, key, val].map(esc).join(','));

  push('Header', 'Nomor', data.header?.nomor);
  push('Header', 'Masa Pajak', data.header?.masa_pajak);
  push('Header', 'Sifat Pemotongan', data.header?.sifat_pemotongan);
  push('Header', 'Status Bukti Pemotongan', data.header?.status_bukti_pemotongan);
  push('Penerima', 'NPWP/NIK', data.penerima?.npwp_nik);
  push('Penerima', 'Nama', data.penerima?.nama);
  push('Penerima', 'NITKU', data.penerima?.nitku);
  push('Pemotongan', 'Jenis Fasilitas', data.pemotongan?.jenis_fasilitas);
  push('Pemotongan', 'Jenis PPh', data.pemotongan?.jenis_pph);

  (data.pemotongan?.objek_pajak || []).forEach((op, i) => {
    const prefix = `Objek Pajak ${i + 1}`;
    push(prefix, 'Kode Objek Pajak', op.kode_objek_pajak);
    push(prefix, 'Objek Pajak', op.objek_pajak);
    push(prefix, 'DPP (Rp)', op.dpp);
    push(prefix, 'Tarif (%)', op.tarif_persen);
    push(prefix, 'Pajak Penghasilan (Rp)', op.pajak_penghasilan);
  });

  push('Dokumen Dasar', 'Jenis Dokumen', data.pemotongan?.dokumen_dasar?.jenis_dokumen);
  push('Dokumen Dasar', 'Tanggal Dokumen', data.pemotongan?.dokumen_dasar?.tanggal_dokumen);
  push('Dokumen Dasar', 'Nomor Dokumen', data.pemotongan?.dokumen_dasar?.nomor_dokumen);
  push('Dokumen Dasar', 'Nomor SP2D', data.pemotongan?.nomor_sp2d);
  push('Pemotong', 'NPWP/NIK Pemotong', data.pemotong?.npwp_nik);
  push('Pemotong', 'NITKU Pemotong', data.pemotong?.nitku);
  push('Pemotong', 'Nama Pemotong', data.pemotong?.nama_pemotong);
  push('Pemotong', 'Tanggal', data.pemotong?.tanggal);
  push('Pemotong', 'Nama Penandatangan', data.pemotong?.nama_penandatangan);

  return rows.join('\n');
};
