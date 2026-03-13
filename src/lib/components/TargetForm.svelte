<script lang="ts">
  import NumberInput from "./NumberInput.svelte";

  export let targetPpn: number;
</script>

<div class="card target-card animate-in">
  <header class="card-header">
    <div class="card-header-main">
      <div class="step-badge">2</div>
      <h2 class="card-title">Target PPN</h2>
    </div>
  </header>
  
  <div class="form-content">
    <div class="form-group">
      <label for="target-ppn">Nominal PPN Sasaran (Rp)</label>
      <NumberInput id="target-ppn" bind:value={targetPpn} min={0} />
    </div>
  </div>
</div>

<style>
  .target-card {
    padding: 0;
    overflow: hidden;
  }

  .card-title {
    font-size: var(--text-xs);
  }

  .form-content {
    padding: var(--space-4);
  }
</style>
