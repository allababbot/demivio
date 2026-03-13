<script lang="ts">
  import type {
    SerializableSimulationConfig,
    SerializableSimulationResult,
    WorkerResponse,
  } from "$lib/worker-types";
  import { validateFormInputs } from "$lib/validation";
  import { estimateCombinationsSimple } from "$lib/simulator";
  import { exportResultsToCsv } from "$lib/exportCsv";
  import ReferenceForm from "$lib/components/ReferenceForm.svelte";
  import TargetForm from "$lib/components/TargetForm.svelte";
  import ParametersPanel from "$lib/components/ParametersPanel.svelte";
  import ResultsTable from "$lib/components/ResultsTable.svelte";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import Navbar from "$lib/components/Navbar.svelte";
  import HistoryPanel from "$lib/components/HistoryPanel.svelte";
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { saveToCache, getFromCache } from "$lib/db";
  import type { CachedSimulation } from "$lib/db";

  // Reference transaction
  let refPrice = 50000;
  let refQuantity = 20;
  let refDiscount = 15000;
  let targetPpn = 120000;

  // Lock states
  let isPriceLocked = false;
  let isQtyLocked = false;
  let isDiscountLocked = false;

  // Parameter defaults (reactive to reference values)
  let priceMin = 0;
  let priceMax = Math.round(refPrice * 1.25);
  let discountMin = 0;
  let discountMax = Math.round(refDiscount * 1.25);
  let qtyMin = 1;
  let qtyMax = Math.round(refQuantity * 1.25);
  let topN = 100;
  let tolerance = 1;
  let showParameters = false;

  // Track previous reference values for reactive defaults
  let prevRefPrice = refPrice;
  let prevRefQuantity = refQuantity;
  let prevRefDiscount = refDiscount;

  $: if (refPrice !== prevRefPrice) {
    priceMin = 0;
    priceMax = Math.round(refPrice * 1.25);
    prevRefPrice = refPrice;
  }

  $: if (refQuantity !== prevRefQuantity) {
    qtyMin = 1;
    qtyMax = Math.round(refQuantity * 1.25);
    prevRefQuantity = refQuantity;
  }

  $: if (refDiscount !== prevRefDiscount) {
    discountMin = 0;
    discountMax = Math.round(refDiscount * 1.25);
    prevRefDiscount = refDiscount;
  }

  // Simulation state
  let simResults: SerializableSimulationResult[] = [];
  let simError: string | null = null;
  let simRunning = false;
  let simProgress = 0;
  let simEstimate = 0;
  let simElapsed = 0;
  let currentGenerationId = 0;
  let validationErrors: string[] = [];

  // Web Workers
  let workers: Worker[] = [];
  const numWorkers = (browser && navigator.hardwareConcurrency) || 4;

  onMount(() => {
    if (browser) {
      for (let i = 0; i < numWorkers; i++) {
        const worker = new Worker(
          new URL("$lib/simulator.worker.ts", import.meta.url),
          { type: "module" },
        );
        workers = [...workers, worker];
      }
    }
  });

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      if (!simRunning) handleSimulate();
    } else if (e.key === "Escape" && simRunning) {
      handleCancel();
    } else if (e.ctrlKey && e.key === "e") {
      e.preventDefault();
      if (simResults.length > 0) exportResultsToCsv(simResults);
    }
  }

  onMount(() => {
    if (browser) {
      document.addEventListener("keydown", handleKeydown);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener("keydown", handleKeydown);
    }
    workers.forEach((w) => {
      w.terminate();
    });
    workers = [];
  });

  function finalizeSimulation(
    workerResults: SerializableSimulationResult[][],
    startTime: number,
    baseConfig: SerializableSimulationConfig,
    genId: number,
  ) {
    if (genId !== currentGenerationId) return;

    const allResults = workerResults.flat();
    const uniqueResults = Array.from(
      new Map(
        allResults.map((r) => [
          `${r.transaction.unitPrice}|${r.transaction.quantity}|${r.transaction.discount}`,
          r,
        ]),
      ).values(),
    );

    uniqueResults.sort((a, b) => {
      const aPerfect = a.ppnDifference === 0;
      const bPerfect = b.ppnDifference === 0;
      if (aPerfect && !bPerfect) return -1;
      if (!aPerfect && bPerfect) return 1;
      return a.score - b.score;
    });

    simResults = uniqueResults.slice(0, topN);
    simElapsed = performance.now() - startTime;
    simRunning = false;
    simProgress = 1;

    if (simResults.length === 0) {
      simError = "Tidak ditemukan hasil dalam toleransi yang ditentukan.";
    } else {
      saveToCache(baseConfig, simResults).catch(console.error);
    }
  }

  async function handleSimulate() {
    if (workers.length === 0) {
      simError = "Worker tidak tersedia";
      return;
    }

    // Validate inputs
    validationErrors = validateFormInputs({
      refPrice,
      refQuantity,
      refDiscount,
      targetPpn,
      priceMin,
      priceMax,
      discountMin,
      discountMax,
      qtyMin,
      qtyMax,
      isPriceLocked,
      isQtyLocked,
      isDiscountLocked,
    });
    if (validationErrors.length > 0) {
      return;
    }

    simError = null;
    simResults = [];
    simRunning = true;
    simProgress = 0;
    simElapsed = 0;
    currentGenerationId++;
    const genId = currentGenerationId;

    const startTime = performance.now();

    // Resolve effective ranges
    const effPriceMin = isPriceLocked ? (refPrice ?? 0) : (priceMin ?? 0);
    const effPriceMax = isPriceLocked ? (refPrice ?? 0) : (priceMax ?? 1000000);
    const effDiscountMin = isDiscountLocked
      ? (refDiscount ?? 0)
      : (discountMin ?? 0);
    const effDiscountMax = isDiscountLocked
      ? (refDiscount ?? 0)
      : (discountMax ?? 1000000);
    const effQtyMin = isQtyLocked ? (refQuantity ?? 1) : (qtyMin ?? 1);
    const effQtyMax = isQtyLocked ? (refQuantity ?? 1) : (qtyMax ?? 1000);

    // Auto-compute step sizes to cap combinations at ~5M
    const MAX_COMBINATIONS = 5_000_000;
    const qtyCount = Math.max(1, effQtyMax - effQtyMin + 1);
    const discountRange = effDiscountMax - effDiscountMin;
    const priceRange = effPriceMax - effPriceMin;
    const autoDiscountStep = Math.max(
      1,
      Math.ceil(
        discountRange / Math.max(1, Math.floor(MAX_COMBINATIONS / qtyCount)),
      ),
    );
    const autoPriceStep = Math.max(
      1,
      Math.ceil(
        priceRange / Math.max(1, Math.floor(MAX_COMBINATIONS / qtyCount)),
      ),
    );

    const baseConfig: SerializableSimulationConfig = {
      referenceTransaction: {
        unitPrice: refPrice ?? 0,
        quantity: refQuantity ?? 0,
        discount: refDiscount ?? 0,
      },
      targetPpn: targetPpn ?? 0,
      tolerance: tolerance,
      priceMin: effPriceMin,
      priceMax: effPriceMax,
      discountMin: effDiscountMin,
      discountMax: effDiscountMax,
      quantityMin: effQtyMin,
      quantityMax: effQtyMax,
      quantityStep: 1,
      priceStep: autoPriceStep,
      discountStep: autoDiscountStep,
      alpha: 1,
      beta: 0.1,
      topNResults: topN,
    };

    // Caching check
    const cached = await getFromCache(baseConfig);
    if (cached) {
      simResults = cached;
      simElapsed = performance.now() - startTime;
      simRunning = false;
      simProgress = 1;
      return;
    }

    // Compute estimate upfront so ProgressBar shows immediately
    simEstimate = estimateCombinationsSimple(baseConfig);

    // Parallel worker execution
    let activeWorkers = workers.length;
    let progressMap = new Map<number, number>();
    let workerResults: SerializableSimulationResult[][] = Array(
      workers.length,
    ).fill([]);

    const fullQtyRange = baseConfig.quantityMax - baseConfig.quantityMin;
    const sliceSize = Math.max(1, Math.floor(fullQtyRange / workers.length));

    workers.forEach((worker, i) => {
      const startQty = baseConfig.quantityMin + i * sliceSize;

      // If startQty already exceeds quantityMax, this worker has no work to do
      if (startQty > baseConfig.quantityMax) {
        activeWorkers--;
        // If this was the last worker to "complete" (due to no work), finalize results
        if (activeWorkers === 0) {
          finalizeSimulation(workerResults, startTime, baseConfig, genId);
        }
        return;
      }

      const endQty =
        i === workers.length - 1
          ? baseConfig.quantityMax
          : Math.min(startQty + sliceSize - 1, baseConfig.quantityMax);

      const workerConfig = {
        ...baseConfig,
        quantityMin: startQty,
        quantityMax: endQty,
      };

      worker.onerror = (error) => {
        console.error("Worker error:", error);
        simError = "Worker Error: Terjadi kesalahan di background thread.";
        simRunning = false;
      };

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;

        // Ignore stale responses from previous generations
        if (response.generationId !== genId) return;

        if (response.type === "progress") {
          progressMap.set(i, response.progress);
          const totalProgress =
            Array.from(progressMap.values()).reduce((a, b) => a + b, 0) /
            workers.length;
          simProgress = totalProgress;
          simEstimate = response.estimate * workers.length;
        } else if (response.type === "partial_result") {
          simResults = [...simResults, ...response.results];
        } else if (response.type === "result") {
          workerResults[i] = response.results;
          activeWorkers--;

          if (activeWorkers === 0) {
            finalizeSimulation(workerResults, startTime, baseConfig, genId);
          }
        } else if (response.type === "error") {
          simError = response.message;
          simRunning = false;
        }
      };

      worker.postMessage({
        type: "start",
        config: workerConfig,
        generationId: genId,
      });
    });
  }

  function handleCancel() {
    currentGenerationId++;
    workers.forEach((w) => {
      w.postMessage({ type: "cancel" });
    });
    simRunning = false;
    simProgress = 0;
  }

  function handleLoadHistory(entry: CachedSimulation) {
    // Restore form state from cached config
    const cfg = entry.config;
    refPrice = cfg.referenceTransaction.unitPrice;
    refQuantity = cfg.referenceTransaction.quantity;
    refDiscount = cfg.referenceTransaction.discount;
    targetPpn = cfg.targetPpn;
    tolerance = cfg.tolerance;
    priceMin = cfg.priceMin;
    priceMax = cfg.priceMax;
    discountMin = cfg.discountMin;
    discountMax = cfg.discountMax;
    qtyMin = cfg.quantityMin;
    qtyMax = cfg.quantityMax;
    topN = cfg.topNResults;

    // Restore results
    simResults = entry.results;
    simError = null;
    simElapsed = 0;
    simRunning = false;
    simProgress = 0;
    validationErrors = [];
  }
