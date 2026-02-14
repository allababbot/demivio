<script lang="ts">
  import Decimal from "decimal.js";
  import { formatRupiah, formatNumber, getDefaultConfig } from "$lib";
  import type { SimulationResult } from "$lib/types";
  import type {
    SerializableSimulationConfig,
    SerializableSimulationResult,
    WorkerRequest,
    WorkerResponse,
  } from "$lib/worker-types";
  import NumberInput from "$lib/components/NumberInput.svelte";
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { saveToCache, getFromCache } from "$lib/db";

  // Simulate form
  let refPrice = 50000;
  let refQuantity = 20;
  let refDiscount = 15000;
  let targetPpn = 120000;
  let tolerance = 1;
  let priceMin = 0;
  let priceMax = refPrice * 2;
  let discountMin = 0;
  let discountMax = refDiscount * 2;

  let prevRefPrice = refPrice;
  let prevRefQuantity = refQuantity;
  let prevRefDiscount = refDiscount;

  // Reactively update defaults when reference values change
  $: if (refPrice !== prevRefPrice) {
    priceMin = 0;
    priceMax = refPrice * 2;
    prevRefPrice = refPrice;
  }

  $: if (refQuantity !== prevRefQuantity) {
    qtyMin = 1;
    qtyMax = refQuantity * 2;
    prevRefQuantity = refQuantity;
  }

  $: if (refDiscount !== prevRefDiscount) {
    discountMin = 0;
    discountMax = refDiscount * 2;
    prevRefDiscount = refDiscount;
  }
  let qtyMin = 1;
  let qtyMax = refQuantity * 2;
  let qtyStep = 1;
  let priceStep = 1;
  let discountStep = 1;

  let topN = 100;

  let isPriceLocked = false;
  let isQtyLocked = false;
  let isDiscountLocked = false;

  // Results with plain numbers (from worker)
  let simResults: SerializableSimulationResult[] = [];
  let simError: string | null = null;
  let simRunning = false;
  let simProgress = 0;
  let simEstimate = 0;
  let simElapsed = 0;
  let showParameters = false;

  // Web Workers
  let workers: Worker[] = [];
  const numWorkers = (browser && navigator.hardwareConcurrency) || 4;

  // Pagination
  let currentPage = 1;
  const itemsPerPage = 10;
  $: paginatedResults = simResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  $: totalPages = Math.ceil(simResults.length / itemsPerPage);

  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
    }
  }

  // Initialize workers on mount
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

  // Clean up workers on destroy
  onDestroy(() => {
    workers.forEach((w) => w.terminate());
    workers = [];
  });

  async function handleSimulate() {
    if (workers.length === 0) {
      simError = "Worker tidak tersedia";
      return;
    }

    simError = null;
    simResults = [];
    currentPage = 1;
    simRunning = true;
    simProgress = 0;
    simElapsed = 0;

    const startTime = performance.now();

    // Build base config
    const baseConfig: SerializableSimulationConfig = {
      referenceTransaction: {
        unitPrice: refPrice ?? 0,
        quantity: refQuantity ?? 0,
        discount: refDiscount ?? 0,
      },
      targetPpn: targetPpn ?? 0,
      tolerance: tolerance ?? 0,
      priceMin: isPriceLocked ? (refPrice ?? 0) : (priceMin ?? 0),
      priceMax: isPriceLocked ? (refPrice ?? 0) : (priceMax ?? 1000000),
      discountMin: isDiscountLocked ? (refDiscount ?? 0) : (discountMin ?? 0),
      discountMax: isDiscountLocked
        ? (refDiscount ?? 0)
        : (discountMax ?? 1000000),
      quantityMin: isQtyLocked ? (refQuantity ?? 1) : (qtyMin ?? 1),
      quantityMax: isQtyLocked ? (refQuantity ?? 1) : (qtyMax ?? 1000),
      quantityStep: qtyStep,
      priceStep: priceStep,
      discountStep: discountStep,
      alpha: 1,
      beta: 0.1,
      topNResults: topN,
    };

    // 5. Caching & Memoization Check
    const cached = await getFromCache(baseConfig);
    if (cached) {
      simResults = cached;
      simElapsed = performance.now() - startTime;
      simRunning = false;
      simProgress = 1;
      return;
    }

    // Prepare for parallel execution
    let activeWorkers = workers.length;
    let progressMap = new Map<number, number>();
    let workerResults: SerializableSimulationResult[][] = Array(
      workers.length,
    ).fill([]);

    // Logic to split the Qty range among workers
    const fullQtyRange = baseConfig.quantityMax - baseConfig.quantityMin;
    const sliceSize = Math.max(1, Math.floor(fullQtyRange / workers.length));

    workers.forEach((worker, i) => {
      const startQty = baseConfig.quantityMin + i * sliceSize;
      const endQty =
        i === workers.length - 1
          ? baseConfig.quantityMax
          : startQty + sliceSize - 1;

      const workerConfig = {
        ...baseConfig,
        quantityMin: startQty,
        quantityMax: Math.max(startQty, endQty),
      };

      worker.onerror = (error) => {
        console.error("Worker error:", error);
        simError = "Worker Error: Terjadi kesalahan di background thread.";
        simRunning = false;
      };

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;

        if (response.type === "progress") {
          progressMap.set(i, response.progress);
          const totalProgress =
            Array.from(progressMap.values()).reduce((a, b) => a + b, 0) /
            workers.length;
          simProgress = totalProgress;
          simEstimate = response.estimate * workers.length;
        } else if (response.type === "partial_result") {
          // 3. Incremental Result Streaming
          simResults = [...simResults, ...response.results];
        } else if (response.type === "result") {
          workerResults[i] = response.results;
          activeWorkers--;

          if (activeWorkers === 0) {
            // All workers finished
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
              // 1. Prioritize zero difference (Perfect Match)
              const aPerfect = a.ppnDifference === 0;
              const bPerfect = b.ppnDifference === 0;
              if (aPerfect && !bPerfect) return -1;
              if (!aPerfect && bPerfect) return 1;

              // 2. Fallback to similarity score (smaller is better)
              return a.score - b.score;
            });
            simResults = uniqueResults.slice(0, topN);

            simElapsed = performance.now() - startTime;
            simRunning = false;
            simProgress = 1;

            if (simResults.length === 0) {
              simError =
                "Tidak ditemukan hasil dalam toleransi yang ditentukan.";
            } else {
              saveToCache(baseConfig, simResults).catch(console.error);
            }
          }
        } else if (response.type === "error") {
          simError = response.message;
          simRunning = false;
        }
      };

      worker.postMessage({ type: "start", config: workerConfig });
    });
  }

  function handleCancel() {
    workers.forEach((w) => {
      w.postMessage({ type: "cancel" });
    });
    simRunning = false;
    simProgress = 0;
  }

  // Format elapsed time
  function formatElapsed(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  let copiedId: string | null = null;
  function copyToClipboard(text: string, id: string) {
    if (browser && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        copiedId = id;
        setTimeout(() => {
          if (copiedId === id) copiedId = null;
        }, 2000);
      });
    }
  }

  function formatValueForCopy(value: number): string {
    // Format to max 2 decimal places and remove trailing zeros
    // Use comma as decimal separator
    return parseFloat(value.toFixed(2)).toString().replace(".", ",");
  }
