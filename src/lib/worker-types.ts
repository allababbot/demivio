/**
 * Serializable types for Web Worker communication
 * Since Decimal.js objects cannot be serialized, we use plain numbers/strings
 */

/**
 * Serializable transaction (for worker communication)
 */
export interface SerializableTransaction {
  unitPrice: number;
  quantity: number;
  discount: number;
}

/**
 * Serializable simulation config (for worker communication)
 */
export interface SerializableSimulationConfig {
  referenceTransaction: SerializableTransaction;
  targetPpn: number;
  tolerance: number;
  priceMin: number;
  priceMax: number;
  discountMin: number;
  discountMax: number;
  quantityMin: number;
  quantityMax: number;
  quantityStep: number;
  priceStep: number;
  discountStep: number;
  alpha: number;
  beta: number;
  topNResults: number;
}

/**
 * Serializable result metadata
 */
export interface SerializableResultMetadata {
  ppnDifferencePercent: number;
  unitPriceDifference: number;
  quantityDifference: number;
  discountDifference: number;
  dppNilaiLain: number;
}

/**
 * Serializable simulation result
 */
export interface SerializableSimulationResult {
  transaction: SerializableTransaction;
  calculatedPpn: number;
  ppnDifference: number;
  score: number;
  metadata: SerializableResultMetadata;
}

/**
 * Messages sent TO the worker
 */
export type WorkerRequest = {
  type: 'start';
  config: SerializableSimulationConfig;
} | {
  type: 'cancel';
};

/**
 * Messages sent FROM the worker
 */
export type WorkerResponse = {
  type: 'progress';
  progress: number;
  estimate: number;
} | {
  type: 'result';
  results: SerializableSimulationResult[];
  elapsed: number;
} | {
  type: 'error';
  message: string;
};