</script>

  <div class="container animate-in">
  <Navbar />
  <div class="dashboard-grid">
    <!-- SIDEBAR: Inputs -->
    <aside class="sidebar">
      <div class="input-stack">
        <ReferenceForm
          bind:refPrice
          bind:refQuantity
          bind:refDiscount
          bind:isPriceLocked
          bind:isQtyLocked
          bind:isDiscountLocked
        />

        <TargetForm bind:targetPpn />

        <ParametersPanel
          bind:showParameters
          bind:priceMin
          bind:priceMax
          bind:discountMin
          bind:discountMax
          bind:qtyMin
          bind:qtyMax
          bind:topN
          bind:tolerance
        />

        {#if validationErrors.length > 0}
          <div class="error-panel animate-in">
            <h3 class="error-title">Terjadi Kesalahan</h3>
            <ul class="error-list">
              {#each validationErrors as err}
                <li>{err}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="action-row">
          <button
            class="btn btn-primary btn-run"
            on:click={handleSimulate}
            disabled={simRunning}
          >
            {#if simRunning}
              <div class="spinner"></div>
              <span>Memproses...</span>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>Jalankan Simulasi</span>
            {/if}
          </button>
          
          {#if simRunning}
            <button
              class="btn btn-outline btn-cancel"
              on:click={handleCancel}
            >
              Batal
            </button>
          {/if}
        </div>
      </div>

      <HistoryPanel on:load={(e) => handleLoadHistory(e.detail)} />
    </aside>

    <!-- MAIN CONTENT: Results -->
    <main class="main-content">
      {#if simRunning}
        <ProgressBar progress={simProgress} estimate={simEstimate} />
      {/if}

      {#if simError}
        <div class="error-panel error-full animate-in">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <p>{simError}</p>
        </div>
      {/if}

      <ResultsTable results={simResults} {simElapsed} {simRunning} />
    </main>
  </div>
</div>

<style>
  .input-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .action-row {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .btn-run {
    flex: 1;
    height: 48px;
    font-weight: 700;
    gap: var(--space-2);
  }

  .btn-cancel {
    background: var(--danger-muted);
    color: var(--danger);
    border-color: var(--danger-muted);
  }

  .btn-cancel:hover {
    background: var(--danger);
    color: white;
  }

  .error-panel {
    background: var(--danger-muted);
    border: 1px solid var(--danger);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    color: var(--danger);
  }

  .error-title {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: var(--space-2);
  }

  .error-list {
    margin: 0;
    padding-left: var(--space-5);
    font-size: var(--text-sm);
  }

  .error-full {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .error-full p {
    margin: 0;
    font-weight: 500;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
