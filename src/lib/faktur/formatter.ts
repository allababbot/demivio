import type { FakturData } from "./types";

const BULAN: Record<string, string> = {
  januari: "01", februari: "02", maret: "03", april: "04",
  mei: "05", juni: "06", juli: "07", agustus: "08",
  september: "09", oktober: "10", november: "11", desember: "12",
};

export const formatTanggal = (raw: string): string => {
  if (!raw) return raw;

  // Format "DD Bulan YYYY" → "DD/MM/YYYY"
  const textMatch = raw.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (textMatch) {
    const dd = textMatch[1].padStart(2, "0");
    const mm = BULAN[textMatch[2].toLowerCase()];
    const yyyy = textMatch[3];
    if (mm) return `${dd}/${mm}/${yyyy}`;
  }

  // Format "DD-MM-YYYY" atau "DD/MM/YYYY" → normalkan ke "DD/MM/YYYY"
  const numMatch = raw.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (numMatch) {
    const dd = numMatch[1].padStart(2, "0");
    const mm = numMatch[2].padStart(2, "0");
    const yyyy = numMatch[3].length === 2 ? "20" + numMatch[3] : numMatch[3];
    return `${dd}/${mm}/${yyyy}`;
  }

  return raw;
};

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
    "No",
    "Kode",
    "Nama Barang/Jasa",
    "Kuantitas",
    "Satuan",
    "Harga Jual (Rp)",
    "Total Harga Jual (Rp)",
    "DPP (Rp)",
    "PPN (Rp)",
    "PPnBM (Rp)",
  ];

  if (data.barang_jasa.length === 0) {
    const row = [
      fileName,
      data.header.nomor_seri,
      formatTanggal(data.header.tanggal),
      data.header.referensi,
      data.penjual.nama,
      data.penjual.npwp,
      data.pembeli.nama,
      data.pembeli.npwp,
      "", "", "", "", "", "", "",
      data.dpp,
      data.ppn,
      data.ppnbm,
    ];
    return [headers, row];
  }

  const rows = data.barang_jasa.map((b) => [
    fileName,
    data.header.nomor_seri,
    formatTanggal(data.header.tanggal),
    data.header.referensi,
    data.penjual.nama,
    data.penjual.npwp,
    data.pembeli.nama,
    data.pembeli.npwp,
    b.nomor,
    b.kode,
    b.nama,
    b.kuantitas,
    b.satuan,
    b.harga_jual,
    b.total_harga_jual,
    data.dpp,
    data.ppn,
    data.ppnbm,
  ]);

  return [headers, ...rows];
};

export const toCSV = (data: FakturData, fileName: string): string => {
  const rows = toExcelRows(data, fileName);
  return rows.map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
};
