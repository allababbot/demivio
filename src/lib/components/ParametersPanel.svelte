<script lang="ts">
  import NumberInput from "./NumberInput.svelte";

  export let showParameters: boolean;
  export let priceMin: number;
  export let priceMax: number;
  export let discountMin: number;
  export let discountMax: number;
  export let qtyMin: number;
  export let qtyMax: number;
  export let topN: number;
  export let tolerance: number;
</script>

<div class="card parameters-card animate-in">
  <header class="card-header">
    <div class="card-header-main">
      <div class="step-badge">3</div>
      <h2 class="card-title">Parameter Simulasi</h2>
    </div>
    <div class="card-header-actions">
      <button
        class="btn btn-outline btn-icon-only"
        on:click={() => (showParameters = !showParameters)}
        title={showParameters ? "Sembunyikan Parameter" : "Modifikasi Parameter"}
      >
        {#if showParameters}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        {/if}
      </button>
    </div>
  </header>

  {#if showParameters}
    <div class="parameters-grid">
      <div class="form-row">
        <div class="form-group">
          <label for="price-min">Harga Satuan Min (Rp)</label>
          <NumberInput id="price-min" bind:value={priceMin} min={0} />
        </div>
        <div class="form-group">
          <label for="price-max">Harga Satuan Max (Rp)</label>
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
          <label for="qty-min">Kuantitas Min</label>
          <NumberInput id="qty-min" bind:value={qtyMin} min={1} />
        </div>
        <div class="form-group">
          <label for="qty-max">Kuantitas Max</label>
          <NumberInput id="qty-max" bind:value={qtyMax} min={1} />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="top-n">Batas Hasil</label>
          <NumberInput id="top-n" bind:value={topN} min={1} max={10000} />
        </div>
        <div class="form-group">
          <label for="tolerance">Toleransi PPN</label>
          <NumberInput id="tolerance" bind:value={tolerance} min={0} />
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .parameters-card {
    background: var(--surface);
    margin-bottom: var(--space-2);
    padding: 0;
    overflow: hidden;
  }

  .card-title {
    font-size: var(--text-xs);
  }

  .parameters-grid {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }
</style>
