import Decimal from 'decimal.js';
import type { Transaction, SimulationConfig, SimulationResult, ResultMetadata, HumanScore } from './types';
import { calculateTransactionPpn, validateTransaction } from './calculator';
import { PPN_EFFECTIVE_RATE } from './constants';

function createTransactionKey(unitPrice: Decimal, quantity: Decimal, discount: Decimal): string {
  return `${unitPrice.toString()}|${quantity.toString()}|${discount.toString()}`;
}

/**
 * Calculate a human-readable quality score from simulation results.
 *
 * Weights:
 *   - PPN accuracy    : 60%  (primary objective)
 *   - Price similarity : 15%  (how close to reference price)
 *   - Qty similarity   : 10%  (how close to reference qty)
 *   - Discount sim.    : 15%  (how close to reference discount)
 *
 * Each factor uses a diminishing-returns curve: score = 1 / (1 + k * |diff%|)
 * This gives granular scores (e.g. 93.4%) instead of arbitrary step functions.
 */
function calculateHumanScore(
  result: { transaction: Transaction; ppnDifference: Decimal; metadata: ResultMetadata }
): HumanScore {
  const meta = result.metadata;

  // --- Factor 1: PPN Accuracy (60% weight) ---
  // ppnDifferencePercent is already 0..100 range
  const ppnDiffPct = meta.ppnDifferencePercent.toNumber();
  // k=5: 1% diff → 95.2 score, 2% → 90.9, 5% → 80, 10% → 66.7
  const ppnScore = 100 / (1 + 5 * ppnDiffPct / 100);

  // --- Factor 2: Price Similarity (15% weight) ---
  const priceAbsDiff = meta.unitPriceDifference.abs().toNumber();
  const priceRef = Math.max(1, result.transaction.unitPrice.sub(meta.unitPriceDifference).toNumber());
  // k=15: 1% diff -> 86.9, 5% -> 57.1, 10% -> 40
  const pricePct = priceAbsDiff / priceRef * 100;
  const priceScore = 100 / (1 + 0.15 * pricePct);

  // --- Factor 3: Quantity Similarity (10% weight) ---
  const qtyAbsDiff = meta.quantityDifference.abs().toNumber();
  const qtyRef = Math.max(1, result.transaction.quantity.sub(meta.quantityDifference).toNumber());
  const qtyPct = qtyAbsDiff / qtyRef * 100;
  const qtyScore = 100 / (1 + 0.15 * qtyPct);

  // --- Factor 4: Discount Similarity (15% weight) ---
  const discAbsDiff = meta.discountDifference.abs().toNumber();
  const discRef = Math.max(1, result.transaction.discount.sub(meta.discountDifference).toNumber());
  const discPct = discAbsDiff / discRef * 100;
  const discScore = 100 / (1 + 0.15 * discPct);

  // --- Weighted composite ---
  const composite =
    ppnScore * 0.60 +
    priceScore * 0.15 +
    qtyScore * 0.10 +
    discScore * 0.15;

  // Clamp to [0, 100] and keep one decimal for granularity
  const accuracy = Math.max(0, Math.min(100, Math.round(composite * 10) / 10));

  // --- Label & Color ---
  let label: string;
  let color: string;

  if (accuracy >= 99) {
    label = "Sempurna";
    color = "#059669"; // emerald-600
  } else if (accuracy >= 95) {
    label = "Hampir Sama";
    color = "#10b981"; // emerald-500
  } else if (accuracy >= 90) {
    label = "Sangat Mirip";
    color = "#3b82f6"; // blue-500
  } else if (accuracy >= 80) {
    label = "Mirip";
    color = "#6366f1"; // indigo-500
  } else if (accuracy >= 70) {
    label = "Cukup";
    color = "#f59e0b"; // amber-500
  } else if (accuracy >= 50) {
    label = "Kurang";
    color = "#f97316"; // orange-500
  } else {
    label = "Jauh";
    color = "#ef4444"; // red-500
  }

  return { accuracy, label, color };
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
    .add(beta.mul(transaction.discount.sub(reference.discount).abs()))
    .add(transaction.quantity.sub(reference.quantity).abs());

  const metadata: ResultMetadata = {
    ppnDifferencePercent: targetPpn.isZero()
      ? new Decimal(0)
      : ppnDifference.div(targetPpn).mul(100),
    unitPriceDifference: transaction.unitPrice.sub(reference.unitPrice),
    quantityDifference: transaction.quantity.sub(reference.quantity),
    discountDifference: transaction.discount.sub(reference.discount),
    dppNilaiLain: transaction.unitPrice.mul(transaction.quantity).sub(transaction.discount).mul(11).div(12)
  };

  const res = {
    transaction,
    calculatedPpn,
    ppnDifference,
    score,
    metadata
  };

  return {
    ...res,
    humanScore: calculateHumanScore(res)
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
  const requiredDPP = targetPpn.div(PPN_EFFECTIVE_RATE);
  return requiredDPP.add(discount).div(quantity);
}

/**
 * Calculate exact discount needed for target PPN
 * Formula: discount = (unitPrice * quantity) - (targetPpn / 0.11)
 */
function calculateRequiredDiscount(
  targetPpn: Decimal,
  unitPrice: Decimal,
  quantity: Decimal
): Decimal {
  const requiredDPP = targetPpn.div(PPN_EFFECTIVE_RATE);
  return unitPrice.mul(quantity).sub(requiredDPP);
}

/**
 * Calculate exact quantity needed for target PPN
 * Formula: quantity = (targetPpn / 0.11 + discount) / unitPrice
 */
function calculateRequiredQuantity(
  targetPpn: Decimal,
  unitPrice: Decimal,
  discount: Decimal
): Decimal {
  const surplus = targetPpn.div(PPN_EFFECTIVE_RATE).add(discount);
  return surplus.div(unitPrice);
}

/**
 * Round to nearest step value
 */
function roundToStep(value: Decimal, step: Decimal): Decimal {
  return value.div(step).round().mul(step);
}

// (findOptimalQtyRange removed — was dead code)

/**
 * Generate search order based on priority (Option D)
 * Start from reference values and expand outward
 * Optimized: Skip sorting when parameters are locked (single value)
 */
function* generatePriorityOrder(
  refQty: Decimal,
  refDiscount: Decimal,
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
    const qtyCenter = Decimal.max(qtyMin, Decimal.min(qtyMax, refQty));
    qtyValues.sort((a, b) => a.sub(qtyCenter).abs().cmp(b.sub(qtyCenter).abs()));
  }
  
  if (discountValues.length > 1) {
    const discountCenter = Decimal.max(discountMin, Decimal.min(discountMax, refDiscount));
    discountValues.sort((a, b) => a.sub(discountCenter).abs().cmp(b.sub(discountCenter).abs()));
  }

  // Yield in priority order (closer to reference first)
  for (const qty of qtyValues) {
    for (const discount of discountValues) {
      yield [qty, discount];
    }
  }
}

