// Polyfill for browser APIs missing in Node.js SSR — must run before any dynamic import of pdfjs-dist
if (typeof DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    constructor(init?: string) {
      if (init) {
        const m = init.replace("matrix(", "").replace(")", "").split(",");
        if (m.length === 6) {
          this.a = +m[0];
          this.b = +m[1];
          this.c = +m[2];
          this.d = +m[3];
          this.e = +m[4];
          this.f = +m[5];
        }
      }
    }
    multiply(other: any) {
      return this;
    }
    translate(tx: number, ty: number) {
      this.e = tx;
      this.f = ty;
      return this;
    }
    scale(sx: number, sy?: number) {
      this.a = sx;
      this.d = sy ?? sx;
      return this;
    }
  };
}

if (typeof btoa === "undefined") {
  (globalThis as any).btoa = (str: string) => Buffer.from(str, "binary").toString("base64");
}
if (typeof atob === "undefined") {
  (globalThis as any).atob = (str: string) => Buffer.from(str, "base64").toString("binary");
}

import type { FakturData } from "./types";

// Lazy-load pdfjs-dist only on the client — avoids SSR crash from missing browser APIs
let _pdfjs: typeof import("pdfjs-dist") | null = null;
async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import("pdfjs-dist");
    if (typeof window !== "undefined" || typeof self !== "undefined") {
      _pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    }
  }
  return _pdfjs;
}

export const parseFakturText = (text: string): FakturData => {
  const data: FakturData = {
    header: { nomor_seri: "", tanggal: "", referensi: "", penanda_tangan: "" },
    penjual: { nama: "", alamat: "", npwp: "" },
    pembeli: {
      nama: "",
      alamat: "",
      npwp: "",
      nik: "",
      nomor_paspor: "",
      identitas_lain: "",
      email: "",
    },
    barang_jasa: [],
    dpp: "",
    ppn: "",
    ppnbm: "",
  };

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");

  const getVal = (label: string): string => {
    const idx = lines.findIndex((l) => l.startsWith(label));
    if (idx === -1) return "";
    const line = lines[idx];
    const parts = line.split(":");
    return parts.length > 1 ? parts[1].trim() : "";
  };

  // Header
  const nsfp = lines.find((l) => l.includes("Kode dan Nomor Seri Faktur Pajak:"));
  if (nsfp) data.header.nomor_seri = nsfp.split(":")[1]?.trim() || "";

  const refLine = lines.find((l) => l.includes("(Referensi:"));
  if (refLine) data.header.referensi = refLine.replace("(Referensi:", "").replace(")", "").trim();

  // Penjual
  const pkpIdx = lines.findIndex((l) => l.includes("Pengusaha Kena Pajak:"));
  if (pkpIdx !== -1) {
    data.penjual.nama = lines[pkpIdx + 1]?.replace("Nama :", "").trim() || "";
    data.penjual.alamat = lines[pkpIdx + 2]?.replace("Alamat :", "").trim() + " " + (lines[pkpIdx + 3] || "");
    data.penjual.npwp = lines[pkpIdx + 4]?.replace("NPWP :", "").trim() || "";
  }

  // Pembeli
  const pembeliIdx = lines.findIndex((l) => l.includes("Pembeli Barang Kena Pajak/Penerima Jasa Kena Pajak:"));
  if (pembeliIdx !== -1) {
    data.pembeli.nama = lines[pembeliIdx + 1]?.replace("Nama :", "").trim() || "";
    data.pembeli.alamat = lines[pembeliIdx + 2]?.replace("Alamat :", "").trim() + " " + (lines[pembeliIdx + 3] || "");
    data.pembeli.npwp = lines[pembeliIdx + 4]?.replace("NPWP :", "").trim() || "";
    data.pembeli.nik = lines[pembeliIdx + 5]?.replace("NIK :", "").trim() || "";
    data.pembeli.nomor_paspor = lines[pembeliIdx + 6]?.replace("Nomor Paspor :", "").trim() || "";
    data.pembeli.identitas_lain = lines[pembeliIdx + 7]?.replace("Identitas Lain :", "").trim() || "";
    data.pembeli.email = lines[pembeliIdx + 8]?.replace("Email:", "").trim() || "";
  }

  // Helper to extract values robustly (handles same-line or next-line values)
  const extractAmount = (keyword: string): string => {
    const idx = lines.findIndex((l) => l.includes(keyword));
    if (idx === -1) return "";

    const line = lines[idx];
    // Check if value exists on the same line after the keyword
    const after = line
      .replace(keyword, "")
      .trim()
      .replace(/^[:\s]+/, "");
    if (after.match(/\d/)) {
      return after;
    }

    // Otherwise, try the next non-empty line
    if (lines[idx + 1]) {
      return lines[idx + 1].trim();
    }

    return "";
  };

  data.dpp = extractAmount("Dasar Pengenaan Pajak");
  data.ppn = extractAmount("Jumlah PPN");
  data.ppnbm = extractAmount("Jumlah PPnBM");

  // Tanggal & Penanda tangan (footer)
  const signerIdx = lines.findIndex((l) => l.includes("Ditandatangani secara elektronik"));

  if (signerIdx !== -1) {
    // 1. Ambil Nama Penandatangan
    const signerLine = lines[signerIdx];
    const afterSignText = signerLine.replace("Ditandatangani secara elektronik", "").trim();

    if (afterSignText && !afterSignText.startsWith("(")) {
      data.header.penanda_tangan = afterSignText;
    } else {
      // Jika nama ada di baris berikutnya (kadang dalam kurung)
      data.header.penanda_tangan = lines[signerIdx + 1]?.replace(/[()]/g, "").trim() || "";
    }

    // 2. Cari Tanggal di sekitar area penandatangan (maksimal 4 baris sebelum/sesudah)
    const searchWindow = lines.slice(Math.max(0, signerIdx - 4), signerIdx + 4);
    const dateLine = searchWindow.find(
      (l) =>
        l.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/) ||
        l.match(
          /\d{1,2}\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}/i,
        ),
    );

    if (dateLine) {
      // Jika format "KOTA, DD Bulan YYYY", ambil bagian tanggalnya saja
      const parts = dateLine.split(",");
      if (parts.length > 1 && parts[1].match(/\d/)) {
        data.header.tanggal = parts[1].trim();
      } else {
        data.header.tanggal = dateLine.trim();
      }
    }
  }

  // Fallback jika tidak ditemukan di area footer
  if (!data.header.tanggal) {
    const tglLine = lines.find((l) => l.includes("Tanggal Faktur"));
    if (tglLine) {
      const parts = tglLine.split(":");
      if (parts.length > 1) data.header.tanggal = parts[1].trim();
    }
  }

  return data;
};

export const extractPdfTextLocal = async (file: File): Promise<string> => {
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items as { str: string }[]).map((item) => item.str);
    fullText += strings.join("\n") + "\n";
  }
  return fullText;
};
