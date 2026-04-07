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

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  const months: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
  };
  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1].toLowerCase()];
    const year = parts[2];
    if (month) return `${day}/${month}/${year}`;
  }
  return dateStr;
};

export const toExcelRows = (data: BppuData, fileName: string): any[][] => {
  const headers = [
    'Tanggal Bukti',
    'Masa Pajak',
    'Nomor BPPU',
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
    'Nama Penandatangan',
    'File'
  ];

  const rows: any[][] = [];
  rows.push(headers);

  const startData = [
    formatDate(data.pemotong?.tanggal),
    data.header?.masa_pajak,
    data.header?.nomor,
    data.header?.sifat_pemotongan,
    data.header?.status_bukti_pemotongan,
    data.penerima?.npwp_nik,
    data.penerima?.nama,
    data.penerima?.nitku,
    data.pemotongan?.jenis_fasilitas,
    data.pemotongan?.jenis_pph
  ];

  const endData = [
    data.pemotongan?.dokumen_dasar?.jenis_dokumen,
    formatDate(data.pemotongan?.dokumen_dasar?.tanggal_dokumen),
    data.pemotongan?.dokumen_dasar?.nomor_dokumen,
    data.pemotongan?.nomor_sp2d,
    data.pemotong?.npwp_nik,
    data.pemotong?.nitku,
    data.pemotong?.nama_pemotong,
    data.pemotong?.nama_penandatangan,
    fileName
  ];

  const objekList = data.pemotongan?.objek_pajak || [];

  if (objekList.length === 0) {
    const row = [...startData, '', '', '', '', '', ...endData];
    rows.push(row);
  } else {
    objekList.forEach((op) => {
      const row = [
        ...startData,
        op.kode_objek_pajak,
        op.objek_pajak,
        op.dpp,
        op.tarif_persen,
        op.pajak_penghasilan,
        ...endData
      ];
      rows.push(row);
    });
  }

  return rows;
};

export const toCSV = (data: BppuData, fileName: string): string => {
  const esc = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'Tanggal Bukti',
    'Masa Pajak',
    'Nomor BPPU',
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
    'Nama Penandatangan',
    'File'
  ];

  const rows: string[] = [];
  rows.push(headers.map(esc).join(';'));

  const startData = [
    formatDate(data.pemotong?.tanggal),
    data.header?.masa_pajak,
    data.header?.nomor,
    data.header?.sifat_pemotongan,
    data.header?.status_bukti_pemotongan,
    data.penerima?.npwp_nik,
    data.penerima?.nama,
    data.penerima?.nitku,
    data.pemotongan?.jenis_fasilitas,
    data.pemotongan?.jenis_pph
  ];

  const endData = [
    data.pemotongan?.dokumen_dasar?.jenis_dokumen,
    formatDate(data.pemotongan?.dokumen_dasar?.tanggal_dokumen),
    data.pemotongan?.dokumen_dasar?.nomor_dokumen,
    data.pemotongan?.nomor_sp2d,
    data.pemotong?.npwp_nik,
    data.pemotong?.nitku,
    data.pemotong?.nama_pemotong,
    data.pemotong?.nama_penandatangan,
    fileName
  ];

  const objekList = data.pemotongan?.objek_pajak || [];

  if (objekList.length === 0) {
    const row = [...startData, '', '', '', '', '', ...endData];
    rows.push(row.map(esc).join(';'));
  } else {
    objekList.forEach((op) => {
      const row = [
        ...startData,
        op.kode_objek_pajak,
        op.objek_pajak,
        op.dpp,
        op.tarif_persen,
        op.pajak_penghasilan,
        ...endData
      ];
      rows.push(row.map(esc).join(';'));
    });
  }

  return rows.join('\n');
};
