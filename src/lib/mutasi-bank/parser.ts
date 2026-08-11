import type { BankDetection, MutationRow, ParsedMutation, ParseMutationOptions } from "./types";

const BALANCE_TOLERANCE = 0.5;

export function detectBank(text: string): BankDetection {
  const head = text.slice(0, 2000);
  if (head.includes("Tanggal Transaksi") && head.includes("Keterangan")) return "BCA";
  if (head.includes("Post Date") && head.includes("Journal No.")) return "BNI";
  if (head.includes("SALDO_AWAL_MUTASI")) return "BRI";
  return "UNKNOWN";
}

export function parseBankMutation(text: string, options: ParseMutationOptions = {}): ParsedMutation {
  const bank = detectBank(text);
  if (bank === "BCA") return parseBca(text);
  if (bank === "BNI") return parseBni(text, options.openingBalance ?? 0);
  if (bank === "BRI") return parseBri(text);
  throw new Error("Format mutasi bank belum dikenali. Gunakan file mutasi BCA, BNI, atau BRI.");
}

export function preprocessCsvText(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
        if (/,""[^,]/.test(trimmed)) {
          const inner = trimmed.slice(1, -1);
          return inner.replace(/""/g, '"');
        }
      }
      return line;
    })
    .join("\n");
}

