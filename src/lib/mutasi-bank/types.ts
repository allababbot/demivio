export type SupportedBank = "BCA" | "BNI" | "BRI";
export type BankDetection = SupportedBank | "UNKNOWN";
export type MutationRowStatus = "match" | "mismatch" | "manual";

export interface MutationRow {
  keterangan: string;
  tanggal: string;
  debit: number;
  kredit: number;
  saldo: number;
  computedSaldo: number;
  status: MutationRowStatus;
}

export interface ParsedMutation {
  bank: SupportedBank;
  rows: MutationRow[];
  openingBalance: number;
  endingBalancePrinted?: number;
  needsOpeningBalance: boolean;
}

export interface ParseMutationOptions {
  openingBalance?: number;
}