</script>

<div class="container">
  <div class="header">
    <h1>Demivio</h1>
    <p class="subtitle">
      Bayangkan kamu punya punya nilai PPN yang tidak kamu ketahui nilai harga,
      qty, atau potongannya. <br />Maka disini kamu bisa menemukan berbagai
      kombinasi untuk nilai PPN itu.
    </p>
  </div>

  <div class="dashboard-grid">
    <!-- SIDEBAR: Inputs -->
    <div class="sidebar">
      <div class="card">
        <h2 class="card-title">1. Transaksi Acuan</h2>
        <div class="form-row">
          <div class="form-group">
            <label for="ref-price">Harga Satuan (Rp)</label>
            <NumberInput
              id="ref-price"
              bind:value={refPrice}
              min={0}
              showLock={true}
              bind:locked={isPriceLocked}
            />
          </div>
          <div class="form-group">
            <label for="ref-qty">Qty</label>
            <NumberInput
              id="ref-qty"
              bind:value={refQuantity}
              min={0}
              showLock={true}
              bind:locked={isQtyLocked}
            />
          </div>
          <div class="form-group">
            <label for="ref-discount">Potongan (Rp)</label>
            <NumberInput
              id="ref-discount"
              bind:value={refDiscount}
              min={0}
              showLock={true}
              bind:locked={isDiscountLocked}
            />
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title">2. Target PPN</h2>
        <div class="form-row">
          <div class="form-group">
            <label for="target-ppn">Nominal PPN (Rp)</label>
            <NumberInput id="target-ppn" bind:value={targetPpn} min={0} />
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 0.5rem;">
        <div
          style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;"
        >
          <h2 class="card-title" style="margin-bottom: 0;">3. Parameter</h2>
          <button
            class="btn btn-sm btn-outline"
            on:click={() => (showParameters = !showParameters)}
            title={showParameters
              ? "Sembunyikan Parameter"
              : "Modifikasi Parameter"}
          >
            {showParameters ? "✕" : "⚙"}
          </button>
        </div>

        {#if showParameters}
          <div class="form-row">
            <div class="form-group">
              <label for="price-min">Harga Min (Rp)</label>
              <NumberInput id="price-min" bind:value={priceMin} min={0} />
            </div>
            <div class="form-group">
              <label for="price-max">Harga Max (Rp)</label>
              <NumberInput id="price-max" bind:value={priceMax} min={0} />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="discount-min">Potongan Min (Rp)</label>
              <NumberInput id="discount-min" bind:value={discountMin} min={0} />
            </div>
            <div class="form-group">
              <label for="discount-max">Potongan Max (Rp)</label>
              <NumberInput id="discount-max" bind:value={discountMax} min={0} />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="qty-min">Qty Min</label>
              <NumberInput id="qty-min" bind:value={qtyMin} min={1} />
            </div>
            <div class="form-group">
              <label for="qty-max">Qty Max</label>
              <NumberInput id="qty-max" bind:value={qtyMax} min={1} />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="top-n">Jumlah Hasil Maksimum</label>
              <NumberInput id="top-n" bind:value={topN} min={1} max={10000} />
            </div>
          </div>
        {/if}
      </div>

      <div style="display: flex; gap: 0.5rem;">
        <button
          class="btn btn-primary"
          style="flex: 1;"
          on:click={handleSimulate}
          disabled={simRunning}
        >
          {simRunning ? "..." : "Jalankan"}
        </button>
        {#if simRunning}
          <button
            class="btn btn-outline"
            style="background: var(--danger); color: white; border: none;"
            on:click={handleCancel}
          >
            Batal
          </button>
        {/if}
      </div>
    </div>

    <!-- MAIN CONTENT: Results -->
    <div class="main-content">
      {#if simRunning}
        <div class="card">
          <p>Memproses {simEstimate.toLocaleString()} kombinasi...</p>
          <div class="progress-bar">
            <div
              class="progress-fill"
              style="width: {simProgress * 100}%"
            ></div>
          </div>
        </div>
      {/if}

      {#if simError}
        <div class="error">{simError}</div>
      {/if}

      <div class="card">
        <h2 class="card-title">
          Hasil Pencarian ({simResults.length})
          {#if simElapsed > 0}
            <span
              style="font-weight: normal; font-size: 0.75rem; color: var(--text-muted);"
            >
              dalam {formatElapsed(simElapsed)}
            </span>
          {/if}
        </h2>
        {#if simResults.length > 0}
          <div style="flex: 1; overflow: auto; min-height: 0;">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Harga</th>
                  <th>Qty</th>
                  <th>Potongan</th>
                  <th>DPP Nilai Lain</th>
                  <th>PPN</th>
                  <th>Selisih</th>
                  <th style="text-align: center;">Kualitas</th>
                </tr>
              </thead>
              <tbody>
                {#each paginatedResults as result, i}
                  <tr>
                    <td
                      ><span class="badge badge-rank"
                        >{(currentPage - 1) * itemsPerPage + i + 1}</span
                      ></td
                    >
                    <td>
                      <div class="cell-content">
                        {formatRupiah(result.transaction.unitPrice)}
                        <button
                          class="btn-copy"
                          class:copied={copiedId === `price-${i}`}
                          on:click={() =>
                            copyToClipboard(
                              formatValueForCopy(result.transaction.unitPrice),
                              `price-${i}`,
                            )}
                          title="Salin Harga"
                        >
                          {copiedId === `price-${i}` ? "✓" : "❐"}
                        </button>
                      </div>
                    </td>
                    <td>{formatNumber(result.transaction.quantity)}</td>
                    <td>
                      <div class="cell-content">
                        {formatRupiah(result.transaction.discount)}
                        <button
                          class="btn-copy"
                          class:copied={copiedId === `discount-${i}`}
                          on:click={() =>
                            copyToClipboard(
                              formatValueForCopy(result.transaction.discount),
                              `discount-${i}`,
                            )}
                          title="Salin Potongan"
                        >
                          {copiedId === `discount-${i}` ? "✓" : "❐"}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div class="cell-content">
                        {formatRupiah(result.metadata.dppNilaiLain)}
                        <button
                          class="btn-copy"
                          class:copied={copiedId === `dpp-${i}`}
                          on:click={() =>
                            copyToClipboard(
                              formatValueForCopy(result.metadata.dppNilaiLain),
                              `dpp-${i}`,
                            )}
                          title="Salin DPP Nilai Lain"
                        >
                          {copiedId === `dpp-${i}` ? "✓" : "❐"}
                        </button>
                      </div>
                    </td>
                    <td>{formatRupiah(result.calculatedPpn)}</td>
                    <td>{formatRupiah(result.ppnDifference)}</td>
                    <td style="text-align: center;">
                      <div
                        class="accuracy-badge"
                        style="background: {result.humanScore?.color ||
                          '#9ca3af'}"
                      >
                        <span class="accuracy-pct"
                          >{result.humanScore?.accuracy ?? 0}%</span
                        >
                        <span class="accuracy-label"
                          >{result.humanScore?.label || "Mendekati"}</span
                        >
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Pagination Controls -->
          {#if totalPages > 1}
            <div
              style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--border);"
            >
              <button
                class="btn btn-sm btn-outline"
                disabled={currentPage === 1}
                on:click={() => changePage(currentPage - 1)}
              >
                &laquo; Sebelumnya
              </button>
              <span style="font-size: 0.875rem; color: var(--text-muted);">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                class="btn btn-sm btn-outline"
                disabled={currentPage === totalPages}
                on:click={() => changePage(currentPage + 1)}
              >
                Selanjutnya &raquo;
              </button>
            </div>
          {/if}
        {:else if !simRunning}
          <div
            style="display: flex; align-items: center; justify-content: center; padding: 3rem 0; color: var(--text-muted);"
          >
            Silakan jalankan simulasi untuk melihat hasil.
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .cell-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .btn-copy {
    background: white;
    border: 1px solid var(--primary-light);
    border-radius: 4px;
    padding: 2px 6px;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--primary);
    transition: all 0.2s;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
  }

  .btn-copy:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: rgba(251, 191, 36, 0.1);
  }

  .btn-copy.copied {
    background: var(--success);
    color: white;
    border-color: var(--success);
  }

  .accuracy-badge {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px 8px;
    border-radius: 6px;
    color: white;
    min-width: 80px;
    line-height: 1.2;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .accuracy-pct {
    font-weight: bold;
    font-size: 0.875rem;
  }

  .accuracy-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    opacity: 0.9;
  }
</style>
