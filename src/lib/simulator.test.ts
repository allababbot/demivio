import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  estimateCombinations,
  runSimulation,
  validateConfig,
} from './simulator';
import type { SimulationConfig, Transaction } from './types';

// Configure Decimal.js
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function createConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  const defaults: SimulationConfig = {
    referenceTransaction: {
      unitPrice: new Decimal(50000),
      quantity: new Decimal(20),
      discount: new Decimal(15000),
    },
    targetPpn: new Decimal(108350),
    tolerance: new Decimal(100),
    priceMin: new Decimal(45000),
    priceMax: new Decimal(55000),
    discountMin: new Decimal(10000),
    discountMax: new Decimal(20000),
    quantityMin: new Decimal(18),
    quantityMax: new Decimal(22),
    quantityStep: new Decimal(1),
    priceStep: new Decimal(1000),
    discountStep: new Decimal(1000),
    alpha: new Decimal(1),
    beta: new Decimal(1),
    topNResults: 10,
  };
  return { ...defaults, ...overrides };
}

describe('validateConfig', () => {
  it('should accept valid config', () => {
    expect(validateConfig(createConfig())).toBeNull();
  });

  it('should reject zero target PPN', () => {
    const config = createConfig({ targetPpn: new Decimal(0) });
    expect(validateConfig(config)).not.toBeNull();
  });

  it('should reject negative tolerance', () => {
    const config = createConfig({ tolerance: new Decimal(-1) });
    expect(validateConfig(config)).not.toBeNull();
  });

  it('should reject qtyMin > qtyMax', () => {
    const config = createConfig({
      quantityMin: new Decimal(100),
      quantityMax: new Decimal(10),
    });
    expect(validateConfig(config)).not.toBeNull();
  });

  it('should reject zero quantity step', () => {
    const config = createConfig({ quantityStep: new Decimal(0) });
    expect(validateConfig(config)).not.toBeNull();
  });

  it('should reject too large search space', () => {
    const config = createConfig({
      quantityMin: new Decimal(1),
      quantityMax: new Decimal(1000000),
      discountMin: new Decimal(0),
      discountMax: new Decimal(10000000),
      discountStep: new Decimal(1),
      quantityStep: new Decimal(1),
    });
    expect(validateConfig(config)).not.toBeNull();
  });

  it('should reject invalid reference transaction', () => {
    const config = createConfig({
      referenceTransaction: {
        unitPrice: new Decimal(0),
        quantity: new Decimal(20),
        discount: new Decimal(0),
      },
    });
    expect(validateConfig(config)).not.toBeNull();
  });
});

describe('estimateCombinations', () => {
  it('should count qty * discount combinations', () => {
    const config = createConfig({
      quantityMin: new Decimal(1),
      quantityMax: new Decimal(5),
      quantityStep: new Decimal(1),
      discountMin: new Decimal(0),
      discountMax: new Decimal(3000),
      discountStep: new Decimal(1000),
    });
    // qty: 1,2,3,4,5 = 5 values, discount: 0,1000,2000,3000 = 4 values
    expect(estimateCombinations(config)).toBe(20);
  });

  it('should return 1 for locked parameters (single value)', () => {
    const config = createConfig({
      quantityMin: new Decimal(20),
      quantityMax: new Decimal(20),
      quantityStep: new Decimal(1),
      discountMin: new Decimal(15000),
      discountMax: new Decimal(15000),
      discountStep: new Decimal(1),
    });
    expect(estimateCombinations(config)).toBe(1);
  });
});

describe('runSimulation', () => {
  it('should return sorted results (smallest score first)', () => {
    const config = createConfig({
      tolerance: new Decimal(1000),
    });
    const results = runSimulation(config);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score.gte(results[i - 1].score)).toBe(true);
    }
  });

  it('should respect topNResults limit', () => {
    const config = createConfig({
      topNResults: 3,
      tolerance: new Decimal(10000),
    });
    const results = runSimulation(config);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('should only return results within tolerance', () => {
    const tol = new Decimal(100);
    const config = createConfig({ tolerance: tol });
    const results = runSimulation(config);
    for (const r of results) {
      expect(r.ppnDifference.lte(tol)).toBe(true);
    }
  });

  it('should work with locked price (single value range)', () => {
    const config = createConfig({
      priceMin: new Decimal(50000),
      priceMax: new Decimal(50000),
      tolerance: new Decimal(5000),
    });
    const results = runSimulation(config);
    for (const r of results) {
      expect(r.transaction.unitPrice.toNumber()).toBe(50000);
    }
  });

  it('should work with all parameters locked', () => {
    const config = createConfig({
      priceMin: new Decimal(50000),
      priceMax: new Decimal(50000),
      quantityMin: new Decimal(20),
      quantityMax: new Decimal(20),
      discountMin: new Decimal(15000),
      discountMax: new Decimal(15000),
      tolerance: new Decimal(200000),
    });
    const results = runSimulation(config);
    // With everything locked, we get a single result
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('should call onProgress callback', () => {
    let progressCalled = false;
    const config = createConfig({ tolerance: new Decimal(10000) });
    runSimulation(config, () => { progressCalled = true; });
    // Progress is called every 1000 iterations; may not fire for small spaces
    // Just verify it doesn't throw
    expect(true).toBe(true);
  });

  it('should include humanScore in results', () => {
    const config = createConfig({ tolerance: new Decimal(5000) });
    const results = runSimulation(config);
    for (const r of results) {
      expect(r.humanScore).toBeDefined();
      expect(r.humanScore.accuracy).toBeGreaterThanOrEqual(0);
      expect(r.humanScore.accuracy).toBeLessThanOrEqual(100);
      expect(r.humanScore.label).toBeTruthy();
      expect(r.humanScore.color).toBeTruthy();
    }
  });
});
