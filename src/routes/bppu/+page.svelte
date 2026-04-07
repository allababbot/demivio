<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import { parseBppuText, extractPdfTextLocal } from '$lib/bppu/parser';
  import { fileSizeLabel, toCSV, fmtRp, toExcelRows } from '$lib/bppu/formatter';
  import type { BppuResult, BppuData, ObjekPajak } from '$lib/bppu/types';
  import * as XLSX from 'xlsx';

  // State
  let files: File[] = [];
  let results: BppuResult[] = [];
  let loading = false;
  let status = '';
  let error = '';
  let dragOver = false;
  let activeTab = 0;
  let fileInput: HTMLInputElement;

  $: activeResult = results[activeTab];
  $: successCount = results.filter((r) => r.ok).length;
  $: failCount = results.filter((r) => !r.ok).length;

  function handleFiles(fs: FileList | null) {
    if (!fs) return;
    const pdfs = Array.from(fs).filter((f) => f.type === 'application/pdf');
    if (pdfs.length === 0) {
      error = 'Hanya file PDF yang didukung.';
      return;
    }
    const existing = new Set(files.map((f) => f.name));
    files = [...files, ...pdfs.filter((f) => !existing.has(f.name))];
    error = '';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    handleFiles(e.dataTransfer?.files ?? null);
  }

  function removeFile(name: string) {
    files = files.filter((f) => f.name !== name);
    results = results.filter((r) => r.fileName !== name);
  }

  async function extractAll() {
    if (files.length === 0) return;
    loading = true;
    error = '';
    results = [];
    const out: BppuResult[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      status = `Memproses ${i + 1}/${files.length}: ${f.name}…`;
      try {
        const text = await extractPdfTextLocal(f);
        const data = parseBppuText(text);
        out.push({ fileName: f.name, fileSize: f.size, data, ok: true });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        out.push({ fileName: f.name, fileSize: f.size, ok: false, error: msg });
      }
    }
    results = out;
    status = '';
    loading = false;
    activeTab = 0;
  }

  function exportExcel(result: BppuResult) {
    if (!result.data) return;
    const rows = toExcelRows(result.data, result.fileName);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BPPU Data');
    XLSX.writeFile(workbook, result.fileName.replace('.pdf', '') + '_bppu.xlsx');
  }

  function exportAllExcel() {
    const ok = results.filter((r): r is BppuResult & { data: BppuData } => r.ok && r.data != null);
    if (ok.length === 0) return;

    const allRows: any[][] = [];
    // Get headers from first result
    const firstResultRows = toExcelRows(ok[0].data, ok[0].fileName);
    allRows.push(firstResultRows[0]); // Header

    ok.forEach((r) => {
      const rows = toExcelRows(r.data, r.fileName);
      allRows.push(...rows.slice(1)); // Data rows only
    });

    const worksheet = XLSX.utils.aoa_to_sheet(allRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Semua BPPU');
    XLSX.writeFile(workbook, 'bppu_semua.xlsx');
  }

  function reset() {
    files = [];
    results = [];
    error = '';
    status = '';
    if (fileInput) fileInput.value = '';
  }

  function totalDPP(objekList: ObjekPajak[]) {
    return objekList.reduce((s, o) => {
      const n = parseInt(String(o.dpp || '0').replace(/\D/g, ''), 10);
      return s + (Number.isNaN(n) ? 0 : n);
    }, 0);
  }

  function totalPPh(objekList: ObjekPajak[]) {
    return objekList.reduce((s, o) => {
      const n = parseInt(String(o.pajak_penghasilan || '0').replace(/\D/g, ''), 10);
      return s + (Number.isNaN(n) ? 0 : n);
    }, 0);
  }
</script>

<svelte:head>
  <title>BPPU Extractor – Demivio</title>
</svelte:head>

<div class="container animate-in">
  <Navbar />

  <!-- Upload Section -->
  {#if results.length === 0}
    <div class="card card-flush upload-card fade-in">
      <header class="card-header">
        <div class="card-header-main">
          <div class="step-badge">1</div>
          <h2 class="card-title">Pilih File PDF</h2>
        </div>
        {#if files.length > 0}
          <div class="card-header-actions">
            <button class="btn btn-outline" on:click={reset} title="Reset">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>
          </div>
        {/if}
      </header>

      <div class="card-content">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="dropzone"
          class:drag-active={dragOver}
          on:dragover={(e) => { e.preventDefault(); dragOver = true; }}
          on:dragleave={() => (dragOver = false)}
          on:drop={onDrop}
          on:click={() => fileInput?.click()}
        >
          <input
            bind:this={fileInput}
            type="file"
            accept="application/pdf"
            multiple
            style="display:none"
            on:change={(e) => handleFiles(e.currentTarget.files)}
          />
          <div class="dropzone-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p class="dropzone-title">Drag & drop file PDF di sini</p>
          <p class="dropzone-hint">Klik untuk memilih · Bisa lebih dari satu file</p>
        </div>

        {#if files.length > 0}
          <div class="file-list">
            {#each files as f (f.name)}
              <div class="file-row">
                <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span class="file-name">{f.name}</span>
                <span class="file-size">{fileSizeLabel(f.size)}</span>
                <button
                  class="file-remove"
                  on:click|stopPropagation={() => removeFile(f.name)}
                  aria-label="Hapus file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        {/if}

      {#if error}
        <div class="error">{error}</div>
      {/if}

        <div class="extract-controls">
          <button
            class="btn btn-primary btn-run"
            on:click={extractAll}
            disabled={files.length === 0 || loading}
          >
            {#if loading}
              <div class="spinner"></div>
              <span>Memproses…</span>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              <span>Ekstrak{files.length > 0 ? ` ${files.length} File` : ''}</span>
            {/if}
          </button>
          {#if loading && status}
            <span class="status-text">{status}</span>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Results Section -->
  {#if results.length > 0}
    <div class="results-section card card-flush fade-in">
      <header class="card-header">
        <div class="card-header-main">
          <div class="step-badge">2</div>
          <h2 class="card-title">Hasil Ekstraksi</h2>
          <div class="results-stats">
            <span class="badge badge-success">{successCount} berhasil</span>
            {#if failCount > 0}
              <span class="badge badge-danger">{failCount} gagal</span>
            {/if}
          </div>
        </div>
        <div class="card-header-actions">
          {#if successCount > 1}
            <button class="btn btn-outline" on:click={exportAllExcel}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Semua Excel
            </button>
          {/if}
          <button class="btn btn-outline" on:click={() => (results = [])}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Upload Lagi
          </button>
        </div>
      </header>

      <div class="card-content">
        <!-- File Tabs -->
        {#if results.length > 1}
          <div class="file-tabs">
            {#each results as r, i (r.fileName)}
              <button
                class="file-tab"
                class:active={activeTab === i}
                on:click={() => (activeTab = i)}
              >
                {#if r.ok}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; color: var(--success);"><polyline points="20 6 9 17 4 12"/></svg>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; color: var(--error);"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                {/if}
                {r.fileName.replace('.pdf', '').slice(0, 22)}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Active Result -->
        {#if activeResult}
          {#if activeResult.ok && activeResult.data}
            {@const d = activeResult.data}
            {@const objekList = d.pemotongan?.objek_pajak || []}

            <!-- Result Summary Bar -->
            <div class="result-summary card">
              <div class="result-summary-info">
                <p class="result-nama">{d.penerima?.nama || '—'}</p>
                <p class="result-meta">
                  No. {d.header?.nomor} · Masa {d.header?.masa_pajak} · {d.pemotongan?.jenis_pph}
                </p>
              </div>
              <div class="result-badges">
                {#if d.header?.sifat_pemotongan}
                  <span class="badge badge-amber">{d.header.sifat_pemotongan}</span>
                {/if}
                {#if d.header?.status_bukti_pemotongan}
                  <span class="badge badge-success">{d.header.status_bukti_pemotongan}</span>
                {/if}
              </div>
              <button class="btn btn-primary btn-sm" on:click={() => exportExcel(activeResult)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Excel
              </button>
            </div>

            <!-- Identity Cards -->
            <div class="identity-grid">
              <div class="card identity-card">
                <div class="section-head">
                  <span class="section-title">A. Identitas Penerima / WP Dipotong</span>
                </div>
                <div class="field-list">
                  <div class="field">
                    <span class="field-label">NPWP/NIK</span>
                    <span class="field-value mono">{d.penerima?.npwp_nik || '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Nama</span>
                    <span class="field-value accent">{d.penerima?.nama || '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">NITKU</span>
                    <span class="field-value mono">{d.penerima?.nitku || '—'}</span>
                  </div>
                </div>
              </div>

              <div class="card identity-card">
                <div class="section-head">
                  <span class="section-title">C. Identitas Pemotong PPh</span>
                </div>
                <div class="field-list">
                  <div class="field">
                    <span class="field-label">NPWP/NIK</span>
                    <span class="field-value mono">{d.pemotong?.npwp_nik || '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">NITKU</span>
                    <span class="field-value mono">{d.pemotong?.nitku || '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Nama Pemotong</span>
                    <span class="field-value accent">{d.pemotong?.nama_pemotong || '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Tanggal</span>
                    <span class="field-value">{d.pemotong?.tanggal || '—'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Nama Penandatangan</span>
                    <span class="field-value accent">{d.pemotong?.nama_penandatangan || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pemotongan Card -->
            <div class="card">
              <div class="section-head">
                <span class="section-title">B. Pemotongan / Pemungutan PPh</span>
              </div>

              <div class="pph-meta">
                <div class="pph-meta-item">
                  <span class="field-label">Jenis Fasilitas</span>
                  <span class="pph-meta-value">{d.pemotongan?.jenis_fasilitas || '—'}</span>
                </div>
                <div class="pph-meta-item">
                  <span class="field-label">Jenis PPh</span>
                  <span class="pph-meta-value">{d.pemotongan?.jenis_pph || '—'}</span>
                </div>
              </div>

              <!-- Objek Pajak Table -->
              <div class="table-wrapper">
                <table class="objek-table">
                  <thead>
                    <tr>
                      <th>Kode Objek Pajak</th>
                      <th>Objek Pajak</th>
                      <th class="text-right">DPP (Rp)</th>
                      <th class="text-right">Tarif (%)</th>
                      <th class="text-right">Pajak Penghasilan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#if objekList.length === 0}
                      <tr>
                        <td colspan="5" class="empty-cell">Tidak ada data</td>
                      </tr>
                    {:else}
                      {#each objekList as op, i (i)}
                        <tr class:alt-row={i % 2 !== 0}>
                          <td class="mono text-muted">{op.kode_objek_pajak || '—'}</td>
                          <td class="bold">{op.objek_pajak || '—'}</td>
                          <td class="text-right mono">
                            {op.dpp ? parseInt(String(op.dpp).replace(/\D/g, ''), 10).toLocaleString('id-ID') : '—'}
                          </td>
                          <td class="text-right mono">
                            {op.tarif_persen ? `${op.tarif_persen}%` : '—'}
                          </td>
                          <td class="text-right mono primary-val">
                            {op.pajak_penghasilan ? parseInt(String(op.pajak_penghasilan).replace(/\D/g, ''), 10).toLocaleString('id-ID') : '—'}
                          </td>
                        </tr>
                      {/each}
                    {/if}
                  </tbody>
                  {#if objekList.length > 1}
                    <tfoot>
                      <tr class="total-row">
                        <td colspan="2" class="total-label">TOTAL</td>
                        <td class="text-right mono total-label">
                          {totalDPP(objekList).toLocaleString('id-ID')}
                        </td>
                        <td></td>
                        <td class="text-right mono primary-val total-label">
                          {totalPPh(objekList).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tfoot>
                  {/if}
                </table>
              </div>

              <!-- Dokumen Dasar -->
              <div class="dokumen-grid">
                <div class="dokumen-item">
                  <span class="field-label">Jenis Dokumen</span>
                  <p class="dokumen-value">{d.pemotongan?.dokumen_dasar?.jenis_dokumen || '—'}</p>
                </div>
                <div class="dokumen-item">
                  <span class="field-label">Tanggal Dokumen</span>
                  <p class="dokumen-value">{d.pemotongan?.dokumen_dasar?.tanggal_dokumen || '—'}</p>
                </div>
                <div class="dokumen-item">
                  <span class="field-label">Nomor Dokumen</span>
                  <p class="dokumen-value mono">{d.pemotongan?.dokumen_dasar?.nomor_dokumen || '—'}</p>
                </div>
                <div class="dokumen-item">
                  <span class="field-label">Nomor SP2D</span>
                  <p class="dokumen-value">{d.pemotongan?.nomor_sp2d || '—'}</p>
                </div>
              </div>
            </div>
          {:else}
            <div class="card error">
              <svg style="margin-right: 8px; color: white;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Gagal memproses <strong>{activeResult.fileName}</strong>: {activeResult.error}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .card-flush {
    padding: 0 !important;
  }

  .card-content {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .dropzone {
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    padding: var(--space-8) var(--space-4);
    text-align: center;
    cursor: pointer;
    transition: var(--transition);
    background: var(--surface-alt);
  }

  .dropzone:hover,
  .dropzone.drag-active {
    border-color: var(--primary);
    background: oklch(65% 0.18 var(--brand-h) / 0.04);
  }

  .dropzone-icon {
    color: var(--primary);
    margin-bottom: var(--space-3);
    display: flex;
    justify-content: center;
  }

  .dropzone-title {
    font-weight: 700;
    font-size: var(--text-base);
    margin-bottom: var(--space-1);
    color: var(--text);
  }

  .dropzone-hint {
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  /* File list */
  .file-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .file-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface-alt);
    transition: var(--transition);
  }

  .file-icon { 
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .file-name {
    flex: 1;
    font-size: var(--text-sm);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-size: var(--text-xs);
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .file-remove {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .file-remove:hover {
    color: var(--error);
    background: oklch(65% 0.20 25 / 0.1);
  }

  /* Extract controls */
  .extract-controls {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-top: var(--space-2);
  }

  .btn-run {
    height: 48px;
    font-weight: 700;
    min-width: 160px;
  }

  .status-text {
    font-size: var(--text-sm);
    color: var(--text-muted);
    font-weight: 500;
  }

  /* Spinner */
  .spinner {
    width: 18px;
    height: 18px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    padding: 0;
    animation: spin 1s ease-in-out infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Results */
  .results-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .card-header-main {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .results-stats {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin-left: var(--space-2);
  }

  /* File Tabs */
  .file-tabs {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    padding-bottom: var(--space-1);
    flex-wrap: nowrap;
    scrollbar-width: none;
  }
  .file-tabs::-webkit-scrollbar { display: none; }

  .file-tab {
    background: var(--surface-alt);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-xs);
    font-weight: 600;
    cursor: pointer;
    color: var(--text-muted);
    white-space: nowrap;
    transition: var(--transition);
    display: flex;
    align-items: center;
  }

  .file-tab:hover {
    border-color: var(--primary);
    color: var(--text);
  }

  .file-tab.active {
    background: var(--surface);
    border-color: var(--primary);
    color: var(--primary-dark);
    box-shadow: var(--shadow-sm);
  }

  :global([data-theme="dark"]) .file-tab.active {
    color: var(--primary);
  }

  /* Result Summary */
  .result-summary {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    padding: var(--space-4) var(--space-6);
  }

  .result-summary-info { flex: 1; min-width: 200px; }

  .result-nama {
    font-size: var(--text-base);
    font-weight: 800;
    margin: 0;
    color: var(--text);
  }

  .result-meta {
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin: var(--space-1) 0 0 0;
  }

  .result-badges {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  /* Identity Grid */
  .identity-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  /* Section Head */
  .section-head {
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--border);
  }

  .section-title {
    font-weight: 800;
    font-size: var(--text-xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Fields */
  .field-list { display: flex; flex-direction: column; gap: var(--space-3); }

  .field { display: flex; flex-direction: column; gap: 2px; }

  .field-label {
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .field-value {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text);
  }

  .field-value.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  .field-value.accent { color: var(--primary-dark); }
  :global([data-theme="dark"]) .field-value.accent { color: var(--primary); }

  /* PPh Meta */
  .pph-meta {
    display: flex;
    gap: var(--space-8);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }

  .pph-meta-item { display: flex; flex-direction: column; gap: 2px; }

  .pph-meta-value {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text);
  }

  /* Table */
  .table-wrapper {
    overflow-x: auto;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    margin-bottom: var(--space-4);
  }

  .objek-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .objek-table th {
    background: var(--surface-alt);
    border-bottom: 1px solid var(--border);
    text-transform: uppercase;
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .objek-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border);
  }

  .objek-table .alt-row { background: oklch(0% 0 0 / 0.02); }

  .text-right { text-align: right; }
  .text-muted { color: var(--text-muted); }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  .bold { font-weight: 700; }

  .primary-val {
    color: var(--primary-dark);
    font-weight: 800;
  }
  :global([data-theme="dark"]) .primary-val { color: var(--primary); }

  .total-row { background: var(--primary-muted); }
  .total-label { font-weight: 800; color: var(--primary-dark); }
  :global([data-theme="dark"]) .total-label { color: var(--primary); }

  .empty-cell {
    text-align: center;
    color: var(--text-muted);
    padding: var(--space-8) !important;
  }

  /* Dokumen Dasar */
  .dokumen-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-4);
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border);
  }

  .dokumen-item { display: flex; flex-direction: column; gap: 2px; }

  .dokumen-value {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }

  /* Badge colors */
  .badge-success {
    background: oklch(65% 0.18 150 / 0.1);
    color: oklch(45% 0.18 150);
    border: 1px solid oklch(65% 0.18 150 / 0.2);
  }
  :global([data-theme="dark"]) .badge-success { color: oklch(75% 0.15 150); }

  .badge-danger {
    background: oklch(65% 0.20 25 / 0.1);
    color: oklch(45% 0.20 25);
    border: 1px solid oklch(65% 0.20 25 / 0.2);
  }
  :global([data-theme="dark"]) .badge-danger { color: oklch(75% 0.15 25); }

  .badge-amber {
    background: oklch(75% 0.18 75 / 0.1);
    color: oklch(55% 0.18 75);
    border: 1px solid oklch(75% 0.18 75 / 0.2);
  }
  :global([data-theme="dark"]) .badge-amber { color: oklch(85% 0.15 75); }

  /* Utility */
  .fade-in {
    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .identity-grid { grid-template-columns: 1fr; }
  }
</style>
