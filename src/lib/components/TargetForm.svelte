<script lang="ts">
  import NumberInput from "./NumberInput.svelte";

  export let targetPpn: number;
</script>

<div class="card">
  <h2 class="card-title">2. Target PPN</h2>
  <div class="form-row">
    <div class="form-group">
      <label for="target-ppn">Nominal PPN (Rp)</label>
      <NumberInput id="target-ppn" bind:value={targetPpn} min={0} />
    </div>
  </div>
</div>
