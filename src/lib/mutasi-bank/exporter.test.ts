import { describe, expect, test } from "vitest";
import * as XLSX from "xlsx";
import { createCombinedMutationWorkbook, createMutationWorkbook, safeSheetName } from "./exporter";
import type { ParsedMutation } from "./types";

const parsed: ParsedMutation = {
  bank: "BCA",
  openingBalance: 1000000,
  endingBalancePrinted: 1200000,
  needsOpeningBalance: false,
  rows: [
    {
      keterangan: "TRANSFER MASUK",
      tanggal: "01/05/2026",
      debit: 0,
      kredit: 250000,
      saldo: 1250000,
      computedSaldo: 1250000,
      status: "match",
    },
  ],
};

describe("safeSheetName", () => {
  test("removes invalid characters and limits Excel sheet names", () => {
    expect(safeSheetName("BCA laporan [utama] / Mei 2026 yang sangat panjang")).toBe("BCA laporan utama  Mei 2026 yan");
  });
});

describe("createMutationWorkbook", () => {
  test("creates a formatted workbook for one parsed file", () => {
    const workbook = createMutationWorkbook(parsed, "rekening-bca.csv");
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    expect(workbook.SheetNames).toEqual(["BCA rekening-bca"]);
    expect(rows[0]).toEqual(["KETERANGAN", "TANGGAL", "DEBIT", "KREDIT", "SALDO", "STATUS"]);
    expect(rows[1]).toEqual(["TRANSFER MASUK", "01/05/2026", 0, 250000, 1250000, "Cocok"]);
    expect(sheet["!cols"]?.map((col) => col.wch)).toEqual([36, 14, 16, 16, 16, 14]);
  });
});

describe("createCombinedMutationWorkbook", () => {
  test("creates one sheet per source and a combined sheet", () => {
    const workbook = createCombinedMutationWorkbook([
      { fileName: "rekening-bca.csv", parsed },
      { fileName: "rekening-bni.csv", parsed: { ...parsed, bank: "BNI", needsOpeningBalance: true } },
    ]);

    expect(workbook.SheetNames).toEqual(["Gabungan", "BCA rekening-bca", "BNI rekening-bni"]);
    const combinedRows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets.Gabungan, { header: 1 });
    expect(combinedRows[0]).toEqual(["BANK", "FILE", "KETERANGAN", "TANGGAL", "DEBIT", "KREDIT", "SALDO", "STATUS"]);
    expect(combinedRows).toHaveLength(3);
  });
});
