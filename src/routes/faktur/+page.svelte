<script lang="ts">
    import Navbar from "$lib/components/Navbar.svelte";
    import { extractPdfTextLocal, parseFakturText } from "$lib/faktur/parser";
    import { toExcelRows } from "$lib/faktur/formatter";
    import type { FakturData } from "$lib/faktur/types";
    import * as XLSX from "xlsx";
    import { fileSizeLabel } from "$lib/bppu/formatter";

    interface FakturResult {
        fileName: string;
        fileSize: number;
        data?: FakturData | null;
        ok: boolean;
        error?: string;
    }

    let files: File[] = [];
    let results: FakturResult[] = [];
    let loading = false;
    let status = "";
    let error = "";
    let dragOver = false;
    let activeTab = 0;
    let fileInput: HTMLInputElement;

    $: activeResult = results[activeTab];
    $: successCount = results.filter((r) => r.ok).length;
    $: failCount = results.filter((r) => !r.ok).length;

    let currentPage = 1;
    const itemsPerPage = 5;

    $: if (activeTab !== undefined) {
        currentPage = 1;
    }

    $: items = activeResult?.data?.barang_jasa || [];
    $: totalPages = Math.ceil(items.length / itemsPerPage);
    $: paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    function handleFiles(fs: FileList | null) {
        if (!fs) return;
        const pdfs = Array.from(fs).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
        if (pdfs.length === 0) {
            error = "Hanya file PDF yang didukung.";
            return;
        }
        const existing = new Set(files.map((f) => f.name));
        files = [...files, ...pdfs.filter((f) => !existing.has(f.name))];
        error = "";
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
        error = "";
        results = [];
        const out: FakturResult[] = [];

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            status = `Memproses ${i + 1}/${files.length}: ${f.name}…`;
            try {
                const text = await extractPdfTextLocal(f);
                const data = parseFakturText(text);
                out.push({
                    fileName: f.name,
                    fileSize: f.size,
                    data,
                    ok: true,
                });
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                out.push({
                    fileName: f.name,
                    fileSize: f.size,
                    ok: false,
                    error: msg,
                });
            }
        }
        results = out;
        status = "";
        loading = false;
        activeTab = 0;
    }

    function exportExcel(result: FakturResult) {
        if (!result.data) return;
        const rows = toExcelRows(result.data, result.fileName);
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Faktur Data");
        XLSX.writeFile(workbook, result.fileName.replace(".pdf", "") + "_faktur.xlsx");
    }

    function exportAllExcel() {
        const ok = results.filter((r): r is FakturResult & { data: FakturData } => r.ok && r.data != null);
        if (ok.length === 0) return;

        const allRows: any[][] = [];
        const firstResultRows = toExcelRows(ok[0].data, ok[0].fileName);
        allRows.push(firstResultRows[0]); // Header

        ok.forEach((r) => {
            const rows = toExcelRows(r.data, r.fileName);
            allRows.push(...rows.slice(1)); // Data rows only
        });

        const worksheet = XLSX.utils.aoa_to_sheet(allRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Semua Faktur");
        XLSX.writeFile(workbook, "faktur_semua.xlsx");
    }

    function reset() {
        files = [];
        results = [];
        error = "";
        status = "";
        if (fileInput) fileInput.value = "";
    }
</script>

<svelte:head>
    <title>Faktur Extractor – Demivio</title>
</svelte:head>

<div class="container animate-in">
    <Navbar />

    <!-- Upload Section -->
    {#if results.length === 0}
        <div class="card card-flush upload-card fade-in">
            <header class="card-header">
                <div class="card-header-main">
                    <div class="step-badge">1</div>
                    <h2 class="card-title">Pilih File PDF Faktur</h2>
                </div>
                {#if files.length > 0}
                    <div class="card-header-actions">
                        <button class="btn btn-outline" on:click={reset} title="Reset">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path
                                    d="M3 3v5h5"
                                /></svg
                            >
                            Reset
                        </button>
                    </div>
                {/if}
            </header>

            <div class="card-content">
                <div
                    class="dropzone"
                    class:drag-active={dragOver}
                    role="button"
                    tabindex="0"
                    aria-label="Klik atau drop file PDF di sini"
                    on:dragover={(e) => {
                        e.preventDefault();
                        dragOver = true;
                    }}
                    on:dragleave={() => (dragOver = false)}
                    on:drop={onDrop}
                    on:click={() => fileInput?.click()}
                    on:keydown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            fileInput?.click();
                        }
                    }}
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
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                                points="17 8 12 3 7 8"
                            /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </div>
                    <p class="dropzone-title">Drag & drop file PDF di sini</p>
                    <p class="dropzone-hint">Klik untuk memilih · Bisa lebih dari satu file</p>
                </div>

                {#if files.length > 0}
                    <div class="file-list">
                        {#each files as f (f.name)}
                            <div class="file-row">
                                <svg
                                    class="file-icon"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path
                                        d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
                                    /><polyline points="14 2 14 8 20 8" />
                                </svg>
                                <span class="file-name">{f.name}</span>
                                <span class="file-size">{fileSizeLabel(f.size)}</span>
                                <button
                                    class="file-remove"
                                    on:click|stopPropagation={() => removeFile(f.name)}
                                    aria-label="Hapus file"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2.5"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg
                            >
                            <span>Ekstrak{files.length > 0 ? ` ${files.length} File` : ""}</span>
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
                    <h2 class="card-title">Hasil Ekstraksi Faktur</h2>
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
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                                    points="7 10 12 15 17 10"
                                /><line x1="12" y1="15" x2="12" y2="3" /></svg
                            >
                            Export Semua Excel
                        </button>
                    {/if}
                    <button class="btn btn-outline" on:click={() => (results = [])}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
                        >
                        Upload Lagi
                    </button>
                </div>
            </header>

            <div class="card-content">
                <!-- File Tabs -->
                {#if results.length > 1}
                    <div class="file-tabs">
                        {#each results as r, i (r.fileName)}
                            <button class="file-tab" class:active={activeTab === i} on:click={() => (activeTab = i)}>
                                {#if r.ok}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        style="margin-right: 4px; color: var(--success);"
                                        ><polyline points="20 6 9 17 4 12" /></svg
                                    >
                                {:else}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="3"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        style="margin-right: 4px; color: var(--error);"
                                        ><line x1="18" y1="6" x2="6" y2="18" /><line
                                            x1="6"
                                            y1="6"
                                            x2="18"
                                            y2="18"
                                        /></svg
                                    >
                                {/if}
                                {r.fileName.replace(".pdf", "").slice(0, 22)}
                            </button>
                        {/each}
                    </div>
                {/if}

                <!-- Active Result -->
                {#if activeResult}
                    {#if activeResult.ok && activeResult.data}
                        {@const d = activeResult.data}

                        <!-- Result Summary Bar -->
                        <div class="result-summary card">
                            <div class="result-summary-info">
                                <p class="result-nama">
                                    {d.penjual?.nama || "—"}
                                </p>
                                <p class="result-meta">
                                    No. {d.header?.nomor_seri || "—"}
                                </p>
                                <p class="result-meta">
                                    Tanggal: {d.header?.tanggal || "—"}
                                </p>
                                <p class="result-meta">
                                    Penanda Tangan: {d.header?.penanda_tangan || "—"}
                                </p>
                            </div>
                            <div class="result-badges">
                                <span class="badge badge-success">Faktur Pajak</span>
                            </div>
                            <button class="btn btn-primary btn-sm" on:click={() => exportExcel(activeResult)}>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
                                        points="7 10 12 15 17 10"
                                    /><line x1="12" y1="15" x2="12" y2="3" /></svg
                                >
                                Excel
                            </button>
                        </div>

                        <!-- Identity Grid -->
                        <div class="identity-grid">
                            <div class="card identity-card">
                                <div class="section-head">
                                    <span class="section-title">Penjual</span>
                                </div>
                                <div class="field-list">
                                    <div class="field">
                                        <span class="field-label">Nama</span>
                                        <span class="field-value accent">{d.penjual?.nama || "—"}</span>
                                    </div>
                                    <div class="field">
                                        <span class="field-label">NPWP</span>
                                        <span class="field-value mono">{d.penjual?.npwp || "—"}</span>
                                    </div>
                                    <div class="field">
                                        <span class="field-label">Alamat</span>
                                        <span class="field-value">{d.penjual?.alamat || "—"}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="card identity-card">
                                <div class="section-head">
                                    <span class="section-title">Pembeli</span>
                                </div>
                                <div class="field-list">
                                    <div class="field">
                                        <span class="field-label">Nama</span>
                                        <span class="field-value accent">{d.pembeli?.nama || "—"}</span>
                                    </div>
                                    <div class="field">
                                        <span class="field-label">NPWP/NIK</span>
                                        <span class="field-value mono">{d.pembeli?.npwp || d.pembeli?.nik || "—"}</span>
                                    </div>
                                    <div class="field">
                                        <span class="field-label">Alamat</span>
                                        <span class="field-value">{d.pembeli?.alamat || "—"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Detail Faktur & Pajak -->
                        <div class="card">
                            <div class="section-head">
                                <span class="section-title">Detail Faktur & Pajak</span>
                                <span class="section-badge">{items.length} barang/jasa</span>
                            </div>

            <div class="table-wrapper">
                <table class="objek-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Kode</th>
                            <th>Nama</th>
                            <th class="text-right">Kuantitas</th>
                            <th>Satuan</th>
                            <th class="text-right">Harga Jual</th>
                            <th class="text-right">Total Harga Jual</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each paginatedItems as b}
                            <tr>
                                <td><span class="rank-badge">{b.nomor}</span></td>
                                <td class="mono">{b.kode}</td>
                                <td>{b.nama}</td>
                                <td class="text-right mono">{b.kuantitas || "—"}</td>
                                <td>{b.satuan || "—"}</td>
                                <td class="text-right mono">{b.harga_jual || "—"}</td>
                                <td class="text-right mono primary-val">{b.total_harga_jual || "—"}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            {#if items.length > 5}
                <div class="pagination">
                    <button 
                        class="btn btn-outline" 
                        disabled={currentPage === 1} 
                        on:click={() => currentPage--}
                        title="Halaman Sebelumnya"
                    >
                        ‹
                    </button>
                    <span class="pagination-info">
                        Halaman {currentPage} / {totalPages}
                    </span>
                    <button 
                        class="btn btn-outline" 
                        disabled={currentPage === totalPages} 
                        on:click={() => currentPage++}
                        title="Halaman Berikutnya"
                    >
                        ›
                    </button>
                </div>
            {/if}

            <div class="summary-section">
                <div class="summary-grid">
                    <div class="summary-card">
                        <span class="summary-label">Grand Total Harga Jual</span>
                        <span class="summary-value accent">{d.total_harga_jual || "—"}</span>
                    </div>
                    <div class="summary-card">
                        <span class="summary-label">Dasar Pengenaan Pajak (DPP)</span>
                        <span class="summary-value">{d.dpp || "—"}</span>
                    </div>
                    <div class="summary-card">
                        <span class="summary-label">PPN</span>
                        <span class="summary-value">{d.ppn || "—"}</span>
                    </div>
                    <div class="summary-card">
                        <span class="summary-label">PPnBM</span>
                        <span class="summary-value">{d.ppnbm || "—"}</span>
                    </div>
                </div>
            </div>
        </div>
                    {:else}
                        <div class="card error">
                            <svg
                                style="margin-right: 8px; color: white;"
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line
                                    x1="9"
                                    y1="9"
                                    x2="15"
                                    y2="15"
                                /></svg
                            >
                            Gagal memproses
                            <strong>{activeResult.fileName}</strong>: {activeResult.error}
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
        overflow: hidden;
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
        background: oklch(65% 0.2 25 / 0.1);
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
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        background: var(--surface-alt);
        border-bottom: 1px solid var(--border);
    }

    /* Results */
    .results-section {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
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
    .file-tabs::-webkit-scrollbar {
        display: none;
    }

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

    .result-summary-info {
        flex: 1;
        min-width: 200px;
    }

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
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .section-badge {
        font-size: var(--text-xs);
        font-weight: 700;
        color: var(--text-muted);
        background: var(--surface-alt);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
    }

    .section-title {
        font-weight: 800;
        font-size: var(--text-xs);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    /* Fields */
    .field-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

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

    .field-value.mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .field-value.accent {
        color: var(--primary-dark);
    }
    :global([data-theme="dark"]) .field-value.accent {
        color: var(--primary);
    }



    .primary-val {
        color: var(--primary-dark);
        font-weight: 800;
    }
    :global([data-theme="dark"]) .primary-val {
        color: var(--primary);
    }

    /* Table */
    .table-wrapper {
        overflow-x: auto;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        margin-top: var(--space-4);
    }

    .objek-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--text-sm);
    }

    .objek-table th {
        background: var(--surface);
        border-bottom: 1px solid var(--border-strong);
        font-size: var(--text-xs);
        color: var(--text-muted);
        font-weight: 700;
        padding: var(--space-3) var(--space-4);
        text-align: left;
    }

    .objek-table td {
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--border);
        vertical-align: middle;
        color: var(--text);
    }

    .objek-table tr:hover {
        background: var(--surface-alt);
    }

    .rank-badge {
        display: inline-flex;
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

    .text-right {
        text-align: right;
    }
    .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Badge colors */
    .badge-success {
        background: oklch(65% 0.18 150 / 0.1);
        color: oklch(45% 0.18 150);
        border: 1px solid oklch(65% 0.18 150 / 0.2);
    }
    :global([data-theme="dark"]) .badge-success {
        color: oklch(75% 0.15 150);
    }

    .badge-danger {
        background: oklch(65% 0.2 25 / 0.1);
        color: oklch(45% 0.2 25);
        border: 1px solid oklch(65% 0.2 25 / 0.2);
    }
    :global([data-theme="dark"]) .badge-danger {
        color: oklch(75% 0.15 25);
    }

    /* Utility */
    .fade-in {
        animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Responsive */
    @media (max-width: 1024px) {
        .identity-grid {
            grid-template-columns: 1fr;
        }
    }

    /* Summary Section styling (Not Table) */
    .summary-section {
        margin-top: var(--space-6);
        padding-top: var(--space-4);
        border-top: 1px solid var(--border);
    }

    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: var(--space-4);
    }

    .summary-card {
        background: var(--surface-alt);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .summary-label {
        font-size: var(--text-xs);
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .summary-value {
        font-size: var(--text-lg);
        font-weight: 800;
        color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .summary-value.accent {
        color: var(--primary-dark);
    }
    :global([data-theme="dark"]) .summary-value.accent {
        color: var(--primary);
    }

    /* Pagination */
    .pagination {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: var(--space-2);
        margin-top: var(--space-2);
        padding: 0;
    }

    .pagination :global(.btn) {
        height: 28px;
        width: 28px;
        min-width: 28px;
        padding: 0;
        font-size: var(--text-base);
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        cursor: pointer;
    }

    .pagination-info {
        font-size: var(--text-xs);
        font-weight: 700;
        color: var(--text-muted);
        padding: 0 var(--space-1);
    }
</style>
