<script lang="ts">
  import * as XLSX from "xlsx";
  import {
    createCombinedMutationWorkbook,
    createMutationWorkbook,
    createSingleSheetCombinedMutationWorkbook,
    mutationFileName
  } from "$lib/mutasi-bank/exporter";
  import { parseBankMutation } from "$lib/mutasi-bank/parser";
  import type { ParsedMutation } from "$lib/mutasi-bank/types";

  interface MutationFileEntry {
    id: string;
    fileName: string;
    fileSize: number;
    rawText: string;
    openingBalance: number;
    parsed?: ParsedMutation;
    error?: string;
  }

  let files: File[] = [];
  let entries: MutationFileEntry[] = [];
  let activeId = "";
  let dragOver = false;
  let loading = false;
  let status = "";
  let error = "";
  let fileInput: HTMLInputElement;
  let idCounter = 0;
  let exportDropdownOpen = false;
  let expandedRows = new Set<number>();

  $: if (activeId) {
    expandedRows = new Set<number>();
  }

  function toggleRowExpand(index: number) {
    const next = new Set(expandedRows);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    expandedRows = next;
  }

  $: validEntries = entries.filter((entry) => entry.parsed);
  $: if (!activeId && entries.length > 0) activeId = validEntries[0]?.id ?? entries[0]?.id ?? "";
  $: activeEntry = entries.find((entry) => entry.id === activeId) ?? validEntries[0] ?? entries[0];
  $: activeSummary = activeEntry?.parsed ? summarize(activeEntry.parsed) : null;

  function handleFiles(fs: FileList | null) {
    if (!fs || fs.length === 0) return;
    const nextFiles = Array.from(fs);
    const existingNames = new Set(files.map((f) => f.name));
    files = [...files, ...nextFiles.filter((f) => !existingNames.has(f.name))];
    error = "";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    handleFiles(event.dataTransfer?.files ?? null);
  }

  function removeFile(name: string) {
    files = files.filter((f) => f.name !== name);
  }

  async function processAll() {
    if (files.length === 0) return;
    loading = true;
    error = "";
    entries = [];
    const nextEntries: MutationFileEntry[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      status = `Memproses ${i + 1}/${files.length}: ${file.name}…`;
      const entry: MutationFileEntry = {
        id: `mutasi-${idCounter++}`,
        fileName: file.name,
        fileSize: file.size,
        rawText: "",
        openingBalance: 0,
      };

      try {
        entry.rawText = await readFileAsText(file);
        entry.parsed = parseBankMutation(entry.rawText, { openingBalance: entry.openingBalance });
      } catch (err) {
        entry.error = err instanceof Error ? err.message : String(err);
      }

      nextEntries.push(entry);
    }

    entries = nextEntries;
    activeId = nextEntries.find((entry) => entry.parsed)?.id ?? nextEntries[0]?.id ?? "";
    status = "";
    loading = false;
  }

  function removeEntry(id: string) {
    entries = entries.filter((entry) => entry.id !== id);
    if (activeId === id) activeId = entries.find((entry) => entry.parsed)?.id ?? entries[0]?.id ?? "";
  }

  function resetAll() {
    files = [];
    entries = [];
    activeId = "";
    status = "";
    error = "";
    exportDropdownOpen = false;
    if (fileInput) fileInput.value = "";
  }

  function updateOpeningBalance(entry: MutationFileEntry, value: number) {
    entries = entries.map((item) => {
      if (item.id !== entry.id) return item;
      try {
        return {
          ...item,
          openingBalance: value,
          parsed: parseBankMutation(item.rawText, { openingBalance: value }),
          error: undefined,
        };
      } catch (err) {
        return { ...item, openingBalance: value, parsed: undefined, error: err instanceof Error ? err.message : String(err) };
      }
    });
  }

  function exportEntry(entry: MutationFileEntry) {
    if (!entry.parsed) return;
    const workbook = createMutationWorkbook(entry.parsed, entry.fileName);
    XLSX.writeFile(workbook, mutationFileName(entry.fileName));
  }

  function exportIndividualFiles() {
    validEntries.forEach((entry) => {
      exportEntry(entry);
    });
  }

  function exportCombinedSingleSheet() {
    const sources = validEntries
      .filter((entry): entry is MutationFileEntry & { parsed: ParsedMutation } => Boolean(entry.parsed))
      .map((entry) => ({ fileName: entry.fileName, parsed: entry.parsed }));
    if (sources.length === 0) return;
    XLSX.writeFile(createSingleSheetCombinedMutationWorkbook(sources), "mutasi-bank-gabungan.xlsx");
  }

  async function readFileAsText(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    return new TextDecoder("iso-8859-1").decode(buffer);
  }

  function summarize(parsed: ParsedMutation) {
    const totalDebit = parsed.rows.reduce((sum, row) => sum + row.debit, 0);
    const totalKredit = parsed.rows.reduce((sum, row) => sum + row.kredit, 0);
    const endingBalance = parsed.rows.at(-1)?.saldo ?? parsed.openingBalance;
    const mismatchCount = parsed.rows.filter((row) => row.status === "mismatch").length;
    return { totalDebit, totalKredit, endingBalance, mismatchCount, rowCount: parsed.rows.length };
  }

  function fileSizeLabel(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function fmtIDR(value: number) {
    return value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function statusLabel(statusValue: string) {
    if (statusValue === "match") return "Cocok";
    if (statusValue === "mismatch") return "Selisih";
    return "Manual";
  }
</script>

<svelte:head>
  <title>Mutasi Bank - Demivio</title>
</svelte:head>

<div class="container animate-in">
  <div class="mutasi-page">
    {#if entries.length === 0}
      <div class="upload-grid">
        <div class="upload-card fade-in">
          <header class="card-header">
            <div class="card-header-main">
              <div class="step-badge">1</div>
              <h2 class="card-title">Mutasi Bank</h2>
            </div>
            {#if files.length > 0}
              <div class="card-header-actions">
                <button class="btn btn-outline" on:click={resetAll} title="Reset">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                  Reset
                </button>
              </div>
            {/if}
          </header>

          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <label
            class="drop-zone"
            class:drag-over={dragOver}
            class:has-file={files.length > 0 && !loading}
            class:is-loading={loading}
            on:dragover|preventDefault={() => (dragOver = true)}
            on:dragleave={() => (dragOver = false)}
            on:drop={onDrop}
            for="mutasi-input"
          >
            {#if loading}
              <div class="processing-bar"><div class="processing-fill"></div></div>
              <span class="drop-text">Memproses…</span>
            {:else if files.length > 0}
              <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
              <span class="file-name">{files.length} file dipilih</span>
              <span class="file-count">{files.length} file</span>
            {:else}
              <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
              <span class="drop-text">Drag & drop file mutasi bank di sini</span>
              <span class="drop-divider">atau</span>
              <span class="btn btn-outline btn-sm">Pilih File</span>
              <span class="drop-hint">Menerima .csv, .xls, dan .txt dari BCA, BNI, atau BRI</span>
            {/if}
            <input
              id="mutasi-input"
              bind:this={fileInput}
              type="file"
              accept=".csv,.xls,.txt"
              multiple
              class="file-input"
              on:change={(event) => handleFiles(event.currentTarget.files)}
            />
          </label>

          {#if error}
            <div class="upload-error">{error}</div>
          {/if}

          {#if files.length > 0}
            <div class="file-list">
              {#each files as f (f.name)}
                <div class="file-row">
                  <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                  <span class="file-name">{f.name}</span>
                  <span class="file-size">{fileSizeLabel(f.size)}</span>
                  <button class="file-remove" on:click|stopPropagation={() => removeFile(f.name)} aria-label="Hapus file">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              {/each}
            </div>
          {/if}

          {#if files.length > 0}
            <div class="extract-controls">
              <button class="btn btn-primary btn-run" on:click={processAll} disabled={loading}>
                {#if loading}
                  <div class="spinner"></div>
                  <span>Memproses…</span>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  <span>Konversi {files.length} File</span>
                {/if}
              </button>
              {#if loading && status}
                <span class="status-text">{status}</span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if entries.length > 0}
      <section class="results card card-flush fade-in">
        <header class="card-header">
          <div class="card-header-main">
            <div class="step-badge">2</div>
            <h2 class="card-title">Hasil Konversi</h2>
            <div class="results-stats">
              <span class="badge badge-success">{validEntries.length} berhasil</span>
              {#if entries.length - validEntries.length > 0}
                <span class="badge badge-danger">{entries.length - validEntries.length} gagal</span>
              {/if}
            </div>
          </div>
          <div class="card-header-actions">
            {#if validEntries.length === 1}
              <button class="btn btn-outline" on:click={() => exportEntry(validEntries[0])}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Export Excel
              </button>
            {:else if validEntries.length > 1}
              <div class="dropdown-wrapper">
                <button class="btn btn-outline" on:click={() => (exportDropdownOpen = !exportDropdownOpen)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Export Semua Excel
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 2px;"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {#if exportDropdownOpen}
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <div class="dropdown-overlay" on:click={() => (exportDropdownOpen = false)}></div>
                  <div class="dropdown-menu fade-in">
                    <button class="dropdown-item" on:click={() => { exportDropdownOpen = false; exportIndividualFiles(); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Export Satu per Satu
                    </button>
                    <button class="dropdown-item" on:click={() => { exportDropdownOpen = false; exportCombinedSingleSheet(); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h10"/><path d="M6 12h12"/><path d="M10 18h8"/></svg>
                      Export Gabungan
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
            <button class="btn btn-outline" on:click={resetAll}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              Upload Lagi
            </button>
          </div>
        </header>

        <div class="content-grid">
          <aside class="file-panel">
            {#each entries as entry (entry.id)}
              <div
                class="file-item"
                class:active={activeEntry?.id === entry.id}
                class:error={entry.error}
                role="button"
                tabindex="0"
                on:click={() => (activeId = entry.id)}
                on:keydown={(event) => {
                  if (event.key === "Enter" || event.key === " ") activeId = entry.id;
                }}
              >
                <span class="bank-dot" class:bca={entry.parsed?.bank === "BCA"} class:bni={entry.parsed?.bank === "BNI"} class:bri={entry.parsed?.bank === "BRI"}></span>
                <span class="file-main">
                  <span class="file-name">{entry.fileName}</span>
                  <span class="file-meta">{entry.parsed ? `${entry.parsed.bank} - ${entry.parsed.rows.length} baris` : "Gagal dibaca"} - {fileSizeLabel(entry.fileSize)}</span>
                </span>
                <button class="file-remove" on:click|stopPropagation={() => removeEntry(entry.id)} aria-label="Hapus file">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            {/each}
          </aside>

          <main class="preview-panel">
            {#if activeEntry?.error}
              <div class="error-state">
                <strong>{activeEntry.fileName}</strong>
                <span>{activeEntry.error}</span>
              </div>
            {:else if activeEntry?.parsed && activeSummary}
              <div class="summary-row">
                <div class="summary-card">
                  <span class="summary-label">Saldo Awal</span>
                  {#if activeEntry.parsed.needsOpeningBalance}
                    <input
                      id="opening-balance"
                      type="number"
                      class="summary-input"
                      value={activeEntry.openingBalance}
                      on:input={(event) => updateOpeningBalance(activeEntry, Number(event.currentTarget.value) || 0)}
                    />
                  {:else}
                    <span class="summary-value">{fmtIDR(activeEntry.parsed.openingBalance)}</span>
                  {/if}
                </div>
                <div class="summary-card"><span class="summary-label">Total Debit</span><span class="summary-value">{fmtIDR(activeSummary.totalDebit)}</span></div>
                <div class="summary-card"><span class="summary-label">Total Kredit</span><span class="summary-value">{fmtIDR(activeSummary.totalKredit)}</span></div>
                <div class="summary-card"><span class="summary-label">Saldo Akhir</span><span class="summary-value accent">{fmtIDR(activeSummary.endingBalance)}</span></div>
                <div class="summary-card">
                  <span class="summary-label">Baris Selisih</span>
                  <span class="summary-value" class:danger-val={activeSummary.mismatchCount > 0}>{activeSummary.mismatchCount}</span>
                </div>
              </div>

              <div class="table-wrapper">
                <table class="mutasi-table">
                  <thead>
                    <tr>
                      <th>Keterangan</th>
                      <th>Tanggal</th>
                      <th class="text-right">Debit</th>
                      <th class="text-right">Kredit</th>
                      <th class="text-right">Saldo</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each activeEntry.parsed.rows as row, i (i)}
                      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <tr
                        class="table-row-clickable"
                        class:mismatch={row.status === "mismatch"}
                        class:expanded={expandedRows.has(i)}
                        on:click={() => toggleRowExpand(i)}
                      >
                        <td class="keterangan-cell">{row.keterangan}</td>
                        <td class="mono">{row.tanggal}</td>
                        <td class="text-right mono">{row.debit ? fmtIDR(row.debit) : "-"}</td>
                        <td class="text-right mono">{row.kredit ? fmtIDR(row.kredit) : "-"}</td>
                        <td class="text-right mono primary-val">{fmtIDR(row.saldo)}</td>
                        <td><span class="status-pill" class:mismatch={row.status === "mismatch"} class:manual={row.status === "manual"}>{statusLabel(row.status)}</span></td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </main>
        </div>
      </section>
    {/if}
  </div>
</div>

<style>
  .mutasi-page { display: flex; flex-direction: column; gap: var(--space-4); }

  .upload-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-4); }

  .upload-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-card); padding: 0; overflow: hidden;
    display: flex; flex-direction: column; box-shadow: var(--shadow-sm);
  }

  .card-header {
    display: flex;
    align-items: stretch;
    gap: 0;
    padding: 0;
    background: var(--surface-alt);
    border-bottom: 1px solid var(--border);
    height: var(--card-header-height);
  }
  .results .card-header {
    border-top-left-radius: var(--radius-card);
    border-top-right-radius: var(--radius-card);
    overflow: visible;
  }
  .upload-card .card-header {
    overflow: hidden;
  }
  .card-header .step-badge {
    flex-shrink: 0;
    margin: 0 0 0 var(--space-4);
    align-self: center;
  }
  .card-header-actions { margin-left: auto; display: flex; align-items: stretch; }

  .upload-card .card-header-main {
    display: flex;
    align-items: center;
    padding: 0 var(--space-4);
    gap: var(--space-3);
    flex: 1;
    min-width: 0;
  }
  .upload-card .card-header-main .step-badge {
    margin: 0;
    align-self: center;
    flex-shrink: 0;
  }

  .step-badge { display: inline-flex; align-items: center; justify-content: center; font-size: var(--text-sm); font-weight: 800; color: var(--text-muted); background: transparent; flex-shrink: 0; }

  /* Drop zone */
  .drop-zone {
    min-height: 140px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: var(--space-4);
    border: 2px dashed var(--border); margin: var(--space-4);
    border-radius: var(--radius-sm); cursor: pointer;
    transition: var(--transition); position: relative; gap: var(--space-1);
  }
  .drop-zone:hover { border-color: var(--primary); background: var(--surface-alt); }
  .drop-zone.drag-over { border-color: var(--primary); background: var(--primary-muted); }
  .drop-zone.has-file { border-style: solid; border-color: var(--primary-dark); background: var(--primary-muted); }

  .drop-divider { font-size: 10px; color: var(--text-muted); }
  .upload-icon, .file-icon { width: 32px; height: 32px; color: var(--text-muted); }
  .drop-text { font-size: var(--text-xs); color: var(--text-muted); text-align: center; }
  .drop-hint { font-size: 10px; color: var(--text-muted); }
  .file-name { font-size: var(--text-sm); font-weight: 700; color: var(--text); }
  .file-count { font-size: 10px; color: var(--primary-dark); font-weight: 600; background: rgba(255,255,255,0.5); padding: 2px 6px; border-radius: 4px; }
  .file-input { display: none; }

  .upload-error { font-size: var(--text-xs); color: var(--error); background: rgba(220,38,38,0.08); border-radius: 6px; padding: 0.3rem 0.65rem; margin: 0 var(--space-4) var(--space-4); }

  .processing-bar { width: 100%; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .processing-fill { height: 100%; width: 40%; background: linear-gradient(90deg, var(--primary), var(--primary-dark)); border-radius: 2px; animation: slide 1s ease-in-out infinite alternate; }
  @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }

  .file-list { display: flex; flex-direction: column; gap: var(--space-2); padding: 0 var(--space-4) var(--space-4); max-height: 240px; overflow-y: auto; }
  .file-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); }
  .file-row .file-icon { width: 16px; height: 16px; flex-shrink: 0; }
  .file-row .file-name { flex: 1; font-size: var(--text-sm); font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-row .file-size { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
  .file-remove { width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: var(--transition); flex-shrink: 0; }
  .file-remove:hover { color: var(--error); background: rgba(220,38,38,0.1); }

  .extract-controls { display: flex; align-items: center; gap: var(--space-4); padding: 0 var(--space-4) var(--space-4); }
  .btn-run { height: 48px; font-weight: 700; min-width: 160px; }
  .status-text { font-size: var(--text-xs); color: var(--text-muted); }
  .btn-sm { padding: var(--space-2) var(--space-4); font-size: var(--text-xs); }

  .spinner { width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .results-stats { display: flex; gap: var(--space-2); align-items: center; margin-left: var(--space-2); }
  .card-flush { padding: 0 !important; }
  .results.card-flush { overflow: visible; }
  .upload-card { overflow: hidden; }

  .dropdown-wrapper { position: relative; display: inline-flex; height: 100%; }
  .dropdown-wrapper .btn { height: 100%; border-radius: 0; }
  .dropdown-overlay { position: fixed; inset: 0; z-index: 40; }
  .dropdown-menu {
    position: absolute; right: 0; top: calc(100% + 4px); background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md);
    min-width: 190px; z-index: 50; padding: 4px; display: flex; flex-direction: column; gap: 2px;
  }
  .dropdown-item {
    display: flex; align-items: center; gap: var(--space-2); width: 100%; padding: var(--space-2) var(--space-3);
    background: transparent; border: none; border-radius: 4px; color: var(--text); font-size: var(--text-xs);
    font-weight: 600; text-align: left; cursor: pointer; transition: var(--transition);
  }
  .dropdown-item:hover { background: var(--surface-alt); color: var(--primary-dark); }
  :global([data-theme="dark"]) .dropdown-item:hover { color: var(--primary); }

  .badge-success { background: oklch(65% 0.18 150 / 0.1); color: oklch(45% 0.18 150); border: 1px solid oklch(65% 0.18 150 / 0.2); }
  .badge-danger { background: oklch(65% 0.2 25 / 0.1); color: oklch(45% 0.2 25); border: 1px solid oklch(65% 0.2 25 / 0.2); }

  .content-grid { display: grid; grid-template-columns: 320px 1fr; min-height: 520px; }
  .file-panel {
    border-right: 1px solid var(--border);
    background: var(--surface-alt);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    border-bottom-left-radius: var(--radius-card);
    max-height: 600px;
    overflow-y: auto;
  }

  .file-panel::-webkit-scrollbar,
  .file-list::-webkit-scrollbar {
    width: 6px;
  }
  .file-panel::-webkit-scrollbar-track,
  .file-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .file-panel::-webkit-scrollbar-thumb,
  .file-list::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 999px;
  }
  .file-panel::-webkit-scrollbar-thumb:hover,
  .file-list::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }

  .file-item { display: flex; align-items: center; gap: var(--space-3); width: 100%; padding: var(--space-3); background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; text-align: left; transition: var(--transition); flex-shrink: 0; }
  .file-item:hover, .file-item.active { border-color: var(--primary); box-shadow: var(--shadow-sm); }
  .file-item.error { border-color: oklch(65% 0.2 25 / 0.35); }
  .bank-dot { width: 10px; height: 10px; border-radius: 999px; background: var(--text-muted); flex-shrink: 0; }
  .bank-dot.bca { background: oklch(50% 0.18 255); }
  .bank-dot.bni { background: oklch(65% 0.18 55); }
  .bank-dot.bri { background: oklch(48% 0.16 245); }
  .file-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .file-item .file-name { font-size: var(--text-sm); font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-meta { font-size: var(--text-xs); color: var(--text-muted); }

  .preview-panel { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; border-bottom-right-radius: var(--radius-card); }
  .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-3); }
  .summary-card { background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: var(--space-3); display: flex; flex-direction: column; gap: 3px; }
  .summary-label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
  .summary-value { font-size: var(--text-sm); font-weight: 800; font-variant-numeric: tabular-nums; }
  .summary-value.accent, .primary-val { color: var(--primary-dark); font-weight: 800; }
  :global([data-theme="dark"]) .summary-value.accent, :global([data-theme="dark"]) .primary-val { color: var(--primary); }

  .summary-input {
    width: 100%;
    padding: 2px 6px;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: var(--text-sm);
    font-weight: 800;
  }
  .summary-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px oklch(65% 0.18 var(--brand-h) / 0.2);
  }
  .danger-val { color: var(--error); font-weight: 800; }
  .table-wrapper { overflow: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); max-height: 520px; }
  .mutasi-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .mutasi-table th { background: var(--surface-alt); }
  .table-row-clickable { cursor: pointer; transition: background var(--transition); }
  .table-row-clickable:hover { background: var(--surface-alt); }
  .mutasi-table tr.mismatch { background: oklch(65% 0.2 25 / 0.08); }
  .mutasi-table td.keterangan-cell {
    max-width: 360px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mutasi-table tr.expanded td.keterangan-cell {
    white-space: normal;
    word-break: break-word;
    overflow: visible;
  }
  .text-right { text-align: right; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-variant-numeric: tabular-nums; }
  .status-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 70px; padding: 2px 8px; border-radius: 999px; background: oklch(65% 0.18 150 / 0.1); color: oklch(45% 0.18 150); font-size: var(--text-xs); font-weight: 800; }
  .status-pill.mismatch { background: oklch(65% 0.2 25 / 0.1); color: oklch(45% 0.2 25); }
  .status-pill.manual { background: oklch(62% 0.16 245 / 0.1); color: oklch(45% 0.16 245); }
  .error-state { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-6); border-radius: var(--radius-sm); background: oklch(65% 0.2 25 / 0.08); color: oklch(45% 0.2 25); border: 1px solid oklch(65% 0.2 25 / 0.25); }

  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 900px) {
    .content-grid { grid-template-columns: 1fr; }
    .file-panel { border-right: none; border-bottom: 1px solid var(--border); border-bottom-left-radius: 0; max-height: 280px; }
    .preview-panel { border-bottom-left-radius: var(--radius-card); }
  }
</style>
