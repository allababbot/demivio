<script lang="ts">
  export let progress: number = 0;
  export let estimate: number = 0;
</script>

<div class="card">
  <p>
    {#if estimate > 0}
      Memproses {estimate.toLocaleString()} kombinasi... {(
        progress * 100
      ).toFixed(1)}%
    {:else}
      Memproses...
    {/if}
  </p>
  <div class="progress-bar">
    <div class="progress-fill" style="width: {progress * 100}%"></div>
  </div>
</div>