export function parseCsv(text: string): string[][] {
  const cleanedText = preprocessCsvText(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    if (inQuotes) {
      if (char === '"') {
        if (cleanedText[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function parseAmount(value: unknown): number {
  if (value == null) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const withoutCurrency = raw.replace(/[^0-9,.-]/g, "");
  const lastComma = withoutCurrency.lastIndexOf(",");
  const lastDot = withoutCurrency.lastIndexOf(".");
  let normalized = withoutCurrency;

  if (lastComma > lastDot) {
    normalized = withoutCurrency.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = withoutCurrency.replace(/,/g, "");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBca(text: string): ParsedMutation {
  const rows = parseCsv(text);
  let year = "2000";
  let openingBalance = 0;
  let endingBalancePrinted: number | undefined;
  let headerIndex = -1;

  rows.forEach((row, index) => {
    const first = row[0]?.trim() ?? "";
    const fullLine = row.join(",").trim();
    if (fullLine.startsWith("Periode")) {
      const match = fullLine.match(/\d{2}\/\d{2}\/(\d{4})/);
      if (match) year = match[1];
    }
    if (first === "Tanggal Transaksi" && row[1]?.trim() === "Keterangan") headerIndex = index;
    if (fullLine.startsWith("Saldo Awal")) openingBalance = parseAmount(fullLine.split(":").slice(1).join(":"));
    if (fullLine.startsWith("Saldo Akhir")) endingBalancePrinted = parseAmount(fullLine.split(":").slice(1).join(":"));
  });

  if (headerIndex === -1) throw new Error("Kolom transaksi BCA tidak ditemukan.");

  const header = rows[headerIndex];
  const columnIndex = (name: string) => header.findIndex((cell) => cell.trim().toLowerCase() === name);
  const keteranganIndex = columnIndex("keterangan");
  const jumlahIndex = columnIndex("jumlah");
  const saldoIndex = columnIndex("saldo");
  const hasColumns = keteranganIndex >= 0 && jumlahIndex >= 0 && saldoIndex >= 0;

  const normalizedRows: MutationRow[] = [];
  let previousBalance = openingBalance;

  for (const row of rows.slice(headerIndex + 1)) {
    const date = row[0]?.trim();
    if (!date || date.startsWith("Saldo") || date.startsWith("Mutasi")) continue;

    // Prefer reading columns directly: quoted exports parse to one field per
    // column, so the CBG (Cabang) values stay out of the amount even when the
    // description contains commas. Unquoted exports can't be split reliably, so
    // fall back to matching the reconstructed line as a whole.
    const useColumns = hasColumns && row.length === header.length;
    const amountCell = useColumns ? (row[jumlahIndex] ?? "").trim() : undefined;
    const amountMatch = amountCell ? amountCell.match(/^(.*)\s+(DB|CR)$/i) : undefined;

    let keterangan: string;
    let amount: number;
    let isDebit: boolean;
    let saldo: number;

    if (amountMatch) {
      keterangan = (row[keteranganIndex] ?? "").trim();
      amount = parseAmount(amountMatch[1]);
      isDebit = amountMatch[2].toUpperCase() === "DB";
      saldo = parseAmount(row[saldoIndex]);
    } else {
      const line = row.join(",").trim();
      const legacyMatch = line.match(/^([^,]+),([^,]*),([^,]*),(.+?)\s+(DB|CR),(.+)$/i);
      if (!legacyMatch) continue;
      keterangan = legacyMatch[2].trim();
      amount = parseAmount(legacyMatch[4]);
      isDebit = legacyMatch[5].toUpperCase() === "DB";
      saldo = parseAmount(legacyMatch[6]);
    }

    const debit = isDebit ? amount : 0;
    const kredit = isDebit ? 0 : amount;
    const computedSaldo = previousBalance + kredit - debit;

    normalizedRows.push({
      keterangan,
      tanggal: formatBcaDate(date, year),
      debit,
      kredit,
      saldo,
      computedSaldo,
      status: isBalanceMatch(computedSaldo, saldo) ? "match" : "mismatch",
    });
    previousBalance = saldo;
  }

  return { bank: "BCA", rows: normalizedRows, openingBalance, endingBalancePrinted, needsOpeningBalance: false };
}

function parseBni(text: string, openingBalance: number): ParsedMutation {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => row[0]?.trim() === "Post Date");
  if (headerIndex === -1) throw new Error("Kolom transaksi BNI tidak ditemukan.");

  const normalizedRows: MutationRow[] = [];
  let saldo = openingBalance;

  for (const row of rows.slice(headerIndex + 1)) {
    if (!row[0]?.trim()) continue;
    const debit = parseAmount(row[5]);
    const kredit = parseAmount(row[6]);
    saldo = saldo + kredit - debit;
    normalizedRows.push({
      keterangan: (row[4] ?? "").trim(),
      tanggal: formatSlashDate(row[0] ?? ""),
      debit,
      kredit,
      saldo,
      computedSaldo: saldo,
      status: "manual",
    });
  }

  return { bank: "BNI", rows: normalizedRows, openingBalance, needsOpeningBalance: true };
}

function parseBri(text: string): ParsedMutation {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => row[0]?.trim() === "ID");
  if (headerIndex === -1) throw new Error("Kolom transaksi BRI tidak ditemukan.");

  const header = rows[headerIndex];
  const columnIndex = (name: string) => header.findIndex((cell) => cell.trim().toLowerCase() === name);

  const tglIdx = columnIndex("tgl_transaksi") >= 0 ? columnIndex("tgl_transaksi") : 2;
  const deskripsiIdx = columnIndex("deskripsi") >= 0 ? columnIndex("deskripsi") : 6;
  const saldoAwalIdx = columnIndex("saldo_awal") >= 0 ? columnIndex("saldo_awal") : 7;
  const debetIdx = columnIndex("debet") >= 0 ? columnIndex("debet") : 8;
  const kreditIdx = columnIndex("kredit") >= 0 ? columnIndex("kredit") : 9;
  const saldoAkhirIdx = columnIndex("saldo_akhir") >= 0 ? columnIndex("saldo_akhir") : 10;
  const remarkCustomIdx = columnIndex("remark_custom") >= 0 ? columnIndex("remark_custom") : 18;

  const normalizedRows: MutationRow[] = [];
  let previousEndingBalance: number | null = null;
  let openingBalance = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    if (!row[0]?.trim()) continue;
    const rowOpeningBalance = parseAmount(row[saldoAwalIdx]);
    const debit = parseAmount(row[debetIdx]);
    const kredit = parseAmount(row[kreditIdx]);
    const saldo = parseAmount(row[saldoAkhirIdx]);
    const computedSaldo = rowOpeningBalance + kredit - debit;
    const amountMatches = isBalanceMatch(computedSaldo, saldo);
    const continuityMatches = previousEndingBalance == null || isBalanceMatch(rowOpeningBalance, previousEndingBalance);

    if (normalizedRows.length === 0) openingBalance = rowOpeningBalance;

    const keterangan = (row[remarkCustomIdx]?.trim() || row[deskripsiIdx] || "").trim();

    normalizedRows.push({
      keterangan,
      tanggal: formatIsoDate(row[tglIdx] ?? ""),
      debit,
      kredit,
      saldo,
      computedSaldo,
      status: amountMatches && continuityMatches ? "match" : "mismatch",
    });
    previousEndingBalance = saldo;
  }

  return { bank: "BRI", rows: normalizedRows, openingBalance, needsOpeningBalance: false };
}

function formatBcaDate(raw: string, year: string): string {
  const [day = "", month = ""] = raw.split("/");
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

function formatSlashDate(raw: string): string {
  const [datePart] = raw.trim().split(/\s+/);
  const [day = "", month = "", yearRaw = ""] = datePart.split("/");
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

function formatIsoDate(raw: string): string {
  const [datePart] = raw.trim().split(/\s+/);
  const [year = "", month = "", day = ""] = datePart.split("-");
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

function isBalanceMatch(left: number, right: number): boolean {
  return Math.abs(left - right) < BALANCE_TOLERANCE;
}



