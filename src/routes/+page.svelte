<script lang="ts">
  import "../app.css";
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

  // Simulate form
  let refPrice = 50000;
  let refQuantity = 20;
  let refDiscount = 15000;
  let targetPpn = 120000;
  let tolerance = 5000;
  let priceVariance = 5;
  let discountVariance = 5;
  let qtyMin = 1;
  let qtyMax = 100;
  let qtyStep = 1;
  let priceStep = 100;
  let discountStep = 100;
  let topN = 10;

  let simResults: SimulationResult[] = [];
  let simError: string | null = null;
  let simRunning = false;
  let simProgress = 0;
  let simEstimate = 0;

  function handleSimulate() {
    simError = null;
    simResults = [];
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
  <h1>Demivio</h1>
  <p class="subtitle">Simulasi Perhitungan Pajak Pertambahan Nilai Indonesia</p>

  <div class="card">
    <h2 class="card-title">Transaksi Acuan</h2>

    <div class="form-row">
      <div class="form-group">
        <label>
          Harga Satuan Acuan (Rp)
          <input type="number" bind:value={refPrice} min="0" />
        </label>
      </div>
      <div class="form-group">
        <label>
          Kuantitas Acuan
          <input type="number" bind:value={refQuantity} min="0" />
        </label>
      </div>
      <div class="form-group">
        <label>
          Potongan Acuan (Rp)
          <input type="number" bind:value={refDiscount} min="0" />
        </label>
      </div>
    </div>
  </div>

  <div class="card">
    <h2 class="card-title">Target &amp; Toleransi</h2>

    <div class="form-row">
      <div class="form-group">
        <label>
          Target PPN (Rp)
          <input type="number" bind:value={targetPpn} min="0" />
        </label>
      </div>
      <div class="form-group">
        <label>
          Toleransi Selisih (Rp)
          <input type="number" bind:value={tolerance} min="0" />
        </label>
      </div>
      <div class="form-group">
        <label>
          Jumlah Hasil
          <input type="number" bind:value={topN} min="1" max="100" />
        </label>
      </div>
    </div>
  </div>

  <div class="card">
    <h2 class="card-title">Parameter Pencarian</h2>

    <div class="form-row">
      <div class="form-group">
        <label>
          Variance Harga (%)
          <input type="number" bind:value={priceVariance} min="0" max="100" />
        </label>
      </div>
      <div class="form-group">
        <label>
          Variance Potongan (%)
          <input type="number" bind:value={discountVariance} min="0" max="100" />
        </label>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>
          Kuantitas Min
          <input type="number" bind:value={qtyMin} min="1" />
        </label>
      </div>
      <div class="form-group">
        <label>
          Kuantitas Max
          <input type="number" bind:value={qtyMax} min="1" />
        </label>
      </div>
      <div class="form-group">
        <label>
          Step Kuantitas
          <input type="number" bind:value={qtyStep} min="0.1" step="0.1" />
        </label>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>
          Step Potongan (Rp)
          <input type="number" bind:value={discountStep} min="1" />
        </label>
      </div>
      <div class="form-group">
        <label>
          Pembulatan Harga (Rp)
          <input type="number" bind:value={priceStep} min="1" />
        </label>
      </div>
    </div>

    <p class="info-text">
      💡 Harga satuan dihitung secara matematis dari rumus PPN. Pembulatan harga
      digunakan untuk hasil yang lebih praktis.
    </p>
  </div>

  <button
    class="btn btn-primary"
    on:click={handleSimulate}
    disabled={simRunning}
  >
    {simRunning ? "Menjalankan Simulasi..." : "🚀 Jalankan Simulasi"}
  </button>

  {#if simRunning}
    <div class="card" style="margin-top: 1rem;">
      <p>Memproses {simEstimate.toLocaleString()} kombinasi...</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {simProgress * 100}%"></div>
      </div>
    </div>
  {/if}

  {#if simError}
    <div class="error" style="margin-top: 1rem;">{simError}</div>
  {/if}

  {#if simResults.length > 0}
    <div class="card" style="margin-top: 1.5rem;">
      <h2 class="card-title">
        ✅ Ditemukan {simResults.length} Hasil
      </h2>

      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Harga Satuan</th>
              <th>Qty</th>
              <th>Potongan</th>
              <th>PPN</th>
              <th>Selisih</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {#each simResults as result, i}
              <tr>
                <td><span class="badge badge-rank">{i + 1}</span></td>
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

      <p class="info-text">
        💡 Score lebih kecil = hasil lebih baik (mendekati target dengan
        parameter mirip acuan)
      </p>
    </div>
  {/if}
</div>
