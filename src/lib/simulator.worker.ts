/**
 * Simulator Web Worker
 * Runs simulation in a background thread for UI responsiveness
 */
import Decimal from 'decimal.js';
import type { SimulationConfig, SimulationResult } from './types';
import type { 
  WorkerRequest, 
  WorkerResponse, 
  SerializableSimulationConfig,
  SerializableSimulationResult 
} from './worker-types';
import { runSimulation, validateConfig, estimateCombinations } from './simulator';

// Configure Decimal.js (needs to be set in worker context too)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

let isCancelled = false;

/**
 * Convert serializable config to Decimal-based config
 */
function deserializeConfig(config: SerializableSimulationConfig): SimulationConfig {
  return {
    referenceTransaction: {
      unitPrice: new Decimal(config.referenceTransaction.unitPrice),
      quantity: new Decimal(config.referenceTransaction.quantity),
      discount: new Decimal(config.referenceTransaction.discount)
    },
    targetPpn: new Decimal(config.targetPpn),
    tolerance: new Decimal(config.tolerance),
    unitPriceVariancePercent: new Decimal(config.unitPriceVariancePercent),
    discountVariancePercent: new Decimal(config.discountVariancePercent),
    quantityMin: new Decimal(config.quantityMin),
    quantityMax: new Decimal(config.quantityMax),
    quantityStep: new Decimal(config.quantityStep),
    priceStep: new Decimal(config.priceStep),
    discountStep: new Decimal(config.discountStep),
    alpha: new Decimal(config.alpha),
    beta: new Decimal(config.beta),
    topNResults: config.topNResults
  };
}

/**
 * Convert Decimal-based result to serializable result
 */
function serializeResult(result: SimulationResult): SerializableSimulationResult {
  return {
    transaction: {
      unitPrice: result.transaction.unitPrice.toNumber(),
      quantity: result.transaction.quantity.toNumber(),
      discount: result.transaction.discount.toNumber()
    },
    calculatedPpn: result.calculatedPpn.toNumber(),
    ppnDifference: result.ppnDifference.toNumber(),
    score: result.score.toNumber(),
    metadata: {
      ppnDifferencePercent: result.metadata.ppnDifferencePercent.toNumber(),
      unitPriceDifference: result.metadata.unitPriceDifference.toNumber(),
      quantityDifference: result.metadata.quantityDifference.toNumber(),
      discountDifference: result.metadata.discountDifference.toNumber(),
      dppNilaiLain: result.metadata.dppNilaiLain.toNumber()
    }
  };
}

/**
 * Post a response back to the main thread
 */
function postResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

/**
 * Handle incoming messages from main thread
 */
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === 'cancel') {
    isCancelled = true;
    return;
  }

  if (request.type === 'start') {
    isCancelled = false;
    const startTime = performance.now();
    
    try {
      // Deserialize config
      const config = deserializeConfig(request.config);
      
      // Validate config
      const error = validateConfig(config);
      if (error) {
        postResponse({ type: 'error', message: error });
        return;
      }

      // Get estimate for progress reporting
      const estimate = estimateCombinations(config);

      // Run simulation with progress callback
      const results = runSimulation(config, (progress) => {
        if (isCancelled) {
          throw new Error('Cancelled');
        }
        postResponse({ 
          type: 'progress', 
          progress,
          estimate
        });
      });

      if (isCancelled) {
        return;
      }

      // Sort by ppn difference (closest to target first)
      results.sort((a, b) => 
        a.ppnDifference.abs().minus(b.ppnDifference.abs()).toNumber()
      );

      // Serialize and send results
      const elapsed = performance.now() - startTime;
      postResponse({
        type: 'result',
        results: results.map(serializeResult),
        elapsed
      });
    } catch (e) {
      if (!isCancelled) {
        postResponse({ 
          type: 'error', 
          message: e instanceof Error ? e.message : 'Unknown error' 
        });
      }
    }
  }
};
