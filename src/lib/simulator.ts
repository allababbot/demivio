import Decimal from 'decimal.js';
import type { Transaction, SimulationConfig, SimulationResult, ResultMetadata } from './types';
import { calculateTransactionPpn, validateTransaction } from './calculator';

// PPN rate constant: 11/100 = 0.11
const PPN_RATE = new Decimal('0.11');

/**
 * Create a composite key for transaction deduplication (Option A)
 */
function createTransactionKey(unitPrice: Decimal, quantity: Decimal, discount: Decimal): string {
  return `${unitPrice.toFixed(2)}|${quantity.toString()}|${discount.toFixed(2)}`;
}

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
    discountDifference: transaction.discount.sub(reference.discount),
    dppNilaiLain: transaction.unitPrice.mul(transaction.quantity).sub(transaction.discount).mul(11).div(12)
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
 * Binary search to find optimal quantity range for a given discount (Option D)
 * Returns [minQty, maxQty] that produces PPN within tolerance of target
 */
function findOptimalQtyRange(
  targetPpn: Decimal,
  discount: Decimal,
  priceMin: Decimal,
  priceMax: Decimal,
  tolerance: Decimal,
  qtyMin: Decimal,
  qtyMax: Decimal
): [Decimal, Decimal] | null {
  // For a given discount and price range, find qty range that gives target PPN
  // PPN = (unitPrice * qty - discount) * 0.11
  // We need to find qty where calculated unitPrice is within [priceMin, priceMax]
  
  // Lower bound: unitPrice = priceMax (higher price = lower qty needed)
  // qty_min_for_target = (targetPpn / 0.11 + discount) / priceMax
  const qtyForMaxPrice = targetPpn.div(PPN_RATE).add(discount).div(priceMax);
  
  // Upper bound: unitPrice = priceMin (lower price = higher qty needed)  
  // qty_max_for_target = (targetPpn / 0.11 + discount) / priceMin
  const qtyForMinPrice = priceMin.gt(0) 
    ? targetPpn.div(PPN_RATE).add(discount).div(priceMin)
    : qtyMax;

  // Clamp to config range
  const effectiveMin = Decimal.max(qtyMin, qtyForMaxPrice.floor());
  const effectiveMax = Decimal.min(qtyMax, qtyForMinPrice.ceil());

  if (effectiveMin.gt(effectiveMax)) {
    return null; // No valid qty in range
  }

  return [effectiveMin, effectiveMax];
}

/**
 * Generate search order based on priority (Option D)
 * Start from reference values and expand outward
 * Optimized: Skip sorting when parameters are locked (single value)
 */
function* generatePriorityOrder(
  refQty: Decimal,
  qtyMin: Decimal,
  qtyMax: Decimal,
  qtyStep: Decimal,
  discountMin: Decimal,
  discountMax: Decimal,
  discountStep: Decimal
): Generator<[Decimal, Decimal]> {
  // Build qty values array
  const qtyValues: Decimal[] = [];
  for (let q = qtyMin; q.lte(qtyMax); q = q.add(qtyStep)) {
    qtyValues.push(q);
  }
  
  // Build discount values array
  const discountValues: Decimal[] = [];
  for (let d = discountMin; d.lte(discountMax); d = d.add(discountStep)) {
    discountValues.push(d);
  }

  // Only sort if there are multiple values (skip sorting for locked params)
  if (qtyValues.length > 1) {
    const qtyCenter = refQty.clamp(qtyMin, qtyMax);
    qtyValues.sort((a, b) => a.sub(qtyCenter).abs().cmp(b.sub(qtyCenter).abs()));
  }
  
  if (discountValues.length > 1) {
    const discountCenter = discountMin.add(discountMax).div(2);
    discountValues.sort((a, b) => a.sub(discountCenter).abs().cmp(b.sub(discountCenter).abs()));
  }

  // Yield in priority order (closer to center first)
  for (const qty of qtyValues) {
    for (const discount of discountValues) {
      yield [qty, discount];
    }
  }
}

/**
 * Estimate number of combinations (for math approach: qty × discount only)
 */
