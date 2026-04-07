<script lang="ts">
  import type { SerializableSimulationResult } from "$lib/worker-types";
  import { formatRupiah, formatNumber } from "$lib";
  import { exportResultsToExcel } from "$lib/exportExcel";
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

<div class="card results-card animate-in">
  <header class="card-header">
    <div class="card-header-main">
      <h2 class="card-title">Hasil Pencarian</h2>
      <span class="results-count">{results.length} temuan</span>
      {#if simElapsed > 0}
        <span class="elapsed-time">dalam {formatElapsed(simElapsed)}</span>
      {/if}
    </div>
    
    {#if results.length > 0}
      <div class="card-header-actions">
        <button
          class="btn btn-outline btn-export"
          on:click={() => exportResultsToExcel(results, "demivio-kalkulator.xlsx")}
          title="Export ke Excel (Ctrl+E)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          <span>Excel</span>
        </button>
      </div>
    {/if}
  </header>

  {#if results.length > 0}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Harga Satuan</th>
            <th>Kuantitas</th>
            <th>Potongan</th>
            <th>DPP Nilai Lain</th>
            <th>PPN</th>
            <th>Selisih</th>
            <th class="text-center">Kualitas</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedResults as result, i}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <tr
              class:selected={selectedRowIndex === i}
              on:click={() => (selectedRowIndex = i)}
            >
              <td>
                <span class="rank-badge">{(currentPage - 1) * itemsPerPage + i + 1}</span>
              </td>
              <td>
                <div class="cell-with-copy">
                  <span class="monospaced">{formatRupiah(result.transaction.unitPrice)}</span>
                  <button
                    class="btn-copy"
                    class:copied={copiedId === `price-${i}`}
                    on:click|stopPropagation={() => copyToClipboard(formatValueForCopy(result.transaction.unitPrice), `price-${i}`, i)}
                    title="Salin Harga"
                  >
                    {#if copiedId === `price-${i}`}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {:else}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    {/if}
                  </button>
                </div>
              </td>
              <td class="monospaced">{formatNumber(result.transaction.quantity)}</td>
              <td>
                <div class="cell-with-copy">
                  <span class="monospaced">{formatRupiah(result.transaction.discount)}</span>
                  <button
                    class="btn-copy"
                    class:copied={copiedId === `discount-${i}`}
                    on:click|stopPropagation={() => copyToClipboard(formatValueForCopy(result.transaction.discount), `discount-${i}`, i)}
                    title="Salin Potongan"
                  >
                    {#if copiedId === `discount-${i}`}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {:else}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    {/if}
                  </button>
                </div>
              </td>
              <td>
                <div class="cell-with-copy">
                  <span class="monospaced">{formatRupiah(result.metadata.dppNilaiLain)}</span>
                  <button
                    class="btn-copy"
                    class:copied={copiedId === `dpp-${i}`}
                    on:click|stopPropagation={() => copyToClipboard(formatValueForCopy(result.metadata.dppNilaiLain), `dpp-${i}`, i)}
                    title="Salin DPP Nilai Lain"
                  >
                    {#if copiedId === `dpp-${i}`}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {:else}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    {/if}
                  </button>
                </div>
              </td>
              <td class="monospaced">{formatRupiah(result.calculatedPpn)}</td>
              <td class="monospaced highlight-diff">{formatRupiah(result.ppnDifference)}</td>
              <td>
                <div class="accuracy-indicator" style="--accuracy-color: {result.humanScore?.color || 'var(--text-muted)'}">
                  <div class="accuracy-bar-bg"><div class="accuracy-bar" style="width: {result.humanScore?.accuracy ?? 0}%"></div></div>
                  <span class="accuracy-text">{result.humanScore?.label || "Mendekati"}</span>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if totalPages > 1}
      <footer class="table-footer">
        <button class="btn btn-outline btn-icon" disabled={currentPage === 1} on:click={() => changePage(currentPage - 1)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span>Sebelumnya</span>
        </button>
        <div class="pagination-info">
          Halaman <span class="current">{currentPage}</span> dari <span class="total">{totalPages}</span>
        </div>
        <button class="btn btn-outline btn-icon" disabled={currentPage === totalPages} on:click={() => changePage(currentPage + 1)}>
          <span>Selanjutnya</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </footer>
    {/if}
  {:else if !simRunning}
    <div class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
      </div>
      <p>Silakan jalankan simulasi untuk melihat hasil.</p>
    </div>
  {/if}
</div>

<style>
  .results-card {
    display: flex;
    flex-direction: column;
    min-height: 0;
    gap: 0;
    padding: 0;
    overflow: hidden;
  }

  .results-count {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--primary);
    background: var(--primary-muted);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }

  .elapsed-time {
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-family: inherit;
  }

  .btn-export {
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-xs);
  }

  .table-container {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  table {
    border-spacing: 0;
    width: 100%;
  }

  th {
    text-align: left;
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-xs);
    border-bottom: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--text-muted);
    white-space: nowrap;
  }

  td {
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }

  tr:hover {
    background: var(--surface-alt);
  }

  tr.selected {
    background: var(--primary-muted);
  }

  .monospaced {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .highlight-diff {
    color: var(--primary-dark);
    font-weight: 600;
  }

  .text-center { text-align: center; }

  .rank-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--border-strong);
    color: var(--text-muted);
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
  }

  .cell-with-copy {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .btn-copy {
    opacity: 0;
    background: transparent;
    border: 1px solid var(--border);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    cursor: pointer;
    transition: var(--transition);
    color: var(--text-muted);
  }

  tr:hover .btn-copy {
    opacity: 1;
  }

  .btn-copy:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: var(--surface);
  }

  .btn-copy.copied {
    opacity: 1;
    color: var(--success);
    border-color: var(--success);
  }

  .accuracy-indicator {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 100px;
  }

  .accuracy-bar-bg {
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  .accuracy-bar {
    height: 100%;
    background: var(--accuracy-color);
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .accuracy-text {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .table-footer {
    padding: var(--space-4) var(--space-6);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--surface-alt);
    border-top: 1px solid var(--border);
  }

  .pagination-info {
    font-size: var(--text-sm);
    color: var(--text-muted);
  }

  .pagination-info .current {
    color: var(--text);
    font-weight: 700;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-16) 0;
    color: var(--text-muted);
    gap: var(--space-4);
  }

  .empty-icon {
    opacity: 0.3;
  }
</style>
