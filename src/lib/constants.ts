import Decimal from 'decimal.js';

/**
 * PPN Rate Constants
 * 
 * Formula: PPN = DPP × (11/12) × 12% = DPP × 11%
 * 
 * Centralized here so any rate change only requires updating one file.
 */

/** Numerator for DPP Nilai Lain ratio */
export const PPN_RATIO_NUMERATOR = new Decimal(11);

/** Denominator for DPP Nilai Lain ratio */
export const PPN_RATIO_DENOMINATOR = new Decimal(12);

/** PPN tax rate percentage */
export const PPN_RATE_PERCENT = new Decimal('0.12');

/** Effective PPN rate (11/12 × 12% = 11%) */
export const PPN_EFFECTIVE_RATE = new Decimal('0.11');