export function estimateCombinations(config: SimulationConfig): number {
  const discountCount = config.discountMax.sub(config.discountMin).div(config.discountStep).floor().toNumber() + 1;
  const quantityCount = config.quantityMax.sub(config.quantityMin).div(config.quantityStep).floor().toNumber() + 1;

  return discountCount * quantityCount;
}

/**
 * Run optimized simulation with all improvements:
 * - Option A: Set-based deduplication (O(1) lookup)
 * - Option C: Early termination when enough perfect results found
 * - Option D: Priority-based search order + binary search optimization
 */
export function runSimulation(
  config: SimulationConfig,
  onProgress?: (progress: number) => void
): SimulationResult[] {
  const results: SimulationResult[] = [];
  const seen = new Set<string>(); // Option A: O(1) deduplication
  
  // Get ranges
  const priceMin = config.priceMin;
  const priceMax = config.priceMax;
  const discountMin = config.discountMin;
  const discountMax = config.discountMax;
  
  let count = 0;
  let perfectCount = 0; // Count of results with ppnDifference = 0
  const totalEstimate = estimateCombinations(config);
  
  // Detect locked parameters (single value in range)
  const qtyLocked = config.quantityMin.eq(config.quantityMax);
  const discountLocked = discountMin.eq(discountMax);
  const priceLocked = priceMin.eq(priceMax);
  
  // Use smart order only for large searches where multiple dimensions vary
  // Skip smart order if any dimension is locked (simpler iteration is faster)
  const shouldUseSmartOrder = totalEstimate > 10000 && !qtyLocked && !discountLocked;

  // Option D: Use priority-based iteration for large searches
  const iterator = shouldUseSmartOrder
    ? generatePriorityOrder(
        config.referenceTransaction.quantity,
        config.quantityMin,
        config.quantityMax,
        config.quantityStep,
        discountMin,
        discountMax,
        config.discountStep
      )
    : null;

  // Standard iteration for smaller searches, priority for larger
  const processQtyDiscount = (quantity: Decimal, discount: Decimal): boolean => {
    // Option D: Binary search optimization - skip if no valid price in range
    const optimalRange = findOptimalQtyRange(
      config.targetPpn,
      discount,
      priceMin,
      priceMax,
      config.tolerance,
      config.quantityMin,
      config.quantityMax
    );
    
    // If this qty is far from the optimal range, skip entirely
    if (optimalRange && (quantity.lt(optimalRange[0].sub(5)) || quantity.gt(optimalRange[1].add(5)))) {
      return false; // Skip this combination
    }

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

      // Option A: Fast duplicate check using Set
      const key = createTransactionKey(unitPrice, quantity, discount);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

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
        results.push(result);
        
        // Track perfect matches for early termination
        if (result.ppnDifference.isZero()) {
          perfectCount++;
        }
      }
    }

    return true;
  };

  if (iterator) {
    // Option D: Priority-based iteration
    for (const [quantity, discount] of iterator) {
      processQtyDiscount(quantity, discount);
      count++;

      // Option C: Early termination
      if (perfectCount >= config.topNResults) {
        break;
      }

      if (onProgress && count % 1000 === 0) {
        onProgress(Math.min(count / totalEstimate, 0.99));
      }
    }
  } else {
    // Standard iteration for small searches
    for (
      let quantity = config.quantityMin;
      quantity.lte(config.quantityMax);
      quantity = quantity.add(config.quantityStep)
    ) {
      // Option C: Early termination
      if (perfectCount >= config.topNResults) {
        break;
      }

      for (
        let discount = discountMin;
        discount.lte(discountMax);
        discount = discount.add(config.discountStep)
      ) {
        processQtyDiscount(quantity, discount);
        count++;

        if (onProgress && count % 1000 === 0) {
          onProgress(Math.min(count / totalEstimate, 0.99));
        }
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

  // With optimizations, we can handle much larger search spaces
  const estimate = estimateCombinations(config);
  if (estimate > 1_000_000_000) {
    return `Ruang pencarian terlalu besar (${estimate.toLocaleString()} kombinasi). Kurangi range atau perbesar step.`;
  }

  return null;
}
