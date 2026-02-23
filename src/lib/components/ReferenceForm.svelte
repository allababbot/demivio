<script lang="ts">
  import NumberInput from "./NumberInput.svelte";

  export let refPrice: number;
  export let refQuantity: number;
  export let refDiscount: number;
  export let isPriceLocked: boolean;
  export let isQtyLocked: boolean;
  export let isDiscountLocked: boolean;
</script>

<div class="card">
  <h2 class="card-title">1. Transaksi Acuan</h2>
  <div>
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
