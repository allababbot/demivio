<script lang="ts">
import Decimal from "decimal.js";
import {
	formatRupiah,
	formatNumber,
	runSimulation,
	validateConfig,
	estimateCombinations,
	createTransaction,
	getDefaultConfig,
} from "$lib";
import type { SimulationResult } from "$lib/types";
import NumberInput from "$lib/components/NumberInput.svelte";

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

let simResults: SimulationResult[] = [];
let simError: string | null = null;
let simRunning = false;
let simProgress = 0;
let simEstimate = 0;
let showParameters = false;

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

function handleSimulate() {
	simError = null;
	simResults = [];
	currentPage = 1; // Reset pagination
	simRunning = true;
	simProgress = 0;

	const config = {
		...getDefaultConfig(),
		referenceTransaction: createTransaction(
			refPrice ?? 0,
			refQuantity ?? 0,
			refDiscount ?? 0,
		),
		targetPpn: new Decimal(targetPpn ?? 0),
		tolerance: new Decimal(tolerance ?? 0),
		unitPriceVariancePercent: new Decimal(priceVariance ?? 0),
		discountVariancePercent: new Decimal(discountVariance ?? 0),
		quantityMin: new Decimal(qtyMin ?? 1),
		quantityMax: new Decimal(qtyMax ?? 100),
		quantityStep: new Decimal(qtyStep ?? 1),
		priceStep: new Decimal(priceStep ?? 100),
		discountStep: new Decimal(discountStep ?? 100),
		topNResults: topN ?? 10,
	};

	const error = validateConfig(config);
	if (error) {
		simError = error;
		simRunning = false;
		return;
	}

	simEstimate = estimateCombinations(config);

	// Run simulation with setTimeout to allow UI updates
	setTimeout(() => {
		try {
			simResults = runSimulation(config, (progress) => {
				simProgress = progress;
			});
			simResults.sort((a, b) =>
				a.ppnDifference.abs().minus(b.ppnDifference.abs()).toNumber(),
			);

			if (simResults.length === 0) {
				simError =
					"Tidak ditemukan hasil dalam toleransi yang ditentukan. Coba perbesar toleransi atau range.";
			}
		} catch (e) {
			simError = e instanceof Error ? e.message : "Terjadi kesalahan";
		}
		simRunning = false;
		simProgress = 1;
	}, 50);
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
            <label>Harga Satuan (Rp)</label>
            <NumberInput bind:value={refPrice} min={0} />
          </div>
          <div class="form-group">
            <label>Qty</label>
            <NumberInput bind:value={refQuantity} min={0} />
          </div>
          <div class="form-group">
            <label>Potongan (Rp)</label>
            <NumberInput bind:value={refDiscount} min={0} />
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title">2. Target PPN</h2>
        <div class="form-row">
          <div class="form-group">
            <NumberInput bind:value={targetPpn} min={0} />
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h2 class="card-title" style="margin-bottom: 0;">3. Parameter</h2>
            <button class="btn btn-sm btn-outline" on:click={() => showParameters = !showParameters}>
                {showParameters ? "Sembunyikan" : "Modifikasi"}
            </button>
        </div>
        
        {#if showParameters}
        <div class="form-row">
          <div class="form-group">
            <label>Var Harga (%)</label>
            <NumberInput bind:value={priceVariance} min={0} max={100} />
          </div>
          <div class="form-group">
            <label>Var Potongan (%)</label>
            <NumberInput bind:value={discountVariance} min={0} max={100} />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Qty Min</label>
            <NumberInput bind:value={qtyMin} min={1} />
          </div>
          <div class="form-group">
            <label>Qty Max</label>
            <NumberInput bind:value={qtyMax} min={1} />
          </div>
        </div>

        {/if}
      </div>

      <button
          class="btn btn-primary"
          style="width: 100%;"
          on:click={handleSimulate}
          disabled={simRunning}
      >
          {simRunning ? "..." : "Jalankan"}
      </button>
    </div>

    <!-- MAIN CONTENT: Results -->
    <div class="main-content">
       {#if simRunning}
        <div class="card">
          <p>Memproses {simEstimate.toLocaleString()} kombinasi...</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: {simProgress * 100}%"></div>
          </div>
        </div>
      {/if}

      {#if simError}
        <div class="error">{simError}</div>
      {/if}

      <div class="card">
         <h2 class="card-title">
            Hasil Pencarian ({simResults.length})
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
                    <td><span class="badge badge-rank">{(currentPage - 1) * itemsPerPage + i + 1}</span></td>
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--border);">
                <button class="btn btn-sm btn-outline" disabled={currentPage === 1} on:click={() => changePage(currentPage - 1)}>
                    &laquo; Sebelumnya
                </button>
                <span style="font-size: 0.875rem; color: var(--text-muted);">
                    Halaman {currentPage} dari {totalPages}
                </span>
                <button class="btn btn-sm btn-outline" disabled={currentPage === totalPages} on:click={() => changePage(currentPage + 1)}>
                    Selanjutnya &raquo;
                </button>
            </div>
          {/if}
         {:else if !simRunning}
            <div style="display: flex; align-items: center; justify-content: center; padding: 3rem 0; color: var(--text-muted);">
                Silakan jalankan simulasi untuk melihat hasil.
            </div>
         {/if}
      </div>
    </div>
  </div>
</div>
