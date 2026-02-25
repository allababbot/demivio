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
  $: if (results || currentPage) selectedRowIndex = null;

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

  // Clipboard and Row Selection
  let copiedId: string | null = null;
  let selectedRowIndex: number | null = null;

  function copyToClipboard(text: string, id: string, rowIndex: number) {
    selectedRowIndex = rowIndex;
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
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <tr
              class:selected={selectedRowIndex === i}
              on:click={() => (selectedRowIndex = i)}
              style="cursor: pointer;"
            >
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
                    on:click|stopPropagation={() =>
                      copyToClipboard(
                        formatValueForCopy(result.transaction.unitPrice),
                        `price-${i}`,
                        i,
                      )}
                    title="Salin Harga"
                  >
                    {#if copiedId === `price-${i}`}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><polyline points="20 6 9 17 4 12"></polyline></svg
                      >
                    {:else}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><rect x="9" y="9" width="13" height="13" rx="2" ry="2"
                        ></rect><path
                          d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        ></path></svg
                      >
                    {/if}
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
                    on:click|stopPropagation={() =>
                      copyToClipboard(
                        formatValueForCopy(result.transaction.discount),
                        `discount-${i}`,
                        i,
                      )}
                    title="Salin Potongan"
                  >
                    {#if copiedId === `discount-${i}`}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><polyline points="20 6 9 17 4 12"></polyline></svg
                      >
                    {:else}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><rect x="9" y="9" width="13" height="13" rx="2" ry="2"
                        ></rect><path
                          d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        ></path></svg
                      >
                    {/if}
                  </button>
                </div>
              </td>
              <td>
                <div class="cell-content">
                  {formatRupiah(result.metadata.dppNilaiLain)}
                  <button
                    class="btn-copy"
                    class:copied={copiedId === `dpp-${i}`}
                    on:click|stopPropagation={() =>
                      copyToClipboard(
                        formatValueForCopy(result.metadata.dppNilaiLain),
                        `dpp-${i}`,
                        i,
                      )}
                    title="Salin DPP Nilai Lain"
                  >
                    {#if copiedId === `dpp-${i}`}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><polyline points="20 6 9 17 4 12"></polyline></svg
                      >
                    {:else}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><rect x="9" y="9" width="13" height="13" rx="2" ry="2"
                        ></rect><path
                          d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        ></path></svg
                      >
                    {/if}
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
    background: transparent;
    border: none;
    border-radius: 4px;
    padding: 2px 6px;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--text-muted);
    transition: all 0.2s;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
  }

  .btn-copy:hover {
    color: var(--primary);
    background: rgba(251, 191, 36, 0.1);
  }

  .btn-copy.copied {
    background: transparent;
    color: var(--success);
  }

  tr.selected {
    background: rgba(217, 119, 6, 0.06);
    box-shadow: inset 3px 0 0 var(--primary);
  }

  :global([data-theme="dark"]) tr.selected {
    background: rgba(245, 158, 11, 0.12);
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
