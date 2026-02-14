import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface HumanScore {
  accuracy: number;
  label: string;
  color: string;
}

/**
 * Represents a single transaction
 */
export interface Transaction {
  unitPrice: Decimal;
  quantity: Decimal;
  discount: Decimal;
}

/**
 * Configuration for simulation
 */
export interface SimulationConfig {
  referenceTransaction: Transaction;
  targetPpn: Decimal;
  tolerance: Decimal;
  priceMin: Decimal;
  priceMax: Decimal;
  discountMin: Decimal;
  discountMax: Decimal;
  quantityMin: Decimal;
  quantityMax: Decimal;
  quantityStep: Decimal;
  priceStep: Decimal;
  discountStep: Decimal;
  alpha: Decimal;
  beta: Decimal;
  topNResults: number;
}

/**
 * Result metadata
 */
export interface ResultMetadata {
  ppnDifferencePercent: Decimal;
  unitPriceDifference: Decimal;
  quantityDifference: Decimal;
  discountDifference: Decimal;
  dppNilaiLain: Decimal;
}

/**
 * Simulation result
 */
export interface SimulationResult {
  transaction: Transaction;
  calculatedPpn: Decimal;
  ppnDifference: Decimal;
  score: Decimal;
  humanScore: HumanScore;
  metadata: ResultMetadata;
}

/**
 * Calculation breakdown
 */
export interface CalculationBreakdown {
  dpp: Decimal;
  dppNilaiLain: Decimal;
  ppn: Decimal;
}

/**
 * Default simulation config
 */
export function getDefaultConfig(): SimulationConfig {
  return {
    referenceTransaction: {
      unitPrice: new Decimal(0),
      quantity: new Decimal(0),
      discount: new Decimal(0)
    },
    targetPpn: new Decimal(0),
    tolerance: new Decimal(1000),
    priceMin: new Decimal(0),
    priceMax: new Decimal(1000000),
    discountMin: new Decimal(0),
    discountMax: new Decimal(1000000),
    quantityMin: new Decimal(1),
    quantityMax: new Decimal(1000),
    quantityStep: new Decimal(1),
    priceStep: new Decimal(100),
    discountStep: new Decimal(100),
    alpha: new Decimal(1),
    beta: new Decimal(1),
    topNResults: 10
  };
}

/**
 * Create a transaction from numbers
 */
export function createTransaction(
  unitPrice: number,
  quantity: number,
  discount: number
): Transaction {
  return {
    unitPrice: new Decimal(unitPrice),
    quantity: new Decimal(quantity),
    discount: new Decimal(discount)
  };
}
