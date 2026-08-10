<script lang="ts">
  import * as XLSX from "xlsx";
  import { createCombinedMutationWorkbook, createMutationWorkbook, mutationFileName } from "$lib/mutasi-bank/exporter";
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

  let entries: MutationFileEntry[] = [];
  let activeId = "";
  let dragOver = false;
  let status = "";
  let fileInput: HTMLInputElement;
  let idCounter = 0;

  $: validEntries = entries.filter((entry) => entry.parsed);
  $: if (!activeId && entries.length > 0) activeId = validEntries[0]?.id ?? entries[0]?.id ?? "";
  $: activeEntry = entries.find((entry) => entry.id === activeId) ?? validEntries[0] ?? entries[0];
  $: activeSummary = activeEntry?.parsed ? summarize(activeEntry.parsed) : null;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    status = "Membaca file mutasi...";
    const nextEntries: MutationFileEntry[] = [];

    for (const file of Array.from(files)) {
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
      } catch (error) {
        entry.error = error instanceof Error ? error.message : String(error);
      }

      nextEntries.push(entry);
    }

    entries = [...entries, ...nextEntries];
    activeId = nextEntries.find((entry) => entry.parsed)?.id ?? nextEntries[0]?.id ?? activeId;
    status = "";
    if (fileInput) fileInput.value = "";
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    handleFiles(event.dataTransfer?.files ?? null);
  }

  function removeEntry(id: string) {
    entries = entries.filter((entry) => entry.id !== id);
    if (activeId === id) activeId = entries.find((entry) => entry.parsed)?.id ?? entries[0]?.id ?? "";
  }

  function resetAll() {
    entries = [];
    activeId = "";
    status = "";
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
      } catch (error) {
        return { ...item, openingBalance: value, parsed: undefined, error: error instanceof Error ? error.message : String(error) };
      }
    });
  }

  function exportEntry(entry: MutationFileEntry) {
    if (!entry.parsed) return;
    const workbook = createMutationWorkbook(entry.parsed, entry.fileName);
    XLSX.writeFile(workbook, mutationFileName(entry.fileName));
  }

  function exportAll() {
    const sources = entries
      .filter((entry): entry is MutationFileEntry & { parsed: ParsedMutation } => Boolean(entry.parsed))
      .map((entry) => ({ fileName: entry.fileName, parsed: entry.parsed }));
    if (sources.length === 0) return;
    XLSX.writeFile(createCombinedMutationWorkbook(sources), "mutasi-bank-gabungan.xlsx");
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
    <section class="intro-card card card-flush">
      <header class="card-header">
        <div class="card-header-main">
          <div class="step-badge">1</div>
          <div>
            <h1 class="card-title">Mutasi Bank</h1>
            <p class="intro-copy">Konversi raw data BCA, BNI, dan BRI menjadi Excel dengan kolom standar dan validasi saldo.</p>
          </div>
        </div>
        {#if entries.length > 0}
          <div class="card-header-actions">
            <button class="btn btn-outline" on:click={resetAll}>Reset</button>
          </div>
        {/if}
      </header>

      <label
        class="drop-zone"
        class:drag-over={dragOver}
        class:has-file={entries.length > 0}
        on:dragover|preventDefault={() => (dragOver = true)}
        on:dragleave={() => (dragOver = false)}
        on:drop={onDrop}
        for="mutasi-input"
      >
        <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span class="drop-text">Drag & drop file mutasi bank di sini</span>
        <span class="drop-divider">atau</span>
        <span class="btn btn-outline btn-sm">Pilih File</span>
        <span class="drop-hint">Menerima .csv, .xls, dan .txt dari BCA, BNI, atau BRI</span>
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

      {#if status}
        <p class="status-text">{status}</p>
      {/if}
    </section>

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
            <button class="btn btn-outline" on:click={exportAll} disabled={validEntries.length === 0}>Export Semua Excel</button>
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
                <button class="file-remove" on:click|stopPropagation={() => removeEntry(entry.id)} aria-label="Hapus file">x</button>
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
                <div class="summary-card"><span class="summary-label">Bank</span><span class="summary-value">{activeEntry.parsed.bank}</span></div>
                <div class="summary-card"><span class="summary-label">Baris</span><span class="summary-value">{activeSummary.rowCount}</span></div>
                <div class="summary-card"><span class="summary-label">Total Debit</span><span class="summary-value">{fmtIDR(activeSummary.totalDebit)}</span></div>
                <div class="summary-card"><span class="summary-label">Total Kredit</span><span class="summary-value">{fmtIDR(activeSummary.totalKredit)}</span></div>
                <div class="summary-card"><span class="summary-label">Saldo Akhir</span><span class="summary-value accent">{fmtIDR(activeSummary.endingBalance)}</span></div>
              </div>

              {#if activeEntry.parsed.needsOpeningBalance}
                <div class="opening-box">
                  <label for="opening-balance">Saldo Awal BNI</label>
                  <input
                    id="opening-balance"
                    type="number"
                    value={activeEntry.openingBalance}
                    on:input={(event) => updateOpeningBalance(activeEntry, Number(event.currentTarget.value) || 0)}
                  />
                </div>
              {/if}

              <div class="validation-box" class:mismatch={activeSummary.mismatchCount > 0} class:manual={activeEntry.parsed.needsOpeningBalance}>
                {#if activeEntry.parsed.needsOpeningBalance}
                  File BNI tidak memuat saldo sumber. Saldo dihitung dari saldo awal manual.
                {:else if activeSummary.mismatchCount > 0}
                  Ditemukan {activeSummary.mismatchCount} baris dengan selisih saldo.
                {:else}
                  Semua baris cocok dengan saldo sumber.
                {/if}
              </div>

              <div class="table-actions">
                <button class="btn btn-primary" on:click={() => exportEntry(activeEntry)}>Excel File Ini</button>
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
                    {#each activeEntry.parsed.rows as row}
                      <tr class:mismatch={row.status === "mismatch"}>
                        <td>{row.keterangan}</td>
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
  .card-flush { padding: 0; overflow: hidden; }
  .intro-copy { margin: 2px 0 0; color: var(--text-muted); font-size: var(--text-sm); }
  .step-badge { width: 24px; height: 24px; border-radius: 6px; background: var(--primary); color: var(--text-on-primary); display: inline-flex; align-items: center; justify-content: center; font-size: var(--text-xs); font-weight: 800; flex-shrink: 0; }
  .drop-zone { min-height: 170px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-1); padding: var(--space-6); margin: var(--space-4); border: 2px dashed var(--border); border-radius: var(--radius-sm); cursor: pointer; transition: var(--transition); }
  .drop-zone:hover, .drop-zone.drag-over { border-color: var(--primary); background: var(--primary-muted); }
  .drop-zone.has-file { border-style: solid; }
  .upload-icon { color: var(--text-muted); }
  .drop-text { font-size: var(--text-sm); font-weight: 700; }
  .drop-divider, .drop-hint, .status-text { font-size: var(--text-xs); color: var(--text-muted); }
  .file-input { display: none; }
  .btn-sm { padding: var(--space-2) var(--space-4); font-size: var(--text-xs); }
  .results-stats { display: flex; gap: var(--space-2); align-items: center; }
  .badge-success { background: oklch(65% 0.18 150 / 0.1); color: oklch(45% 0.18 150); border: 1px solid oklch(65% 0.18 150 / 0.2); }
  .badge-danger { background: oklch(65% 0.2 25 / 0.1); color: oklch(45% 0.2 25); border: 1px solid oklch(65% 0.2 25 / 0.2); }
  .content-grid { display: grid; grid-template-columns: 320px 1fr; min-height: 520px; }
  .file-panel { border-right: 1px solid var(--border); background: var(--surface-alt); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); }
  .file-item { display: flex; align-items: center; gap: var(--space-3); width: 100%; padding: var(--space-3); background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; text-align: left; transition: var(--transition); }
  .file-item:hover, .file-item.active { border-color: var(--primary); box-shadow: var(--shadow-sm); }
  .file-item.error { border-color: oklch(65% 0.2 25 / 0.35); }
  .bank-dot { width: 10px; height: 10px; border-radius: 999px; background: var(--text-muted); flex-shrink: 0; }
  .bank-dot.bca { background: oklch(50% 0.18 255); }
  .bank-dot.bni { background: oklch(65% 0.18 55); }
  .bank-dot.bri { background: oklch(48% 0.16 245); }
  .file-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .file-name { font-size: var(--text-sm); font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-meta { font-size: var(--text-xs); color: var(--text-muted); }
  .file-remove { width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: 4px; }
  .file-remove:hover { color: var(--error); background: oklch(65% 0.2 25 / 0.1); }
  .preview-panel { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
  .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-3); }
  .summary-card { background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: var(--space-3); display: flex; flex-direction: column; gap: 3px; }
  .summary-label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
  .summary-value { font-size: var(--text-sm); font-weight: 800; font-variant-numeric: tabular-nums; }
  .summary-value.accent, .primary-val { color: var(--primary-dark); font-weight: 800; }
  .opening-box { display: grid; grid-template-columns: 180px minmax(180px, 260px); gap: var(--space-3); align-items: center; background: var(--primary-muted); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); padding: var(--space-3); }
  .opening-box label { margin: 0; color: var(--primary-dark); }
  .validation-box { border: 1px solid oklch(65% 0.18 150 / 0.25); background: oklch(65% 0.18 150 / 0.08); color: oklch(45% 0.18 150); border-radius: var(--radius-sm); padding: var(--space-3) var(--space-4); font-size: var(--text-sm); font-weight: 700; }
  .validation-box.mismatch { border-color: oklch(65% 0.2 25 / 0.25); background: oklch(65% 0.2 25 / 0.08); color: oklch(45% 0.2 25); }
  .validation-box.manual { border-color: oklch(62% 0.16 245 / 0.25); background: oklch(62% 0.16 245 / 0.08); color: oklch(45% 0.16 245); }
  .table-actions { display: flex; justify-content: flex-end; }
  .table-wrapper { overflow: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); max-height: 520px; }
  .mutasi-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .mutasi-table th { background: var(--surface-alt); }
  .mutasi-table tr.mismatch { background: oklch(65% 0.2 25 / 0.08); }
  .text-right { text-align: right; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-variant-numeric: tabular-nums; }
  .status-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 70px; padding: 2px 8px; border-radius: 999px; background: oklch(65% 0.18 150 / 0.1); color: oklch(45% 0.18 150); font-size: var(--text-xs); font-weight: 800; }
  .status-pill.mismatch { background: oklch(65% 0.2 25 / 0.1); color: oklch(45% 0.2 25); }
  .status-pill.manual { background: oklch(62% 0.16 245 / 0.1); color: oklch(45% 0.16 245); }
  .error-state { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-6); border-radius: var(--radius-sm); background: oklch(65% 0.2 25 / 0.08); color: oklch(45% 0.2 25); border: 1px solid oklch(65% 0.2 25 / 0.25); }

  @media (max-width: 900px) {
    .content-grid { grid-template-columns: 1fr; }
    .file-panel { border-right: none; border-bottom: 1px solid var(--border); }
    .opening-box { grid-template-columns: 1fr; }
  }
</style>
