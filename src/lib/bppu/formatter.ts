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

  const headers = [
    'File',
    'Nomor BPPU',
    'Masa Pajak',
    'Sifat Pemotongan',
    'Status Bukti Pemotongan',
    'NPWP/NIK Penerima',
    'Nama Penerima',
    'NITKU Penerima',
    'Jenis Fasilitas',
    'Jenis PPh',
    'Kode Objek Pajak',
    'Nama Objek Pajak',
    'DPP (Rp)',
    'Tarif (%)',
    'PPh (Rp)',
    'Jenis Dokumen Dasar',
    'Tanggal Dokumen Dasar',
    'Nomor Dokumen Dasar',
    'Nomor SP2D',
    'NPWP/NIK Pemotong',
    'NITKU Pemotong',
    'Nama Pemotong',
    'Tanggal Bukti',
    'Nama Penandatangan'
  ];

  const rows: string[] = [];
  rows.push(headers.map(esc).join(';'));

  const commonData = [
    fileName,
    data.header?.nomor,
    data.header?.masa_pajak,
    data.header?.sifat_pemotongan,
    data.header?.status_bukti_pemotongan,
    data.penerima?.npwp_nik,
    data.penerima?.nama,
    data.penerima?.nitku,
    data.pemotongan?.jenis_fasilitas,
    data.pemotongan?.jenis_pph
  ];

  const trailingData = [
    data.pemotongan?.dokumen_dasar?.jenis_dokumen,
    data.pemotongan?.dokumen_dasar?.tanggal_dokumen,
    data.pemotongan?.dokumen_dasar?.nomor_dokumen,
    data.pemotongan?.nomor_sp2d,
    data.pemotong?.npwp_nik,
    data.pemotong?.nitku,
    data.pemotong?.nama_pemotong,
    data.pemotong?.tanggal,
    data.pemotong?.nama_penandatangan
  ];

  const objekList = data.pemotongan?.objek_pajak || [];

  if (objekList.length === 0) {
    const row = [...commonData, '', '', '', '', '', ...trailingData];
    rows.push(row.map(esc).join(';'));
  } else {
    objekList.forEach((op) => {
      const row = [
        ...commonData,
        op.kode_objek_pajak,
        op.objek_pajak,
        op.dpp,
        op.tarif_persen,
        op.pajak_penghasilan,
        ...trailingData
      ];
      rows.push(row.map(esc).join(';'));
    });
  }

  return rows.join('\n');
};
