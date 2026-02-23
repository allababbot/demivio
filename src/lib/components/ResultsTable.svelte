<script lang="ts">
  import type { SerializableSimulationResult } from "$lib/worker-types";
  import { formatRupiah, formatNumber } from "$lib";
  import { exportResultsToCsv } from "$lib/exportCsv";
  import { browser } from "$app/environment";

  export let results: SerializableSimulationResult[] = [];
  export let simElapsed: number = 0;
  export let simRunning: boolean = false;

  // Pagination
  let currentPage = 1;
  const itemsPerPage = 10;
  $: paginatedResults = results.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  $: totalPages = Math.ceil(results.length / itemsPerPage);
  $: if (results) currentPage = 1; // Reset page when results change

  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
    }
  }

  // Format elapsed time
  function formatElapsed(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  // Clipboard
  let copiedId: string | null = null;

  function copyToClipboard(text: string, id: string) {
    if (browser && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        copiedId = id;
        setTimeout(() => {
          if (copiedId === id) copiedId = null;
        }, 2000);
      });
    }
  }

  function formatValueForCopy(value: number): string {
    return parseFloat(value.toFixed(2)).toString().replace(".", ",");
  }
</script>

<div class="card">
  <h2
    class="card-title"
    style="display: flex; align-items: center; gap: 0.5rem;"
  >
    <span>Hasil Pencarian ({results.length})</span>
    {#if simElapsed > 0}
      <span
        style="font-weight: normal; font-size: 0.75rem; color: var(--text-muted);"
      >
        dalam {formatElapsed(simElapsed)}
      </span>
    {/if}
    {#if results.length > 0}
      <button
        class="btn btn-sm btn-outline"
        style="margin-left: auto; font-size: 0.75rem;"
        on:click={() => exportResultsToCsv(results)}
        title="Export ke CSV (Ctrl+E)"
      >
        ⬇ CSV
      </button>
    {/if}
  </h2>
  {#if results.length > 0}
    <div style="flex: 1; overflow: auto; min-height: 0;">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Harga</th>
            <th>Qty</th>
            <th>Potongan</th>
            <th>DPP Nilai Lain</th>
            <th>PPN</th>
            <th>Selisih</th>
            <th style="text-align: center;">Kualitas</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedResults as result, i}
            <tr>
              <td
                ><span class="badge badge-rank"
                  >{(currentPage - 1) * itemsPerPage + i + 1}</span
                ></td
              >
              <td>
                <div class="cell-content">
                  {formatRupiah(result.transaction.unitPrice)}
                  <button
                    class="btn-copy"
                    class:copied={copiedId === `price-${i}`}
                    on:click={() =>
                      copyToClipboard(
                        formatValueForCopy(result.transaction.unitPrice),
                        `price-${i}`,
                      )}
                    title="Salin Harga"
                  >
                    {copiedId === `price-${i}` ? "✓" : "❐"}
                  </button>
                </div>
              </td>
              <td>{formatNumber(result.transaction.quantity)}</td>
              <td>
                <div class="cell-content">
                  {formatRupiah(result.transaction.discount)}
                  <button
                    class="btn-copy"
                    class:copied={copiedId === `discount-${i}`}
                    on:click={() =>
                      copyToClipboard(
                        formatValueForCopy(result.transaction.discount),
                        `discount-${i}`,
                      )}
                    title="Salin Potongan"
                  >
                    {copiedId === `discount-${i}` ? "✓" : "❐"}
                  </button>
                </div>
              </td>
              <td>
                <div class="cell-content">
                  {formatRupiah(result.metadata.dppNilaiLain)}
                  <button
                    class="btn-copy"
                    class:copied={copiedId === `dpp-${i}`}
                    on:click={() =>
                      copyToClipboard(
                        formatValueForCopy(result.metadata.dppNilaiLain),
                        `dpp-${i}`,
                      )}
                    title="Salin DPP Nilai Lain"
                  >
                    {copiedId === `dpp-${i}` ? "✓" : "❐"}
                  </button>
                </div>
              </td>
              <td>{formatRupiah(result.calculatedPpn)}</td>
              <td>{formatRupiah(result.ppnDifference)}</td>
              <td style="text-align: center;">
                <div
                  class="accuracy-badge"
                  style="background: {result.humanScore?.color || '#9ca3af'}"
                >
                  <span class="accuracy-pct"
                    >{result.humanScore?.accuracy ?? 0}%</span
                  >
                  <span class="accuracy-label"
                    >{result.humanScore?.label || "Mendekati"}</span
                  >
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination Controls -->
    {#if totalPages > 1}
      <div
        style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--border);"
      >
        <button
          class="btn btn-sm btn-outline"
          disabled={currentPage === 1}
          on:click={() => changePage(currentPage - 1)}
        >
          &laquo; Sebelumnya
        </button>
        <span style="font-size: 0.875rem; color: var(--text-muted);">
          Halaman {currentPage} dari {totalPages}
        </span>
        <button
          class="btn btn-sm btn-outline"
          disabled={currentPage === totalPages}
          on:click={() => changePage(currentPage + 1)}
        >
          Selanjutnya &raquo;
        </button>
      </div>
    {/if}
  {:else if !simRunning}
    <div
      style="display: flex; align-items: center; justify-content: center; padding: 3rem 0; color: var(--text-muted);"
    >
      Silakan jalankan simulasi untuk melihat hasil.
    </div>
  {/if}
</div>

<style>
  .cell-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .btn-copy {
    background: var(--bg-card, white);
    border: 1px solid var(--primary-light);
    border-radius: 4px;
    padding: 2px 6px;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--primary);
    transition: all 0.2s;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
  }

  .btn-copy:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: rgba(251, 191, 36, 0.1);
  }

  .btn-copy.copied {
    background: var(--success);
    color: white;
    border-color: var(--success);
  }

  .accuracy-badge {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2px 8px;
    border-radius: 6px;
    color: white;
    min-width: 80px;
    line-height: 1.2;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .accuracy-pct {
    font-weight: bold;
    font-size: 0.875rem;
  }

  .accuracy-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    opacity: 0.9;
  }
</style>