/**
 * Estimate number of combinations, accounting for locked parameters
 */
export function estimateCombinations(config: SimulationConfig): number {
  const priceLocked = config.priceMin.eq(config.priceMax);
  const discountLocked = config.discountMin.eq(config.discountMax);
  const qtyLocked = config.quantityMin.eq(config.quantityMax);

  const quantityCount = qtyLocked ? 1 :
    config.quantityMax.sub(config.quantityMin).div(config.quantityStep).floor().toNumber() + 1;
  const discountCount = discountLocked ? 1 :
    config.discountMax.sub(config.discountMin).div(config.discountStep).floor().toNumber() + 1;

  // When price and discount are locked, only qty varies
  if (priceLocked && discountLocked) return quantityCount;
  // When price is locked, iterate qty (discount computed per qty)
  if (priceLocked) return quantityCount;
  // When discount is locked, iterate qty (price computed per qty)
  if (discountLocked) return quantityCount;
  // Otherwise iterate qty × discount
  return discountCount * quantityCount;
}

/**
 * Estimate number of combinations from plain numbers (no Decimal.js).
 * Used in the main thread to compute estimate before sending work to workers.
 */
export function estimateCombinationsSimple(config: {
  priceMin: number; priceMax: number;
  discountMin: number; discountMax: number; discountStep: number;
  quantityMin: number; quantityMax: number; quantityStep: number;
}): number {
  const priceLocked = config.priceMin === config.priceMax;
  const discountLocked = config.discountMin === config.discountMax;

  const quantityCount = Math.max(1, Math.floor((config.quantityMax - config.quantityMin) / config.quantityStep) + 1);
  const discountCount = Math.max(1, Math.floor((config.discountMax - config.discountMin) / config.discountStep) + 1);

  if (priceLocked && discountLocked) return quantityCount;
  if (priceLocked) return quantityCount;
  if (discountLocked) return quantityCount;
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
  onProgress?: (progress: number) => void,
  onResult?: (result: SimulationResult) => void,
  shouldCancel?: () => boolean
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
  // Report progress ~100 times (each report ≈ 1% jump), min 100 iterations between reports
  const reportInterval = Math.max(100, Math.floor(totalEstimate / 100));
  
  // Detect locked parameters (single value in range)
  const qtyLocked = config.quantityMin.eq(config.quantityMax);
  const discountLocked = discountMin.eq(discountMax);
  const priceLocked = priceMin.eq(priceMax);
  
  // Use smart order only for large searches where multiple dimensions vary
  // For locked parameters, smart order is still useful if the remaining space is large (> 5000)
  const shouldUseSmartOrder = totalEstimate > 5000;

  // Enough results threshold: stop when we have 2× topN results
  const enoughResults = config.topNResults * 2;

  // Option D: Use priority-based iteration for large searches
  const iterator = shouldUseSmartOrder
    ? generatePriorityOrder(
        config.referenceTransaction.quantity,
        config.referenceTransaction.discount,
        config.quantityMin,
        config.quantityMax,
        config.quantityStep,
        discountMin,
        discountMax,
        config.discountStep
      )
    : null;

  // Standard iteration for smaller searches, priority for larger
  const processQtyUnitPrice = (quantity: Decimal, unitPrice: Decimal): void => {
    const exactDiscount = calculateRequiredDiscount(config.targetPpn, unitPrice, quantity);
    const roundedDiscount = roundToStep(exactDiscount, config.discountStep);

    const discountsToTry = [
      exactDiscount,
      Decimal.max(discountMin, Decimal.min(discountMax, exactDiscount)) // Clamped exact discount
    ];
    if (!roundedDiscount.eq(exactDiscount)) {
      discountsToTry.push(roundedDiscount);
      discountsToTry.push(roundedDiscount.add(config.discountStep));
      discountsToTry.push(roundedDiscount.sub(config.discountStep));
    }

    for (const discount of discountsToTry) {
      if (discount.lt(discountMin) || discount.gt(discountMax)) continue;

      const key = createTransactionKey(unitPrice, quantity, discount);
      if (seen.has(key)) continue;
      seen.add(key);

      const transaction: Transaction = { unitPrice, quantity, discount };
      if (validateTransaction(transaction) !== null) continue;

      const result = createResult(transaction, config.targetPpn, config.referenceTransaction, config.alpha, config.beta);

      if (result.ppnDifference.lte(config.tolerance)) {
        results.push(result);
        if (onResult) onResult(result);
        if (result.ppnDifference.isZero()) perfectCount++;
      }
    }
  };

  const processPriceDiscount = (unitPrice: Decimal, discount: Decimal): void => {
    const exactQty = calculateRequiredQuantity(config.targetPpn, unitPrice, discount);
    const roundedQty = roundToStep(exactQty, config.quantityStep);

    const qtysToTry = [
      exactQty,
      Decimal.max(config.quantityMin, Decimal.min(config.quantityMax, exactQty)) // Clamped exact qty
    ];
    if (!roundedQty.eq(exactQty)) {
      qtysToTry.push(roundedQty);
      qtysToTry.push(roundedQty.add(config.quantityStep));
      qtysToTry.push(roundedQty.sub(config.quantityStep));
    }

    for (const quantity of qtysToTry) {
      if (quantity.lt(config.quantityMin) || quantity.gt(config.quantityMax) || quantity.lte(0)) {
        continue;
      }

      const key = createTransactionKey(unitPrice, quantity, discount);
      if (seen.has(key)) continue;
      seen.add(key);

      const transaction: Transaction = { unitPrice, quantity, discount };
      if (validateTransaction(transaction) !== null) continue;

      const result = createResult(transaction, config.targetPpn, config.referenceTransaction, config.alpha, config.beta);

      if (result.ppnDifference.lte(config.tolerance)) {
        results.push(result);
        if (onResult) onResult(result);
        if (result.ppnDifference.isZero()) perfectCount++;
      }
    }
  };

  const processQtyDiscount = (quantity: Decimal, discount: Decimal): void => {
    const exactUnitPrice = calculateRequiredUnitPrice(config.targetPpn, quantity, discount);
    const roundedUnitPrice = roundToStep(exactUnitPrice, config.priceStep);

    const pricesToTry = [
      exactUnitPrice,
      Decimal.max(priceMin, Decimal.min(priceMax, exactUnitPrice)) // Clamped exact price
    ];
    if (!roundedUnitPrice.eq(exactUnitPrice)) {
      pricesToTry.push(roundedUnitPrice);
      pricesToTry.push(roundedUnitPrice.add(config.priceStep));
      pricesToTry.push(roundedUnitPrice.sub(config.priceStep));
    }

    for (const unitPrice of pricesToTry) {
      if (unitPrice.lt(priceMin) || unitPrice.gt(priceMax) || unitPrice.lte(0)) {
        continue;
      }

      const key = createTransactionKey(unitPrice, quantity, discount);
      if (seen.has(key)) continue;
      seen.add(key);

      const transaction: Transaction = { unitPrice, quantity, discount };
      if (validateTransaction(transaction) !== null) continue;

      const result = createResult(transaction, config.targetPpn, config.referenceTransaction, config.alpha, config.beta);

      if (result.ppnDifference.lte(config.tolerance)) {
        results.push(result);
        if (onResult) onResult(result);
        if (result.ppnDifference.isZero()) perfectCount++;
      }
    }
  };

  // Helper: check if we should stop searching
  const shouldStop = (): boolean =>
    perfectCount >= config.topNResults ||
    results.length >= enoughResults ||
    (shouldCancel?.() ?? false);

  if (priceLocked && discountLocked) {
    // Only Qty is variable
    processPriceDiscount(priceMin, discountMin);
  } else if (priceLocked) {
    for (
      let quantity = config.quantityMin;
      quantity.lte(config.quantityMax);
      quantity = quantity.add(config.quantityStep)
    ) {
      if (shouldStop()) break;
      processQtyUnitPrice(quantity, priceMin);
      count++;
      if (onProgress && count % reportInterval === 0) {
        onProgress(Math.min(count / totalEstimate, 0.99));
      }
    }
  } else if (discountLocked) {
    for (
      let quantity = config.quantityMin;
      quantity.lte(config.quantityMax);
      quantity = quantity.add(config.quantityStep)
    ) {
      if (shouldStop()) break;
      processQtyDiscount(quantity, discountMin);
      count++;
      if (onProgress && count % reportInterval === 0) {
        onProgress(Math.min(count / totalEstimate, 0.99));
      }
    }
  } else if (qtyLocked) {
    if (iterator) {
      for (const [quantity, discount] of iterator) {
        if (shouldStop()) break;
        processQtyDiscount(quantity, discount);
        count++;
        if (onProgress && count % reportInterval === 0) {
          onProgress(Math.min(count / totalEstimate, 0.99));
        }
      }
    } else {
      for (let d = discountMin; d.lte(discountMax); d = d.add(config.discountStep)) {
        if (shouldStop()) break;
        processQtyDiscount(config.quantityMin, d);
        count++;
        if (onProgress && count % reportInterval === 0) {
          onProgress(Math.min(count / totalEstimate, 0.99));
        }
      }
    }
  } else if (iterator) {
    for (const [quantity, discount] of iterator) {
      if (shouldStop()) break;
      processQtyDiscount(quantity, discount);
      count++;
      if (onProgress && count % reportInterval === 0) {
        onProgress(Math.min(count / totalEstimate, 0.99));
      }
    }
  } else {
    for (
      let quantity = config.quantityMin;
      quantity.lte(config.quantityMax);
      quantity = quantity.add(config.quantityStep)
    ) {
      if (shouldStop()) break;
      for (
        let discount = discountMin;
        discount.lte(discountMax);
        discount = discount.add(config.discountStep)
      ) {
        if (shouldStop()) break;
        processQtyDiscount(quantity, discount);
        count++;
        if (onProgress && count % reportInterval === 0) {
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
  if (config.priceStep.lte(0)) {
    return 'Step harga harus positif';
  }
  if (config.discountStep.lte(0)) {
    return 'Step diskon harus positif';
  }

  // With optimizations, we can handle much larger search spaces
  const estimate = estimateCombinations(config);
  if (estimate > 1_000_000_000) {
    return `Ruang pencarian terlalu besar (${estimate.toLocaleString()} kombinasi). Kurangi range atau perbesar step.`;
  }

  return null;
}
