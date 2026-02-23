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

<div class="card" style="margin-bottom: 0.5rem;">
  <div
    style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;"
  >
    <h2 class="card-title" style="margin-bottom: 0;">3. Parameter</h2>
    <button
      class="btn btn-sm btn-outline"
      on:click={() => (showParameters = !showParameters)}
      title={showParameters ? "Sembunyikan Parameter" : "Modifikasi Parameter"}
    >
      {showParameters ? "✕" : "⚙"}
    </button>
  </div>

  {#if showParameters}
    <div class="form-col-2">
      <div class="form-group">
        <label for="price-min">Harga Min (Rp)</label>
        <NumberInput id="price-min" bind:value={priceMin} min={0} />
      </div>
      <div class="form-group">
        <label for="price-max">Harga Max (Rp)</label>
        <NumberInput id="price-max" bind:value={priceMax} min={0} />
      </div>
    </div>
    <div class="form-col-2">
      <div class="form-group">
        <label for="discount-min">Potongan Min (Rp)</label>
        <NumberInput id="discount-min" bind:value={discountMin} min={0} />
      </div>
      <div class="form-group">
        <label for="discount-max">Potongan Max (Rp)</label>
        <NumberInput id="discount-max" bind:value={discountMax} min={0} />
      </div>
    </div>
    <div class="form-col-2">
      <div class="form-group">
        <label for="qty-min">Qty Min</label>
        <NumberInput id="qty-min" bind:value={qtyMin} min={1} />
      </div>
      <div class="form-group">
        <label for="qty-max">Qty Max</label>
        <NumberInput id="qty-max" bind:value={qtyMax} min={1} />
      </div>
    </div>
    <div class="form-col-2">
      <div class="form-group">
        <label for="top-n">Jumlah Hasil Maksimum</label>
        <NumberInput id="top-n" bind:value={topN} min={1} max={10000} />
      </div>
      <div class="form-group">
        <label for="tolerance">Toleransi Selisih PPN</label>
        <NumberInput id="tolerance" bind:value={tolerance} min={0} />
      </div>
    </div>
  {/if}
</div>
