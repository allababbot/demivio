<script lang="ts">
    import { parseBppuText, extractPdfTextLocal as extractBppu } from "$lib/bppu/parser";
    import { fileSizeLabel, toExcelRows as bppuToExcelRows } from "$lib/bppu/formatter";
    import type { BppuResult, BppuData, ObjekPajak } from "$lib/bppu/types";

    import { extractPdfTextLocal as extractFaktur, parseFakturText } from "$lib/faktur/parser";
    import { toExcelRows as fakturToExcelRows } from "$lib/faktur/formatter";
    import type { FakturData } from "$lib/faktur/types";

    import * as XLSX from "xlsx";

    type Format = "bppu" | "faktur";

    interface FakturResult {
        fileName: string;
        fileSize: number;
        data?: FakturData | null;
        ok: boolean;
        error?: string;
    }

    // State
    let format: Format | "" = "";
    let files: File[] = [];
    let bppuResults: BppuResult[] = [];
    let fakturResults: FakturResult[] = [];
    let loading = false;
    let status = "";
    let error = "";
    let dragOver = false;
    let activeTab = 0;
    let fileInput: HTMLInputElement;

    // Faktur pagination
    let currentPage = 1;
    const itemsPerPage = 5;

    $: if (activeTab !== undefined) { currentPage = 1; }

    $: results = format === "bppu" ? bppuResults : fakturResults;
    $: activeResult = results[activeTab] as any;
    $: successCount = results.filter((r) => r.ok).length;
    $: failCount = results.filter((r) => !r.ok).length;

    $: fakturActiveResult = fakturResults[activeTab];
    $: fakturItems = fakturActiveResult?.data?.barang_jasa || [];
    $: totalPages = Math.ceil(fakturItems.length / itemsPerPage);
    $: paginatedItems = fakturItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    function onFormatChange() {
        files = [];
        bppuResults = [];
        fakturResults = [];
        error = "";
        status = "";
        if (fileInput) fileInput.value = "";
    }

    function handleFiles(fs: FileList | null) {
        if (!fs) return;
        const pdfs = Array.from(fs).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
        if (pdfs.length === 0) { error = "Hanya file PDF yang didukung."; return; }
        const existing = new Set(files.map((f) => f.name));
        files = [...files, ...pdfs.filter((f) => !existing.has(f.name))];
        error = "";
    }

    function onDrop(e: DragEvent) {
        e.preventDefault();
        dragOver = false;
        if (!format) return;
        handleFiles(e.dataTransfer?.files ?? null);
    }

    function removeFile(name: string) {
        files = files.filter((f) => f.name !== name);
        bppuResults = bppuResults.filter((r) => r.fileName !== name);
        fakturResults = fakturResults.filter((r) => r.fileName !== name);
    }

    async function extractAll() {
        if (files.length === 0 || !format) return;
        loading = true;
        error = "";
        bppuResults = [];
        fakturResults = [];
        activeTab = 0;

        if (format === "bppu") {
            const out: BppuResult[] = [];
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                status = `Memproses ${i + 1}/${files.length}: ${f.name}…`;
                try {
                    const text = await extractBppu(f);
                    const data = parseBppuText(text);
                    out.push({ fileName: f.name, fileSize: f.size, data, ok: true });
                } catch (e: unknown) {
                    out.push({ fileName: f.name, fileSize: f.size, ok: false, error: e instanceof Error ? e.message : String(e) });
                }
            }
            bppuResults = out;
        } else {
            const out: FakturResult[] = [];
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                status = `Memproses ${i + 1}/${files.length}: ${f.name}…`;
                try {
                    const text = await extractFaktur(f);
                    const data = parseFakturText(text);
                    out.push({ fileName: f.name, fileSize: f.size, data, ok: true });
                } catch (e: unknown) {
                    out.push({ fileName: f.name, fileSize: f.size, ok: false, error: e instanceof Error ? e.message : String(e) });
                }
            }
            fakturResults = out;
        }
        status = "";
        loading = false;
    }

    // BPPU exports
    function exportBppuExcel(result: BppuResult) {
        if (!result.data) return;
        const rows = bppuToExcelRows(result.data, result.fileName);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "BPPU Data");
        XLSX.writeFile(wb, result.fileName.replace(".pdf", "") + "_bppu.xlsx");
    }

    function exportAllBppuExcel() {
        const ok = bppuResults.filter((r): r is BppuResult & { data: BppuData } => r.ok && r.data != null);
        if (ok.length === 0) return;
        const allRows: any[][] = [];
        const first = bppuToExcelRows(ok[0].data, ok[0].fileName);
        allRows.push(first[0]);
        ok.forEach((r) => { const rows = bppuToExcelRows(r.data, r.fileName); allRows.push(...rows.slice(1)); });
        const ws = XLSX.utils.aoa_to_sheet(allRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Semua BPPU");
        XLSX.writeFile(wb, "bppu_semua.xlsx");
    }

    // Faktur exports
    function exportFakturExcel(result: FakturResult) {
        if (!result.data) return;
        const rows = fakturToExcelRows(result.data, result.fileName);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Faktur Data");
        XLSX.writeFile(wb, result.fileName.replace(".pdf", "") + "_faktur.xlsx");
    }

    function exportAllFakturExcel() {
        const ok = fakturResults.filter((r): r is FakturResult & { data: FakturData } => r.ok && r.data != null);
        if (ok.length === 0) return;
        const allRows: any[][] = [];
        const first = fakturToExcelRows(ok[0].data, ok[0].fileName);
        allRows.push(first[0]);
        ok.forEach((r) => { const rows = fakturToExcelRows(r.data, r.fileName); allRows.push(...rows.slice(1)); });
        const ws = XLSX.utils.aoa_to_sheet(allRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Semua Faktur");
        XLSX.writeFile(wb, "faktur_semua.xlsx");
    }

    function resetFiles() {
        files = [];
        bppuResults = [];
        fakturResults = [];
        error = "";
        status = "";
        if (fileInput) fileInput.value = "";
    }

    function totalDPP(objekList: ObjekPajak[]) {
        return objekList.reduce((s, o) => { const n = parseInt(String(o.dpp || "0").replace(/\D/g, ""), 10); return s + (Number.isNaN(n) ? 0 : n); }, 0);
    }
    function totalPPh(objekList: ObjekPajak[]) {
        return objekList.reduce((s, o) => { const n = parseInt(String(o.pajak_penghasilan || "0").replace(/\D/g, ""), 10); return s + (Number.isNaN(n) ? 0 : n); }, 0);
    }
</script>

<svelte:head>
    <title>Ekstraktor – Demivio</title>
</svelte:head>

<div class="container animate-in">
    <!-- Upload Section -->
    {#if results.length === 0}
        <div class="upload-grid">
            <div class="upload-card fade-in">
                <header class="card-header">
                    <div class="card-header-main">
                        <div class="step-badge">1</div>
                        <div class="format-select-wrapper">
                            <select
                                class="format-select"
                                bind:value={format}
                                on:change={onFormatChange}
                            >
                                <option value="" disabled>Pilih format dokumen</option>
                                <option value="bppu">BPPU (Bukti Potong/Pungut Unifikasi)</option>
                                <option value="faktur">Faktur Pajak (e-Faktur)</option>
                            </select>
                            <svg class="select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                    </div>
                    {#if files.length > 0}
                        <div class="card-header-actions">
                            <button class="btn btn-outline" on:click={resetFiles} title="Reset">
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
                    class:disabled={!format}
                    on:dragover|preventDefault={() => { if (format) dragOver = true; }}
                    on:dragleave={() => (dragOver = false)}
                    on:drop={onDrop}
                    for="ekstraktor-input"
                >
                    {#if loading}
                        <div class="processing-bar"><div class="processing-fill"></div></div>
                        <span class="drop-text">Memproses…</span>
                    {:else if !format}
                        <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                        <span class="drop-text">Pilih format dokumen terlebih dahulu</span>
                    {:else if files.length > 0}
                        <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                        <span class="file-name">{files.length} file dipilih</span>
                        <span class="file-count">{files.length} file</span>
                    {:else}
                        <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                        <span class="drop-text">Drag & drop PDF di sini</span>
                        <span class="drop-divider">atau</span>
                        <span class="btn btn-outline btn-sm">Pilih File</span>
                    {/if}
                    <input
                        id="ekstraktor-input"
                        bind:this={fileInput}
                        type="file"
                        accept="application/pdf"
                        multiple
                        class="file-input"
                        disabled={!format}
                        on:change={(e) => handleFiles(e.currentTarget.files)}
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
                        <button class="btn btn-primary btn-run" on:click={extractAll} disabled={loading}>
                            {#if loading}
                                <div class="spinner"></div>
                                <span>Memproses…</span>
                            {:else}
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                                <span>Ekstrak {files.length} File</span>
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

    <!-- Results Section -->
    {#if results.length > 0}
        <div class="results-section card card-flush fade-in">
            <header class="card-header">
                <div class="card-header-main">
                    <div class="step-badge">2</div>
                    <h2 class="card-title">Hasil Ekstraksi {format === "bppu" ? "BPPU" : "Faktur"}</h2>
                    <div class="results-stats">
                        <span class="badge badge-success">{successCount} berhasil</span>
                        {#if failCount > 0}
                            <span class="badge badge-danger">{failCount} gagal</span>
                        {/if}
                    </div>
                </div>
                <div class="card-header-actions">
                    {#if successCount > 1}
                        <button class="btn btn-outline" on:click={() => format === "bppu" ? exportAllBppuExcel() : exportAllFakturExcel()}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Export Semua Excel
                        </button>
                    {/if}
                    <button class="btn btn-outline" on:click={() => { bppuResults = []; fakturResults = []; files = []; }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        Upload Lagi
                    </button>
                </div>
            </header>

            <div class="card-content">
                {#if results.length > 1}
                    <div class="file-tabs">
                        {#each results as r, i (r.fileName)}
                            <button class="file-tab" class:active={activeTab === i} on:click={() => (activeTab = i)}>
                                {#if r.ok}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; color: var(--success);"><polyline points="20 6 9 17 4 12" /></svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; color: var(--error);"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                {/if}
                                {r.fileName.replace(".pdf", "").slice(0, 22)}
                            </button>
                        {/each}
                    </div>
                {/if}

                <!-- BPPU Result -->
                {#if format === "bppu"}
                    {#if activeResult?.ok && activeResult.data}
                        {@const d = activeResult.data}
                        {@const objekList = d.pemotongan?.objek_pajak || []}
                        <div class="result-summary card">
                            <div class="result-summary-info">
                                <p class="result-nama">{d.penerima?.nama || "—"}</p>
                                <p class="result-meta">No. {d.header?.nomor} · Masa {d.header?.masa_pajak} · {d.pemotongan?.jenis_pph}</p>
                            </div>
                            <div class="result-badges">
                                {#if d.header?.sifat_pemotongan}<span class="badge badge-amber">{d.header.sifat_pemotongan}</span>{/if}
                                {#if d.header?.status_bukti_pemotongan}<span class="badge badge-success">{d.header.status_bukti_pemotongan}</span>{/if}
                            </div>
                            <button class="btn btn-primary btn-sm" on:click={() => exportBppuExcel(activeResult)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Excel
                            </button>
                        </div>

                        <div class="identity-grid">
                            <div class="card identity-card">
                                <div class="section-head"><span class="section-title">A. Identitas Penerima / WP Dipotong</span></div>
                                <div class="field-list">
                                    <div class="field"><span class="field-label">NPWP/NIK</span><span class="field-value mono">{d.penerima?.npwp_nik || "—"}</span></div>
                                    <div class="field"><span class="field-label">Nama</span><span class="field-value accent">{d.penerima?.nama || "—"}</span></div>
                                    <div class="field"><span class="field-label">NITKU</span><span class="field-value mono">{d.penerima?.nitku || "—"}</span></div>
                                </div>
                            </div>
                            <div class="card identity-card">
                                <div class="section-head"><span class="section-title">C. Identitas Pemotong PPh</span></div>
                                <div class="field-list">
                                    <div class="field"><span class="field-label">NPWP/NIK</span><span class="field-value mono">{d.pemotong?.npwp_nik || "—"}</span></div>
                                    <div class="field"><span class="field-label">NITKU</span><span class="field-value mono">{d.pemotong?.nitku || "—"}</span></div>
                                    <div class="field"><span class="field-label">Nama Pemotong</span><span class="field-value accent">{d.pemotong?.nama_pemotong || "—"}</span></div>
                                    <div class="field"><span class="field-label">Tanggal</span><span class="field-value">{d.pemotong?.tanggal || "—"}</span></div>
                                    <div class="field"><span class="field-label">Nama Penandatangan</span><span class="field-value accent">{d.pemotong?.nama_penandatangan || "—"}</span></div>
                                </div>
                            </div>
                        </div>

                        <div class="card">
                            <div class="section-head"><span class="section-title">B. Pemotongan / Pemungutan PPh</span></div>
                            <div class="pph-meta">
                                <div class="pph-meta-item"><span class="field-label">Jenis Fasilitas</span><span class="pph-meta-value">{d.pemotongan?.jenis_fasilitas || "—"}</span></div>
                                <div class="pph-meta-item"><span class="field-label">Jenis PPh</span><span class="pph-meta-value">{d.pemotongan?.jenis_pph || "—"}</span></div>
                            </div>
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
                                            <tr><td colspan="5" class="empty-cell">Tidak ada data</td></tr>
                                        {:else}
                                            {#each objekList as op, i (i)}
                                                <tr class:alt-row={i % 2 !== 0}>
                                                    <td class="mono text-muted">{op.kode_objek_pajak || "—"}</td>
                                                    <td class="bold">{op.objek_pajak || "—"}</td>
                                                    <td class="text-right mono">{op.dpp ? parseInt(String(op.dpp).replace(/\D/g, ""), 10).toLocaleString("id-ID") : "—"}</td>
                                                    <td class="text-right mono">{op.tarif_persen ? `${op.tarif_persen}%` : "—"}</td>
                                                    <td class="text-right mono primary-val">{op.pajak_penghasilan ? parseInt(String(op.pajak_penghasilan).replace(/\D/g, ""), 10).toLocaleString("id-ID") : "—"}</td>
                                                </tr>
                                            {/each}
                                        {/if}
                                    </tbody>
                                    {#if objekList.length > 1}
                                        <tfoot>
                                            <tr class="total-row">
                                                <td colspan="2" class="total-label">TOTAL</td>
                                                <td class="text-right mono total-label">{totalDPP(objekList).toLocaleString("id-ID")}</td>
                                                <td></td>
                                                <td class="text-right mono primary-val total-label">{totalPPh(objekList).toLocaleString("id-ID")}</td>
                                            </tr>
                                        </tfoot>
                                    {/if}
                                </table>
                            </div>
                            <div class="dokumen-grid">
                                <div class="dokumen-item"><span class="field-label">Jenis Dokumen</span><p class="dokumen-value">{d.pemotongan?.dokumen_dasar?.jenis_dokumen || "—"}</p></div>
                                <div class="dokumen-item"><span class="field-label">Tanggal Dokumen</span><p class="dokumen-value">{d.pemotongan?.dokumen_dasar?.tanggal_dokumen || "—"}</p></div>
                                <div class="dokumen-item"><span class="field-label">Nomor Dokumen</span><p class="dokumen-value mono">{d.pemotongan?.dokumen_dasar?.nomor_dokumen || "—"}</p></div>
                                <div class="dokumen-item"><span class="field-label">Nomor SP2D</span><p class="dokumen-value">{d.pemotongan?.nomor_sp2d || "—"}</p></div>
                            </div>
                        </div>
                    {:else if activeResult && !activeResult.ok}
                        <div class="card error">
                            <svg style="margin-right: 8px; color: white;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                            Gagal memproses <strong>{activeResult.fileName}</strong>: {activeResult.error}
                        </div>
                    {/if}
                {/if}

                <!-- Faktur Result -->
                {#if format === "faktur"}
                    {#if fakturActiveResult?.ok && fakturActiveResult.data}
                        {@const d = fakturActiveResult.data}
                        <div class="result-summary card">
                            <div class="result-summary-info">
                                <p class="result-nama">{d.penjual?.nama || "—"}</p>
                                <p class="result-meta">No. {d.header?.nomor_seri || "—"}</p>
                                <p class="result-meta">Tanggal: {d.header?.tanggal || "—"}</p>
                                <p class="result-meta">Penanda Tangan: {d.header?.penanda_tangan || "—"}</p>
                            </div>
                            <div class="result-badges"><span class="badge badge-success">Faktur Pajak</span></div>
                            <button class="btn btn-primary btn-sm" on:click={() => exportFakturExcel(fakturActiveResult)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Excel
                            </button>
                        </div>

                        <div class="identity-grid">
                            <div class="card identity-card">
                                <div class="section-head"><span class="section-title">Penjual</span></div>
                                <div class="field-list">
                                    <div class="field"><span class="field-label">Nama</span><span class="field-value accent">{d.penjual?.nama || "—"}</span></div>
                                    <div class="field"><span class="field-label">NPWP</span><span class="field-value mono">{d.penjual?.npwp || "—"}</span></div>
                                    <div class="field"><span class="field-label">Alamat</span><span class="field-value">{d.penjual?.alamat || "—"}</span></div>
                                </div>
                            </div>
                            <div class="card identity-card">
                                <div class="section-head"><span class="section-title">Pembeli</span></div>
                                <div class="field-list">
                                    <div class="field"><span class="field-label">Nama</span><span class="field-value accent">{d.pembeli?.nama || "—"}</span></div>
                                    <div class="field"><span class="field-label">NPWP/NIK</span><span class="field-value mono">{d.pembeli?.npwp || d.pembeli?.nik || "—"}</span></div>
                                    <div class="field"><span class="field-label">Alamat</span><span class="field-value">{d.pembeli?.alamat || "—"}</span></div>
                                </div>
                            </div>
                        </div>

                        <div class="card">
                            <div class="section-head">
                                <span class="section-title">Detail Faktur & Pajak</span>
                                <span class="section-badge">{fakturItems.length} barang/jasa</span>
                            </div>
                            <div class="table-wrapper">
                                <table class="objek-table">
                                    <thead>
                                        <tr>
                                            <th>#</th><th>Kode</th><th>Nama</th>
                                            <th class="text-right">Kuantitas</th><th>Satuan</th>
                                            <th class="text-right">Harga Jual</th><th class="text-right">Total Harga Jual</th>
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
                            {#if fakturItems.length > 5}
                                <div class="pagination">
                                    <button class="btn btn-outline" disabled={currentPage === 1} on:click={() => currentPage--}>‹</button>
                                    <span class="pagination-info">Halaman {currentPage} / {totalPages}</span>
                                    <button class="btn btn-outline" disabled={currentPage === totalPages} on:click={() => currentPage++}>›</button>
                                </div>
                            {/if}
                            <div class="summary-section">
                                <div class="summary-grid">
                                    <div class="summary-card"><span class="summary-label">Grand Total Harga Jual</span><span class="summary-value accent">{d.total_harga_jual || "—"}</span></div>
                                    <div class="summary-card"><span class="summary-label">Dasar Pengenaan Pajak (DPP)</span><span class="summary-value">{d.dpp || "—"}</span></div>
                                    <div class="summary-card"><span class="summary-label">PPN</span><span class="summary-value">{d.ppn || "—"}</span></div>
                                    <div class="summary-card"><span class="summary-label">PPnBM</span><span class="summary-value">{d.ppnbm || "—"}</span></div>
                                </div>
                            </div>
                        </div>
                    {:else if fakturActiveResult && !fakturActiveResult.ok}
                        <div class="card error">
                            <svg style="margin-right: 8px; color: white;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                            Gagal memproses <strong>{fakturActiveResult.fileName}</strong>: {fakturActiveResult.error}
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
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
        overflow: hidden;
    }
    .card-header .step-badge {
        flex-shrink: 0;
        margin: 0 0 0 var(--space-4);
        align-self: center;
    }
    .card-header-actions { margin-left: auto; }

    /* card-header-main di dalam upload card perlu stretch */
    .upload-card .card-header-main {
        display: flex;
        align-items: stretch;
        padding: 0;
        gap: var(--space-3);
        flex: 1;
        min-width: 0;
    }
    .upload-card .card-header-main .step-badge {
        margin: 0 0 0 var(--space-4);
        align-self: center;
        flex-shrink: 0;
    }

    /* Format dropdown */
    .format-select-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        height: 100%;
    }
    .format-select {
        appearance: none;
        -webkit-appearance: none;
        background: transparent;
        border: none;
        border-right: 1px solid var(--border);
        color: var(--text);
        font-size: var(--text-sm);
        font-weight: 600;
        font-family: inherit;
        padding: 0 2.5rem 0 var(--space-4);
        cursor: pointer;
        transition: var(--transition);
        height: 100%;
        min-width: 240px;
        max-width: 380px;
    }
    .format-select:focus-visible {
        background: var(--surface);
        color: var(--primary-dark);
    }
    .format-select:hover {
        background: var(--surface);
        color: var(--text);
    }
    :global([data-theme="dark"]) .format-select:focus-visible {
        color: var(--primary-light, var(--primary));
    }
    .format-select option { background: var(--surface); color: var(--text); }
    .select-chevron {
        position: absolute;
        right: var(--space-3);
        pointer-events: none;
        color: var(--text-muted);
        flex-shrink: 0;
    }

    /* Drop zone */
    .drop-zone {
        min-height: 140px; display: flex; flex-direction: column;
        align-items: center; justify-content: center; padding: var(--space-4);
        border: 2px dashed var(--border); margin: var(--space-4);
        border-radius: var(--radius-sm); cursor: pointer;
        transition: var(--transition); position: relative; gap: var(--space-1);
    }
    .drop-zone:hover:not(.disabled) { border-color: var(--primary); background: var(--surface-alt); }
    .drop-zone.drag-over { border-color: var(--primary); background: var(--primary-muted); }
    .drop-zone.has-file { border-style: solid; border-color: var(--primary-dark); background: var(--primary-muted); }
    .drop-zone.disabled { cursor: not-allowed; opacity: 0.5; }

    .drop-divider { font-size: 10px; color: var(--text-muted); }
    .upload-icon, .file-icon { width: 32px; height: 32px; color: var(--text-muted); }
    .drop-text { font-size: var(--text-xs); color: var(--text-muted); text-align: center; }
    .file-name { font-size: var(--text-sm); font-weight: 700; color: var(--text); }
    .file-count { font-size: 10px; color: var(--primary-dark); font-weight: 600; background: rgba(255,255,255,0.5); padding: 2px 6px; border-radius: 4px; }
    .file-input { display: none; }

    .upload-error { font-size: var(--text-xs); color: var(--danger); background: rgba(220,38,38,0.08); border-radius: 6px; padding: 0.3rem 0.65rem; margin: 0 var(--space-4) var(--space-4); }

    .processing-bar { width: 100%; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
    .processing-fill { height: 100%; width: 40%; background: linear-gradient(90deg, var(--primary), var(--primary-light)); border-radius: 2px; animation: slide 1s ease-in-out infinite alternate; }
    @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }

    .file-list { display: flex; flex-direction: column; gap: var(--space-2); padding: 0 var(--space-4) var(--space-4); }
    .file-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); }
    .file-row .file-name { flex: 1; font-size: var(--text-sm); font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-row .file-size { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
    .file-remove { width: 24px; height: 24px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: var(--transition); }
    .file-remove:hover { color: var(--danger); background: rgba(220,38,38,0.1); }

    .extract-controls { display: flex; align-items: center; gap: var(--space-4); padding: 0 var(--space-4) var(--space-4); }
    .btn-run { height: 48px; font-weight: 700; min-width: 160px; }
    .status-text { font-size: var(--text-xs); color: var(--text-muted); }
    .btn-sm { padding: var(--space-2) var(--space-4); font-size: var(--text-xs); }

    .spinner { width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .results-section { display: flex; flex-direction: column; gap: var(--space-4); }
    .results-stats { display: flex; gap: var(--space-2); align-items: center; margin-left: var(--space-2); }

    .card-flush { padding: 0 !important; overflow: hidden; }
    .card-content { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }

    .file-tabs { display: flex; gap: var(--space-2); overflow-x: auto; padding-bottom: var(--space-1); flex-wrap: nowrap; scrollbar-width: none; }
    .file-tabs::-webkit-scrollbar { display: none; }
    .file-tab { background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: var(--space-2) var(--space-4); font-size: var(--text-xs); font-weight: 600; cursor: pointer; color: var(--text-muted); white-space: nowrap; transition: var(--transition); display: flex; align-items: center; }
    .file-tab:hover { border-color: var(--primary); color: var(--text); }
    .file-tab.active { background: var(--surface); border-color: var(--primary); color: var(--primary-dark); box-shadow: var(--shadow-sm); }
    :global([data-theme="dark"]) .file-tab.active { color: var(--primary); }

    .result-summary { display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; padding: var(--space-4) var(--space-6); }
    .result-summary-info { flex: 1; min-width: 200px; }
    .result-nama { font-size: var(--text-base); font-weight: 800; margin: 0; color: var(--text); }
    .result-meta { font-size: var(--text-sm); color: var(--text-muted); margin: var(--space-1) 0 0 0; }
    .result-badges { display: flex; gap: var(--space-2); flex-wrap: wrap; }

    .identity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
    .section-head { margin-bottom: var(--space-4); padding-bottom: var(--space-2); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
    .section-title { font-weight: 800; font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
    .section-badge { font-size: var(--text-xs); background: var(--primary-muted); color: var(--primary-dark); padding: 2px 8px; border-radius: 99px; font-weight: 600; }
    :global([data-theme="dark"]) .section-badge { color: var(--primary-light); }

    .field-list { display: flex; flex-direction: column; gap: var(--space-3); }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field-label { font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .field-value { font-size: var(--text-sm); font-weight: 600; color: var(--text); }
    .field-value.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .field-value.accent { color: var(--primary-dark); }
    :global([data-theme="dark"]) .field-value.accent { color: var(--primary); }

    .pph-meta { display: flex; gap: var(--space-8); margin-bottom: var(--space-4); flex-wrap: wrap; }
    .pph-meta-item { display: flex; flex-direction: column; gap: 2px; }
    .pph-meta-value { font-size: var(--text-sm); font-weight: 700; color: var(--text); }

    .table-wrapper { overflow-x: auto; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: var(--space-4); }
    .objek-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
    .objek-table th { background: var(--surface-alt); border-bottom: 1px solid var(--border); text-transform: uppercase; font-size: var(--text-xs); color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; padding: var(--space-3) var(--space-4); }
    .objek-table td { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border); }
    .objek-table .alt-row { background: oklch(0% 0 0 / 0.02); }
    .text-right { text-align: right; }
    .text-muted { color: var(--text-muted); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .bold { font-weight: 700; }
    .primary-val { color: var(--primary-dark); font-weight: 800; }
    :global([data-theme="dark"]) .primary-val { color: var(--primary); }
    .total-row { background: var(--primary-muted); }
    .total-label { font-weight: 800; color: var(--primary-dark); }
    :global([data-theme="dark"]) .total-label { color: var(--primary); }
    .empty-cell { text-align: center; color: var(--text-muted); padding: var(--space-8) !important; }

    .rank-badge { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; background: var(--surface-alt); border: 1px solid var(--border); border-radius: 4px; font-size: 10px; font-weight: 700; color: var(--text-muted); }

    .dokumen-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-4); margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border); }
    .dokumen-item { display: flex; flex-direction: column; gap: 2px; }
    .dokumen-value { font-size: var(--text-sm); font-weight: 700; color: var(--text); margin: 0; }

    .pagination { display: flex; align-items: center; gap: var(--space-3); justify-content: center; padding: var(--space-3) 0; }
    .pagination-info { font-size: var(--text-xs); color: var(--text-muted); }

    .summary-section { margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border); }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-3); }
    .summary-card { background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: var(--space-3) var(--space-4); display: flex; flex-direction: column; gap: 4px; }
    .summary-label { font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-value { font-size: var(--text-sm); font-weight: 800; color: var(--text); }
    .summary-value.accent { color: var(--primary-dark); }
    :global([data-theme="dark"]) .summary-value.accent { color: var(--primary); }

    .badge-success { background: oklch(65% 0.18 150 / 0.1); color: oklch(45% 0.18 150); border: 1px solid oklch(65% 0.18 150 / 0.2); }
    :global([data-theme="dark"]) .badge-success { color: oklch(75% 0.15 150); }
    .badge-danger { background: oklch(65% 0.2 25 / 0.1); color: oklch(45% 0.2 25); border: 1px solid oklch(65% 0.2 25 / 0.2); }
    :global([data-theme="dark"]) .badge-danger { color: oklch(75% 0.15 25); }
    .badge-amber { background: oklch(75% 0.18 75 / 0.1); color: oklch(55% 0.18 75); border: 1px solid oklch(75% 0.18 75 / 0.2); }
    :global([data-theme="dark"]) .badge-amber { color: oklch(85% 0.15 75); }

    .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 1024px) { .identity-grid { grid-template-columns: 1fr; } }
</style>
