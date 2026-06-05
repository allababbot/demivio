import type { FakturData } from "./types";

export const toExcelRows = (data: FakturData, fileName: string): any[][] => {
  const headers = [
    "File Name",
    "Nomor Seri Faktur",
    "Tanggal",
    "Referensi",
    "Nama Penjual",
    "NPWP Penjual",
    "Nama Pembeli",
    "NPWP Pembeli",
    "DPP (Rp)",
    "PPN (Rp)",
    "PPnBM (Rp)"
  ];

  const row = [
    fileName,
    data.header.nomor_seri,
    data.header.tanggal,
    data.header.referensi,
    data.penjual.nama,
    data.penjual.npwp,
    data.pembeli.nama,
    data.pembeli.npwp,
    data.dpp,
    data.ppn,
    data.ppnbm
  ];

  return [headers, row];
};

export const toCSV = (data: FakturData, fileName: string): string => {
  const rows = toExcelRows(data, fileName);
  return rows.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
};
