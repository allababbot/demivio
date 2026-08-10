import * as XLSX from "xlsx";
import type { MutationRow, ParsedMutation } from "./types";

export interface MutationWorkbookSource {
  fileName: string;
  parsed: ParsedMutation;
}

const BASE_HEADERS = ["KETERANGAN", "TANGGAL", "DEBIT", "KREDIT", "SALDO", "STATUS"];
const COMBINED_HEADERS = ["BANK", "FILE", ...BASE_HEADERS];
const COLUMN_WIDTHS = [36, 14, 16, 16, 16, 14];
const COMBINED_COLUMN_WIDTHS = [10, 28, ...COLUMN_WIDTHS];

export function safeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*:[\]]/g, "").trim() || "Sheet";
  return cleaned.slice(0, 31);
}

export function createMutationWorkbook(parsed: ParsedMutation, fileName: string): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, createMutationSheet(parsed.rows), sheetNameFor(parsed, fileName));
  return workbook;
}

export function createCombinedMutationWorkbook(sources: MutationWorkbookSource[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const combinedRows = [
    COMBINED_HEADERS,
    ...sources.flatMap(({ fileName, parsed }) =>
      parsed.rows.map((row) => [parsed.bank, fileName, ...mutationRowToCells(row)]),
    ),
  ];
  const combinedSheet = XLSX.utils.aoa_to_sheet(combinedRows);
  combinedSheet["!cols"] = COMBINED_COLUMN_WIDTHS.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, combinedSheet, "Gabungan");

  for (const source of sources) {
    XLSX.utils.book_append_sheet(workbook, createMutationSheet(source.parsed.rows), sheetNameFor(source.parsed, source.fileName));
  }

  return workbook;
}

export function mutationFileName(fileName: string, suffix = "mutasi-bank"): string {
  return `${baseFileName(fileName)}_${suffix}.xlsx`;
}

function createMutationSheet(rows: MutationRow[]): XLSX.WorkSheet {
  const worksheet = XLSX.utils.aoa_to_sheet([BASE_HEADERS, ...rows.map(mutationRowToCells)]);
  worksheet["!cols"] = COLUMN_WIDTHS.map((wch) => ({ wch }));
  return worksheet;
}

function mutationRowToCells(row: MutationRow): Array<string | number> {
  return [row.keterangan, row.tanggal, row.debit, row.kredit, row.saldo, statusLabel(row.status)];
}

function statusLabel(status: MutationRow["status"]): string {
  if (status === "match") return "Cocok";
  if (status === "mismatch") return "Selisih";
  return "Manual";
}

function sheetNameFor(parsed: ParsedMutation, fileName: string): string {
  return safeSheetName(`${parsed.bank} ${baseFileName(fileName)}`);
}

function baseFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}
