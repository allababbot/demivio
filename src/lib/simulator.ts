import Decimal from 'decimal.js';
import type { Transaction, SimulationConfig, SimulationResult, ResultMetadata } from './types';
import { calculateTransactionPpn, validateTransaction } from './calculator';

// PPN rate constant: 11/100 = 0.11
const PPN_RATE = new Decimal('0.11');

/**
 * Create a simulation result with calculated metrics
 */
function createResult(
  transaction: Transaction,
  targetPpn: Decimal,
  reference: Transaction,
  alpha: Decimal,
  beta: Decimal
): SimulationResult {
  const calculatedPpn = calculateTransactionPpn(transaction);
  const ppnDifference = calculatedPpn.sub(targetPpn).abs();

  // Calculate score: smaller is better
  const score = ppnDifference
    .add(alpha.mul(transaction.unitPrice.sub(reference.unitPrice).abs()))
    .add(beta.mul(transaction.discount.sub(reference.discount).abs()));

  const metadata: ResultMetadata = {
    ppnDifferencePercent: targetPpn.isZero()
      ? new Decimal(0)
      : ppnDifference.div(targetPpn).mul(100),
    unitPriceDifference: transaction.unitPrice.sub(reference.unitPrice),
    quantityDifference: transaction.quantity.sub(reference.quantity),
    discountDifference: transaction.discount.sub(reference.discount)
  };

  return {
    transaction,
    calculatedPpn,
    ppnDifference,
    score,
    metadata
  };
}

/**
 * Get price range based on variance
 */
function getPriceRange(config: SimulationConfig): [Decimal, Decimal] {
  const variance = config.referenceTransaction.unitPrice
    .mul(config.unitPriceVariancePercent)
    .div(100);
  return [
    config.referenceTransaction.unitPrice.sub(variance),
    config.referenceTransaction.unitPrice.add(variance)
  ];
}

/**
 * Get discount range based on variance
 */
function getDiscountRange(config: SimulationConfig): [Decimal, Decimal] {
  const variance = config.referenceTransaction.discount
    .mul(config.discountVariancePercent)
    .div(100);
  return [
    Decimal.max(config.referenceTransaction.discount.sub(variance), 0),
    config.referenceTransaction.discount.add(variance)
  ];
}

/**
 * Estimate number of combinations (for math approach: qty × discount only)
 */
export function estimateCombinations(config: SimulationConfig): number {
  const [discountMin, discountMax] = getDiscountRange(config);

  const discountCount = discountMax.sub(discountMin).div(config.discountStep).floor().toNumber() + 1;
  const quantityCount = config.quantityMax.sub(config.quantityMin).div(config.quantityStep).floor().toNumber() + 1;

  return discountCount * quantityCount;
}

/**
 * Calculate exact unit price needed for target PPN
 * Formula: unitPrice = (targetPpn / 0.11 + discount) / quantity
 */
function calculateRequiredUnitPrice(
  targetPpn: Decimal,
  quantity: Decimal,
  discount: Decimal
): Decimal {
  const requiredDPP = targetPpn.div(PPN_RATE);
  return requiredDPP.add(discount).div(quantity);
}

/**
 * Round to nearest step value
 */
function roundToStep(value: Decimal, step: Decimal): Decimal {
  return value.div(step).round().mul(step);
}

/**
 * Run simulation using mathematical approach
 * Instead of brute-force, we calculate exact unitPrice for each (qty, discount) pair
 */
export function runSimulation(
  config: SimulationConfig,
  onProgress?: (progress: number) => void
): SimulationResult[] {
  const results: SimulationResult[] = [];
  
  // Get ranges
  const [priceMin, priceMax] = getPriceRange(config);
  const [discountMin, discountMax] = getDiscountRange(config);
  
  let count = 0;
  const totalEstimate = estimateCombinations(config);

  // Iterate through quantity and discount only
  // unitPrice is calculated mathematically
  for (
    let quantity = config.quantityMin;
    quantity.lte(config.quantityMax);
    quantity = quantity.add(config.quantityStep)
  ) {
    for (
      let discount = discountMin;
      discount.lte(discountMax);
      discount = discount.add(config.discountStep)
    ) {
      // Calculate exact unitPrice for target PPN
      const exactUnitPrice = calculateRequiredUnitPrice(
        config.targetPpn,
        quantity,
        discount
      );

      // Round to priceStep for practical values
      const roundedUnitPrice = roundToStep(exactUnitPrice, config.priceStep);

      // Process both exact and rounded values
      const pricesToTry = [exactUnitPrice];
      if (!roundedUnitPrice.eq(exactUnitPrice)) {
        pricesToTry.push(roundedUnitPrice);
        // Also try adjacent rounded values
        pricesToTry.push(roundedUnitPrice.add(config.priceStep));
        pricesToTry.push(roundedUnitPrice.sub(config.priceStep));
      }

      for (const unitPrice of pricesToTry) {
        // Check if unitPrice is within variance range
        if (unitPrice.lt(priceMin) || unitPrice.gt(priceMax)) {
          continue;
        }

        // Skip negative or zero prices
        if (unitPrice.lte(0)) {
          continue;
        }

        const transaction: Transaction = {
          unitPrice,
          quantity,
          discount
        };

        // Validate transaction
        if (validateTransaction(transaction) !== null) {
          continue;
        }

        const result = createResult(
          transaction,
          config.targetPpn,
          config.referenceTransaction,
          config.alpha,
          config.beta
        );

        // Filter by tolerance
        if (result.ppnDifference.lte(config.tolerance)) {
          // Avoid duplicates (check by score since exact duplicates would have same score)
          const isDuplicate = results.some(r => 
            r.transaction.unitPrice.eq(transaction.unitPrice) &&
            r.transaction.quantity.eq(transaction.quantity) &&
            r.transaction.discount.eq(transaction.discount)
          );

          if (!isDuplicate) {
            results.push(result);
          }
        }
      }

      count++;
      if (onProgress && count % 1000 === 0) {
        onProgress(Math.min(count / totalEstimate, 1));
      }
    }
  }

  if (onProgress) {
    onProgress(1);
  }

  // Sort by score (ascending) and take top N
  results.sort((a, b) => a.score.cmp(b.score));
  return results.slice(0, config.topNResults);
}

/**
 * Validate simulation config
 */
export function validateConfig(config: SimulationConfig): string | null {
  const txError = validateTransaction(config.referenceTransaction);
  if (txError) return `Transaksi acuan: ${txError}`;

  if (config.targetPpn.lte(0)) {
    return 'Target PPN harus positif';
  }
  if (config.tolerance.lt(0)) {
    return 'Toleransi tidak boleh negatif';
  }
  if (config.quantityMin.lte(0)) {
    return 'Kuantitas minimum harus positif';
  }
  if (config.quantityMin.gt(config.quantityMax)) {
    return 'Kuantitas minimum > maksimum';
  }
  if (config.quantityStep.lte(0)) {
    return 'Step kuantitas harus positif';
  }

  // Check if search space is too large (now much more lenient since we use math approach)
  const estimate = estimateCombinations(config);
  if (estimate > 100_000_000) {
    return `Ruang pencarian terlalu besar (${estimate.toLocaleString()} kombinasi). Kurangi range atau perbesar step.`;
  }

  return null;
}
