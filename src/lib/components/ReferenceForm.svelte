<script lang="ts">
  import NumberInput from "./NumberInput.svelte";

  export let refPrice: number;
  export let refQuantity: number;
  export let refDiscount: number;
  export let isPriceLocked: boolean;
  export let isQtyLocked: boolean;
  export let isDiscountLocked: boolean;
</script>

<div class="card ref-card animate-in">
  <header class="card-header">
    <div class="card-header-main">
      <div class="step-badge">1</div>
      <h2 class="card-title">Transaksi Acuan</h2>
    </div>
  </header>
  
  <div class="form-content">
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
      <label for="ref-qty">Kuantitas</label>
      <NumberInput
        id="ref-qty"
        bind:value={refQuantity}
        min={0}
        showLock={true}
        bind:locked={isQtyLocked}
      />
    </div>
    <div class="form-group">
      <label for="ref-discount">Potongan / Diskon (Rp)</label>
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

<style>
  .ref-card {
    padding: 0;
    overflow: hidden;
  }

  .card-title {
    font-size: var(--text-xs);
  }

  .form-content {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
</style>
