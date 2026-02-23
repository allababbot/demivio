import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateDpp,
  calculateDppNilaiLain,
  calculatePpn,
  calculateAll,
  calculateTransactionPpn,
  validateTransaction,
  formatRupiah,
  formatNumber
} from './calculator';
import type { Transaction } from './types';

// Configure Decimal.js
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function tx(unitPrice: number, quantity: number, discount: number): Transaction {
  return {
    unitPrice: new Decimal(unitPrice),
    quantity: new Decimal(quantity),
    discount: new Decimal(discount),
  };
}

describe('calculateDpp', () => {
  it('should calculate DPP = unitPrice * quantity - discount', () => {
    const result = calculateDpp(tx(50000, 20, 15000));
    expect(result.toNumber()).toBe(985000);
  });

  it('should handle zero discount', () => {
    const result = calculateDpp(tx(10000, 5, 0));
    expect(result.toNumber()).toBe(50000);
  });

  it('should handle large numbers accurately', () => {
    const result = calculateDpp(tx(999999, 1000, 500000));
    expect(result.toNumber()).toBe(999499000);
  });
});

describe('calculateDppNilaiLain', () => {
  it('should calculate DPP Nilai Lain = DPP * 11/12', () => {
    const dpp = new Decimal(985000);
    const result = calculateDppNilaiLain(dpp);
    // 985000 * 11 / 12 = 902916.666...
    expect(result.toNumber()).toBeCloseTo(902916.6667, 2);
  });

  it('should handle zero', () => {
    const result = calculateDppNilaiLain(new Decimal(0));
    expect(result.toNumber()).toBe(0);
  });
});

describe('calculatePpn', () => {
  it('should calculate PPN = DPP Nilai Lain * 12%', () => {
    const dppNilaiLain = new Decimal(902916.6667);
    const result = calculatePpn(dppNilaiLain);
    // 902916.6667 * 0.12 = 108350.00...
    expect(result.toNumber()).toBeCloseTo(108350, 0);
  });
});

describe('calculateAll', () => {
  it('should return consistent DPP, DPP Nilai Lain, and PPN', () => {
    const transaction = tx(50000, 20, 15000);
    const result = calculateAll(transaction);

    expect(result.dpp.toNumber()).toBe(985000);
    expect(result.dppNilaiLain.toNumber()).toBeCloseTo(902916.6667, 2);
    // PPN = DPP * 11/12 * 12% = DPP * 11% = 985000 * 0.11 = 108350
    expect(result.ppn.toNumber()).toBeCloseTo(108350, 0);
  });

  it('PPN should equal DPP * 11% (effective rate)', () => {
    const transaction = tx(100000, 10, 0);
    const result = calculateAll(transaction);
    const dpp = result.dpp.toNumber();
    // Effective rate: DPP * 11/12 * 12% = DPP * 11%
    expect(result.ppn.toNumber()).toBeCloseTo(dpp * 0.11, 4);
  });
});

describe('calculateTransactionPpn', () => {
  it('should return same PPN as calculateAll', () => {
    const transaction = tx(50000, 20, 15000);
    const ppnDirect = calculateTransactionPpn(transaction);
    const ppnAll = calculateAll(transaction);
    expect(ppnDirect.eq(ppnAll.ppn)).toBe(true);
  });
});

describe('validateTransaction', () => {
  it('should accept valid transaction', () => {
    expect(validateTransaction(tx(50000, 20, 15000))).toBeNull();
  });

  it('should reject zero unit price', () => {
    expect(validateTransaction(tx(0, 20, 0))).not.toBeNull();
  });

  it('should reject negative unit price', () => {
    expect(validateTransaction(tx(-100, 20, 0))).not.toBeNull();
  });

  it('should reject zero quantity', () => {
    expect(validateTransaction(tx(50000, 0, 0))).not.toBeNull();
  });

  it('should reject negative discount', () => {
    expect(validateTransaction(tx(50000, 20, -100))).not.toBeNull();
  });

  it('should reject discount >= subtotal', () => {
    // subtotal = 50000 * 20 = 1000000
    expect(validateTransaction(tx(50000, 20, 1000000))).not.toBeNull();
    expect(validateTransaction(tx(50000, 20, 1500000))).not.toBeNull();
  });

  it('should accept discount less than subtotal', () => {
    expect(validateTransaction(tx(50000, 20, 999999))).toBeNull();
  });
});

describe('formatRupiah', () => {
  it('should format as Indonesian Rupiah', () => {
    const result = formatRupiah(50000);
    expect(result).toContain('50.000');
  });

  it('should handle Decimal input', () => {
    const result = formatRupiah(new Decimal(100000));
    expect(result).toContain('100.000');
  });
});

describe('formatNumber', () => {
  it('should format with thousand separators', () => {
    const result = formatNumber(1000000);
    expect(result).toBe('1.000.000');
  });

  it('should handle Decimal input', () => {
    const result = formatNumber(new Decimal(50000));
    expect(result).toBe('50.000');
  });
});
