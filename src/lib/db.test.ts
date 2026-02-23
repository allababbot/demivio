import { describe, it, expect } from 'vitest';
import { hashConfig } from './db';
import type { SerializableSimulationConfig } from './worker-types';

function createSerializableConfig(overrides: Partial<SerializableSimulationConfig> = {}): SerializableSimulationConfig {
  return {
    referenceTransaction: { unitPrice: 50000, quantity: 20, discount: 15000 },
    targetPpn: 108350,
    tolerance: 100,
    priceMin: 45000,
    priceMax: 55000,
    discountMin: 10000,
    discountMax: 20000,
    quantityMin: 18,
    quantityMax: 22,
    quantityStep: 1,
    priceStep: 1000,
    discountStep: 1000,
    alpha: 1,
    beta: 1,
    topNResults: 10,
    ...overrides,
  };
}

describe('hashConfig', () => {
  it('should return same hash for identical configs', () => {
    const a = createSerializableConfig();
    const b = createSerializableConfig();
    expect(hashConfig(a)).toBe(hashConfig(b));
  });

  it('should return different hash for different configs', () => {
    const a = createSerializableConfig({ targetPpn: 100000 });
    const b = createSerializableConfig({ targetPpn: 200000 });
    expect(hashConfig(a)).not.toBe(hashConfig(b));
  });

  it('should return different hash for different reference transactions', () => {
    const a = createSerializableConfig({
      referenceTransaction: { unitPrice: 50000, quantity: 20, discount: 15000 },
    });
    const b = createSerializableConfig({
      referenceTransaction: { unitPrice: 60000, quantity: 20, discount: 15000 },
    });
    expect(hashConfig(a)).not.toBe(hashConfig(b));
  });

  it('should return a non-empty string', () => {
    const hash = hashConfig(createSerializableConfig());
    expect(hash.length).toBeGreaterThan(0);
  });
});
