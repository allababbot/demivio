<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import { parseBppuText, extractPdfTextLocal } from '$lib/bppu/parser';
  import { fileSizeLabel, toCSV, fmtRp } from '$lib/bppu/formatter';
  import type { BppuResult, BppuData, ObjekPajak } from '$lib/bppu/types';

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

  function exportCSV(result: BppuResult) {
    if (!result.data) return;
    const csv = toCSV(result.data, result.fileName);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName.replace('.pdf', '') + '_bppu.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAllCSV() {
    const ok = results.filter((r): r is BppuResult & { data: BppuData } => r.ok && r.data != null);
    if (ok.length === 0) return;
    const header = toCSV(ok[0].data, ok[0].fileName).split('\n')[0];
    const allRows = [header];
    ok.forEach((r) => {
      const lines = toCSV(r.data, r.fileName).split('\n').slice(1);
      allRows.push(...lines);
    });
    const blob = new Blob([allRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bppu_semua.csv';
    a.click();
    URL.revokeObjectURL(url);
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

<div class="container bppu-page animate-in">
  <Navbar />
  <!-- Page Header -->
  <div class="page-header">
    <div class="page-title-group">
    </div>
    <div class="page-actions">
      {#if successCount > 1}
        <button class="btn btn-outline btn-sm" on:click={exportAllCSV}>
          ⬇ Export Semua CSV
        </button>
      {/if}
      {#if files.length > 0 || results.length > 0}
        <button class="btn btn-outline btn-sm" on:click={reset}>Reset</button>
      {/if}
    </div>
  </div>

  <!-- Upload Section -->
  {#if results.length === 0}
    <div class="card upload-card fade-in">
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
        <div class="dropzone-icon">📂</div>
        <p class="dropzone-title">Drag & drop file PDF di sini</p>
        <p class="dropzone-hint">Klik untuk memilih · Bisa lebih dari satu file</p>
      </div>

      {#if files.length > 0}
        <div class="file-list">
          {#each files as f (f.name)}
            <div class="file-row">
              <span class="file-icon">📄</span>
              <span class="file-name">{f.name}</span>
              <span class="file-size">{fileSizeLabel(f.size)}</span>
              <button
                class="file-remove"
                on:click|stopPropagation={() => removeFile(f.name)}
                aria-label="Hapus file"
              >✕</button>
            </div>
          {/each}
        </div>
      {/if}

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <div class="extract-controls">
        <button
          class="btn btn-primary"
          on:click={extractAll}
          disabled={files.length === 0 || loading}
        >
          {#if loading}
            <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Memproses…
          {:else}
            ⚡ Ekstrak{files.length > 0 ? ` ${files.length} File` : ''}
          {/if}
        </button>
        {#if loading && status}
          <span class="status-text">{status}</span>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Results Section -->
  {#if results.length > 0}
    <div class="results-section fade-in">
      <!-- Results Header -->
      <div class="results-header">
        <span class="results-title">Hasil Ekstraksi</span>
        <span class="badge badge-success">{successCount} berhasil</span>
        {#if failCount > 0}
          <span class="badge badge-danger">{failCount} gagal</span>
        {/if}
        <button class="btn btn-outline btn-sm" style="margin-left: auto;" on:click={() => (results = [])}>
          ← Upload Lagi
        </button>
      </div>

      <!-- File Tabs -->
      {#if results.length > 1}
        <div class="file-tabs">
          {#each results as r, i (r.fileName)}
            <button
              class="file-tab"
              class:active={activeTab === i}
              on:click={() => (activeTab = i)}
            >
              {r.ok ? '✓' : '✕'} {r.fileName.replace('.pdf', '').slice(0, 22)}
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
            <button class="btn btn-primary btn-sm" on:click={() => exportCSV(activeResult)}>
              ⬇ CSV
            </button>
          </div>

          <!-- Identity Cards -->
          <div class="identity-grid">
            <div class="card identity-card">
              <div class="section-head">
                <span class="section-icon">👤</span>
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
                <span class="section-icon">🏢</span>
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
              <span class="section-icon">🧾</span>
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
            ❌ Gagal memproses <strong>{activeResult.fileName}</strong>: {activeResult.error}
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .bppu-page {
    gap: 1rem;
    overflow-y: auto;
    height: auto;
    min-height: 100vh;
  }

  /* Page Header */
  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .page-title-group {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    flex: 1;
  }



  .page-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
  }

  /* Upload */
  .upload-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .dropzone {
    border: 2px dashed var(--border);
    border-radius: 12px;
    padding: 2.5rem 1.5rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .dropzone:hover,
  .dropzone.drag-active {
    border-color: var(--primary);
    background: rgba(217, 119, 6, 0.04);
  }

  .dropzone-icon {
    font-size: 2.25rem;
    margin-bottom: 0.625rem;
  }

  .dropzone-title {
    font-weight: 600;
    font-size: 0.9375rem;
    margin-bottom: 0.25rem;
  }

  .dropzone-hint {
    color: var(--text-muted);
    font-size: 0.8125rem;
  }

  /* File list */
  .file-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .file-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 0.875rem;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-input);
    transition: background 0.15s;
  }

  .file-icon { font-size: 1.1rem; }

  .file-name {
    flex: 1;
    font-size: 0.8125rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-size: 0.75rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .file-remove {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.875rem;
    padding: 2px 6px;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }

  .file-remove:hover {
    color: var(--danger);
    background: rgba(220, 38, 38, 0.08);
  }

  /* Extract controls */
  .extract-controls {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    margin-top: 0.25rem;
  }

  .status-text {
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  /* Spinner */
  .spinner {
    width: 16px;
    height: 16px;
    animation: spin 1s linear infinite;
    display: inline-block;
    vertical-align: middle;
    margin-right: 4px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Fade in */
  .fade-in {
    animation: fadeUp 0.3s ease both;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Results */
  .results-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .results-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
  }

  .results-title {
    font-weight: 700;
    font-size: 0.9375rem;
  }

  /* Badges */
  .badge-success {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #6ee7b7;
  }

  .badge-danger {
    background: rgba(239,68,68,0.1);
    color: var(--danger);
    border: 1px solid rgba(239,68,68,0.3);
  }

  .badge-amber {
    background: #fef3c7;
    color: #92600a;
    border: 1px solid #fcd34d;
  }

  :global([data-theme="dark"]) .badge-success {
    background: rgba(6, 95, 70, 0.3);
    color: #6ee7b7;
    border-color: rgba(110, 231, 183, 0.3);
  }

  :global([data-theme="dark"]) .badge-amber {
    background: rgba(146, 96, 10, 0.3);
    color: #fcd34d;
    border-color: rgba(252, 211, 77, 0.3);
  }

  /* File Tabs */
  .file-tabs {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    padding-bottom: 2px;
    flex-wrap: nowrap;
  }

  .file-tab {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 6px 13px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    color: var(--text-muted);
    white-space: nowrap;
    transition: all 0.15s;
  }

  .file-tab:hover {
    background: var(--bg-input);
  }

  .file-tab.active {
    background: var(--bg-card);
    border-color: var(--border);
    color: var(--text);
    font-weight: 700;
  }

  /* Result Summary */
  .result-summary {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    flex-wrap: wrap;
    padding: 0.875rem 1.25rem;
  }

  .result-summary-info { flex: 1; min-width: 150px; }

  .result-nama {
    font-size: 0.9375rem;
    font-weight: 700;
    margin-bottom: 0.125rem;
  }

  .result-meta {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .result-badges {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  /* Identity Grid */
  .identity-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .identity-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Section Head */
  .section-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .section-icon { font-size: 1rem; }

  .section-title {
    font-weight: 700;
    font-size: 0.8125rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Fields */
  .field-list { display: flex; flex-direction: column; gap: 0.5rem; }

  .field { display: flex; flex-direction: column; gap: 2px; }

  .field-label {
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .field-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text);
  }

  .field-value.mono { font-family: 'Space Mono', 'Courier New', monospace; }
  .field-value.accent { color: var(--primary-dark); }

  :global([data-theme="dark"]) .field-value.accent { color: var(--primary-light); }

  /* PPh Meta */
  .pph-meta {
    display: flex;
    gap: 2rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .pph-meta-item { display: flex; flex-direction: column; gap: 2px; }

  .pph-meta-value {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text);
  }

  /* Table */
  .table-wrapper {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid var(--border);
    margin-bottom: 1rem;
  }

  .objek-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    margin-top: 0;
  }

  .objek-table th {
    padding: 0.625rem 0.875rem;
    background: var(--bg);
    font-weight: 700;
    font-size: 0.6875rem;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
  }

  .objek-table td {
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid var(--border);
    color: var(--text);
  }

  .objek-table tr:last-child td { border-bottom: none; }

  .objek-table .alt-row { background: var(--bg-input); }

  .objek-table tr:hover td { background: rgba(217, 119, 6, 0.04); }

  .text-right { text-align: right; }
  .text-muted { color: var(--text-muted); }
  .mono { font-family: 'Space Mono', 'Courier New', monospace; }
  .bold { font-weight: 600; }

  .primary-val {
    color: var(--primary-dark);
    font-weight: 700;
  }

  :global([data-theme="dark"]) .primary-val { color: var(--primary-light); }

  .total-row { background: rgba(217, 119, 6, 0.06); }
  .total-label { font-weight: 700; color: var(--primary-dark); }
  :global([data-theme="dark"]) .total-label { color: var(--primary-light); }

  .empty-cell {
    text-align: center;
    color: var(--text-muted);
    padding: 1rem !important;
  }

  /* Dokumen Dasar */
  .dokumen-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .dokumen-item { display: flex; flex-direction: column; gap: 2px; }

  .dokumen-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text);
    margin: 0;
  }

  /* Button sizes */
  .btn-sm {
    padding: 0.4rem 0.875rem;
    font-size: 0.8125rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .identity-grid { grid-template-columns: 1fr; }
    .page-header { flex-direction: column; align-items: flex-start; }
    .result-summary { flex-direction: column; align-items: flex-start; }
  }
</style>
