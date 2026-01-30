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

  // Simulate form
  let refPrice = 50000;
  let refQuantity = 20;
  let refDiscount = 15000;
  let targetPpn = 120000;
  let tolerance = 1;
  let priceVariance = 5;
  let discountVariance = 5;
  let qtyMin = 1;
  let qtyMax = 100;
  let qtyStep = 1;
  let priceStep = 1;
  let discountStep = 1;

  let topN = 10000;

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

  // Web Worker
  let worker: Worker | null = null;

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

  // Initialize worker on mount
  onMount(() => {
    if (browser) {
      worker = new Worker(
        new URL("$lib/simulator.worker.ts", import.meta.url),
        { type: "module" },
      );

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;

        if (response.type === "progress") {
          simProgress = response.progress;
          simEstimate = response.estimate;
        } else if (response.type === "result") {
          simResults = response.results;
          simElapsed = response.elapsed;
          simRunning = false;
          simProgress = 1;

          if (simResults.length === 0) {
            simError =
              "Tidak ditemukan hasil dalam toleransi yang ditentukan. Coba perbesar toleransi atau range.";
          }
        } else if (response.type === "error") {
          simError = response.message;
          simRunning = false;
        }
      };

      worker.onerror = (error) => {
        simError = `Worker error: ${error.message}`;
        simRunning = false;
      };
    }
  });

  // Clean up worker on destroy
  onDestroy(() => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  });

  function handleSimulate() {
    if (!worker) {
      simError = "Worker tidak tersedia";
      return;
    }

    simError = null;
    simResults = [];
    currentPage = 1; // Reset pagination
    simRunning = true;
    simProgress = 0;
    simElapsed = 0;

    // Build serializable config
    const config: SerializableSimulationConfig = {
      referenceTransaction: {
        unitPrice: refPrice ?? 0,
        quantity: refQuantity ?? 0,
        discount: refDiscount ?? 0,
      },
      targetPpn: targetPpn ?? 0,
      tolerance: tolerance ?? 0,
      unitPriceVariancePercent: isPriceLocked ? 0 : (priceVariance ?? 0),
      discountVariancePercent: isDiscountLocked ? 0 : (discountVariance ?? 0),
      quantityMin: isQtyLocked ? (refQuantity ?? 1) : (qtyMin ?? 1),
      quantityMax: isQtyLocked ? (refQuantity ?? 100) : (qtyMax ?? 100),
      quantityStep: qtyStep ?? 1,
      priceStep: priceStep ?? 100,
      discountStep: discountStep ?? 100,
      alpha: 1,
      beta: 1,
      topNResults: topN ?? 10,
    };

    // Send to worker
    const request: WorkerRequest = { type: "start", config };
    worker.postMessage(request);
  }

  function handleCancel() {
    if (worker) {
      const request: WorkerRequest = { type: "cancel" };
      worker.postMessage(request);
      simRunning = false;
      simProgress = 0;
    }
  }

  // Format elapsed time
  function formatElapsed(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
</script>

<div class="container">
  <div class="header">
    <h1>Demivio</h1>
    <p class="subtitle">Kamu bong-bong yaa</p>
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
          >
            {showParameters ? "Sembunyikan" : "Modifikasi"}
          </button>
        </div>

        {#if showParameters}
          <div class="form-row">
            <div class="form-group">
              <label for="price-variance">Var Harga (%)</label>
              <NumberInput
                id="price-variance"
                bind:value={priceVariance}
                min={0}
                max={100}
              />
            </div>
            <div class="form-group">
              <label for="discount-variance">Var Potongan (%)</label>
              <NumberInput
                id="discount-variance"
                bind:value={discountVariance}
                min={0}
                max={100}
              />
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
                  <th>PPN</th>
                  <th>Selisih</th>
                  <th>Score</th>
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
                    <td>{formatRupiah(result.transaction.unitPrice)}</td>
                    <td>{formatNumber(result.transaction.quantity)}</td>
                    <td>{formatRupiah(result.transaction.discount)}</td>
                    <td>{formatRupiah(result.calculatedPpn)}</td>
                    <td>{formatRupiah(result.ppnDifference)}</td>
                    <td>{formatNumber(result.score)}</td>
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
