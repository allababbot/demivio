import Decimal from 'decimal.js';
import type { Transaction, SimulationConfig, SimulationResult, ResultMetadata, HumanScore } from './types';
import { calculateTransactionPpn, validateTransaction } from './calculator';
import { PPN_EFFECTIVE_RATE } from './constants';

/**
 * Create a composite key for transaction deduplication (Option A)
 */
function createTransactionKey(unitPrice: Decimal, quantity: Decimal, discount: Decimal): string {
  return `${unitPrice.toFixed(2)}|${quantity.toString()}|${discount.toFixed(2)}`;
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
  result: { ppnDifference: Decimal; metadata: ResultMetadata }
): HumanScore {
  const meta = result.metadata;

  // --- Factor 1: PPN Accuracy (60% weight) ---
  // ppnDifferencePercent is already 0..100 range
  const ppnDiffPct = meta.ppnDifferencePercent.toNumber();
  // k=5: 1% diff → 95.2 score, 2% → 90.9, 5% → 80, 10% → 66.7
  const ppnScore = 100 / (1 + 5 * ppnDiffPct / 100);

  // --- Factor 2: Price Similarity (15% weight) ---
  // unitPriceDifference is absolute Rp. Normalize by reference via metadata.
  // Use a generous scale: 10% price change ≈ 50% factor score
  const priceAbsDiff = meta.unitPriceDifference.abs().toNumber();
  const priceRef = Math.max(1, priceAbsDiff + 1); // avoid div-by-zero edge
  // We need reference price — reconstruct from diff + result price
  // Actually unitPriceDifference = result.unitPrice - ref.unitPrice
  // So ref = result - diff. But we only have abs diff here.
  // Use a fixed scale factor based on typical price magnitudes
  const priceScore = 100 / (1 + priceAbsDiff / 5000);

  // --- Factor 3: Quantity Similarity (10% weight) ---
  const qtyAbsDiff = meta.quantityDifference.abs().toNumber();
  // k scale: 1 qty diff ≈ 83 score, 5 diff ≈ 50, 10 diff ≈ 33
  const qtyScore = 100 / (1 + qtyAbsDiff / 3);

  // --- Factor 4: Discount Similarity (15% weight) ---
  const discAbsDiff = meta.discountDifference.abs().toNumber();
  const discScore = 100 / (1 + discAbsDiff / 5000);

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
  const qtyForMaxPrice = targetPpn.div(PPN_EFFECTIVE_RATE).add(discount).div(priceMax);
  
  // Upper bound: unitPrice = priceMin (lower price = higher qty needed)  
  // qty_max_for_target = (targetPpn / 0.11 + discount) / priceMin
  const qtyForMinPrice = priceMin.gt(0) 
    ? targetPpn.div(PPN_EFFECTIVE_RATE).add(discount).div(priceMin)
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
    const qtyCenter = Decimal.max(qtyMin, Decimal.min(qtyMax, refQty));
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
  
  // Detect locked parameters (single value in range)
  const qtyLocked = config.quantityMin.eq(config.quantityMax);
  const discountLocked = discountMin.eq(discountMax);
  const priceLocked = priceMin.eq(priceMax);
  
  // Use smart order only for large searches where multiple dimensions vary
  // For locked parameters, smart order is still useful if the remaining space is large (> 5000)
  const shouldUseSmartOrder = totalEstimate > 5000;

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
  const processQtyUnitPrice = (quantity: Decimal, unitPrice: Decimal): void => {
    const exactDiscount = calculateRequiredDiscount(config.targetPpn, unitPrice, quantity);
    const roundedDiscount = roundToStep(exactDiscount, config.discountStep);

    const discountsToTry = [exactDiscount];
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

    const qtysToTry = [exactQty];
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

    const pricesToTry = [exactUnitPrice];
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

  if (priceLocked && discountLocked) {
    // Only Qty is variable
    processPriceDiscount(priceMin, discountMin);
  } else if (priceLocked) {
    for (
      let quantity = config.quantityMin;
      quantity.lte(config.quantityMax);
      quantity = quantity.add(config.quantityStep)
    ) {
      if (perfectCount >= config.topNResults || shouldCancel?.()) break;
      processQtyUnitPrice(quantity, priceMin);
      count++;
    }
  } else if (discountLocked) {
    for (
      let quantity = config.quantityMin;
      quantity.lte(config.quantityMax);
      quantity = quantity.add(config.quantityStep)
    ) {
      if (perfectCount >= config.topNResults || shouldCancel?.()) break;
      processQtyDiscount(quantity, discountMin);
      count++;
    }
  } else if (qtyLocked) {
    if (iterator) {
      for (const [quantity, discount] of iterator) {
        if (shouldCancel?.()) break;
        processQtyDiscount(quantity, discount);
        count++;
        if (perfectCount >= config.topNResults) break;
      }
    } else {
      for (let d = discountMin; d.lte(discountMax); d = d.add(config.discountStep)) {
        if (perfectCount >= config.topNResults || shouldCancel?.()) break;
        processQtyDiscount(config.quantityMin, d);
        count++;
      }
    }
  } else if (iterator) {
    for (const [quantity, discount] of iterator) {
      if (shouldCancel?.()) break;
      processQtyDiscount(quantity, discount);
      count++;
      if (perfectCount >= config.topNResults) break;

      if (onProgress && count % 1000 === 0) {
        onProgress(Math.min(count / totalEstimate, 0.99));
      }
    }
  } else {
    for (
      let quantity = config.quantityMin;
      quantity.lte(config.quantityMax);
      quantity = quantity.add(config.quantityStep)
    ) {
      if (perfectCount >= config.topNResults || shouldCancel?.()) break;

      for (
        let discount = discountMin;
        discount.lte(discountMax);
        discount = discount.add(config.discountStep)
      ) {
        if (shouldCancel?.()) break;
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
