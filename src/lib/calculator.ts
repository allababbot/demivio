import Decimal from 'decimal.js';
import type { Transaction, CalculationBreakdown } from './types';
import { PPN_RATIO_NUMERATOR, PPN_RATIO_DENOMINATOR, PPN_RATE_PERCENT } from './constants';

/**
 * Calculate DPP (Dasar Pengenaan Pajak)
 * DPP = (unit_price × quantity) - discount
 */
export function calculateDpp(transaction: Transaction): Decimal {
  return transaction.unitPrice.mul(transaction.quantity).sub(transaction.discount);
}

/**
 * Calculate DPP Nilai Lain
 * DPP Nilai Lain = DPP × 11/12
 */
export function calculateDppNilaiLain(dpp: Decimal): Decimal {
  return dpp.mul(PPN_RATIO_NUMERATOR).div(PPN_RATIO_DENOMINATOR);
}

/**
 * Calculate PPN
 * PPN = DPP Nilai Lain × 12%
 */
export function calculatePpn(dppNilaiLain: Decimal): Decimal {
  return dppNilaiLain.mul(PPN_RATE_PERCENT);
}

/**
 * Calculate all PPN components from a transaction
 */
export function calculateAll(transaction: Transaction): CalculationBreakdown {
  const dpp = calculateDpp(transaction);
  const dppNilaiLain = calculateDppNilaiLain(dpp);
  const ppn = calculatePpn(dppNilaiLain);

  return { dpp, dppNilaiLain, ppn };
}

/**
 * Calculate PPN directly from a transaction
 */
export function calculateTransactionPpn(transaction: Transaction): Decimal {
  const dpp = calculateDpp(transaction);
  const dppNilaiLain = calculateDppNilaiLain(dpp);
  return calculatePpn(dppNilaiLain);
}

/**
 * Validate a transaction
 */
export function validateTransaction(transaction: Transaction): string | null {
  if (transaction.unitPrice.isNaN() || transaction.quantity.isNaN() || transaction.discount.isNaN()) {
    return 'Input tidak valid (Bukan Angka)';
  }
  if (transaction.unitPrice.lte(0)) {
    return 'Harga satuan harus positif';
  }
  if (transaction.quantity.lte(0)) {
    return 'Kuantitas harus positif';
  }
  if (transaction.discount.lt(0)) {
    return 'Potongan tidak boleh negatif';
  }
  const subtotal = transaction.unitPrice.mul(transaction.quantity);
  if (transaction.discount.gte(subtotal)) {
    return 'Potongan tidak boleh >= subtotal';
  }
  return null;
}

/**
 * Format number as Indonesian Rupiah
 */
export function formatRupiah(value: Decimal | number): string {
  const num = value instanceof Decimal ? value.toNumber() : value;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: Decimal | number): string {
  const num = value instanceof Decimal ? value.toNumber() : value;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}
