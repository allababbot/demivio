<script lang="ts">
  export let progress: number = 0;
  export let estimate: number = 0;
</script>

<div class="card">
  <p>Memproses {estimate.toLocaleString()} kombinasi...</p>
  <div class="progress-bar">
    <div class="progress-fill" style="width: {progress * 100}%"></div>
  </div>
</div>
