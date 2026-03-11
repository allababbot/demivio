<script lang="ts">
  import TopBar from "$lib/components/TopBar.svelte";
  import { browser } from "$app/environment";

  // ── Types ────────────────────────────────────────────────────────────────
  interface CoretaxRow {
    npwp: string;
    nama: string;
    noFaktur: string;
    tanggal: string;
    dpp: number;
    dppNilaiLain: number;
    ppn: number;
    referensi: string;
  }
  interface AppRow {
    noFakturApp: string;
    referensi: string;
    dpp: number;
    ppn: number;
  }
  interface RekonRow {
    referensi: string;
    dppCoretax: number | null;
    ppnCoretax: number | null;
    dppApp: number | null;
    ppnApp: number | null;
    selisihDpp: number;
    selisihPpn: number;
  }

  // ── State ────────────────────────────────────────────────────────────────
  let coretaxFile: File | null = null;
  let appFile: File | null = null;
  let coretaxRows: CoretaxRow[] = [];
  let appRows: AppRow[] = [];
  let rekonRows: RekonRow[] = [];
  let coretaxError = "";
  let appError = "";
  let coretaxDragOver = false;
  let appDragOver = false;

  // Progress
  let coretaxProcessing = false;
  let appProcessing = false;

  // Copy
  let copiedRef: string | null = null;

  // Detail Dialog
  let selectedRow: RekonRow | null = null;

  function openDetails(row: RekonRow) {
    selectedRow = row;
  }
  function closeDetails() {
    selectedRow = null;
  }

  // Get all original rows that match the referensi
  $: detailCoretaxRows = selectedRow
    ? coretaxRows.filter((r) => r.referensi === selectedRow!.referensi)
    : [];
  $: detailAppRows = selectedRow
    ? appRows.filter((r) => r.referensi === selectedRow!.referensi)
    : [];

  // ── Filter & Sort ─────────────────────────────────────────────────────────
  type SortCol =
    | "referensi"
    | "dppCoretax"
    | "ppnCoretax"
    | "dppApp"
    | "ppnApp"
    | "selisihDpp"
    | "selisihPpn";
  type FilterType = "all" | "diff" | "onlyCt" | "onlyApp";

  let filterText = "";
  let filterType: FilterType = "all";
  let sortCol: SortCol = "referensi";
  let sortDir: "asc" | "desc" = "asc";

  function toggleSort(col: SortCol) {
    if (sortCol === col) sortDir = sortDir === "asc" ? "desc" : "asc";
    else {
      sortCol = col;
      sortDir = "asc";
    }
  }

  function sortVal(row: RekonRow, col: SortCol): number | string {
    if (col === "referensi") return row.referensi;
    return row[col] ?? -Infinity;
  }

  $: filteredRows = (() => {
    let rows = rekonRows;

    // text filter on referensi
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      rows = rows.filter((r) => r.referensi.toLowerCase().includes(q));
    }

    // quick-filter chip
    if (filterType === "diff")
      rows = rows.filter((r) => r.selisihDpp !== 0 || r.selisihPpn !== 0);
    else if (filterType === "onlyCt")
      rows = rows.filter((r) => r.dppCoretax !== null && r.dppApp === null);
    else if (filterType === "onlyApp")
      rows = rows.filter((r) => r.dppApp !== null && r.dppCoretax === null);

    // sort
    rows = [...rows].sort((a, b) => {
      const av = sortVal(a, sortCol);
      const bv = sortVal(b, sortCol);
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      const an = av as number,
        bn = bv as number;
      return sortDir === "asc" ? an - bn : bn - an;
    });

    return rows;
  })();

  // ── CSV helpers ──────────────────────────────────────────────────────────
  function detectDelimiter(line: string): string {
    return (line.match(/;/g) || []).length >= (line.match(/,/g) || []).length
      ? ";"
      : ",";
  }

  function parseNum(s: string): number {
    if (!s) return 0;
    const cleaned = s.trim().replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  function splitLine(line: string, delim: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === delim && !inQuote) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  }

  function matchHeader(headers: string[], candidates: string[]): number {
    const norm = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    for (const c of candidates) {
      const idx = norm.indexOf(c.toLowerCase().replace(/[^a-z0-9]/g, ""));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // ── Parsers ──────────────────────────────────────────────────────────────
  function parseCoretax(text: string): { rows: CoretaxRow[]; error: string } {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2)
      return { rows: [], error: "File kosong atau tidak valid." };
    const delim = detectDelimiter(lines[0]);
    const headers = splitLine(lines[0], delim);
    const iNpwp = matchHeader(headers, ["npwppembeli", "npwp"]);
    const iNama = matchHeader(headers, ["namapembeli", "nama"]);
    const iNoFak = matchHeader(headers, ["nofaktur", "faktur", "nomorfaktur"]);
    const iTgl = matchHeader(headers, ["tanggal", "date"]);
    const iDpp = matchHeader(headers, ["dpp"]);
    const iDppNL = matchHeader(headers, ["dppnilailain", "nilailain"]);
    const iPpn = matchHeader(headers, ["ppn"]);
    const iRef = matchHeader(headers, [
      "referensi",
      "referens",
      "reference",
      "ref",
    ]);
    if (iRef === -1)
      return { rows: [], error: 'Kolom "Referensi" tidak ditemukan.' };
    if (iDpp === -1) return { rows: [], error: 'Kolom "DPP" tidak ditemukan.' };
    if (iPpn === -1) return { rows: [], error: 'Kolom "PPN" tidak ditemukan.' };
    const rows: CoretaxRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i], delim);
      const ref = cols[iRef] ?? "";
      if (!ref) continue;
      rows.push({
        npwp: iNpwp !== -1 ? (cols[iNpwp] ?? "") : "",
        nama: iNama !== -1 ? (cols[iNama] ?? "") : "",
        noFaktur: iNoFak !== -1 ? (cols[iNoFak] ?? "") : "",
        tanggal: iTgl !== -1 ? (cols[iTgl] ?? "") : "",
        dpp: parseNum(cols[iDpp] ?? ""),
        dppNilaiLain: iDppNL !== -1 ? parseNum(cols[iDppNL] ?? "") : 0,
        ppn: parseNum(cols[iPpn] ?? ""),
        referensi: ref,
      });
    }
    return { rows, error: "" };
  }

  function parseApp(text: string): { rows: AppRow[]; error: string } {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2)
      return { rows: [], error: "File kosong atau tidak valid." };
    const delim = detectDelimiter(lines[0]);
    const headers = splitLine(lines[0], delim);
    const iNoFak = matchHeader(headers, [
      "nofakturapp",
      "nofaktur",
      "faktur",
      "nomorfaktur",
    ]);
    const iRef = matchHeader(headers, [
      "referensi",
      "referens",
      "reference",
      "ref",
    ]);
    const iDpp = matchHeader(headers, ["dpp"]);
    const iPpn = matchHeader(headers, ["ppn"]);
    if (iRef === -1)
      return { rows: [], error: 'Kolom "Referensi" tidak ditemukan.' };
    if (iDpp === -1) return { rows: [], error: 'Kolom "DPP" tidak ditemukan.' };
    if (iPpn === -1) return { rows: [], error: 'Kolom "PPN" tidak ditemukan.' };
    const rows: AppRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i], delim);
      const ref = cols[iRef] ?? "";
      if (!ref) continue;
      rows.push({
        noFakturApp: iNoFak !== -1 ? (cols[iNoFak] ?? "") : "",
        referensi: ref,
        dpp: parseNum(cols[iDpp] ?? ""),
        ppn: parseNum(cols[iPpn] ?? ""),
      });
    }
    return { rows, error: "" };
  }

  // ── Reconciliation ────────────────────────────────────────────────────────
  function reconcile(ct: CoretaxRow[], app: AppRow[]): RekonRow[] {
    const ctMap = new Map<string, { dpp: number; ppn: number }>();
    for (const r of ct) {
      const e = ctMap.get(r.referensi);
      if (e) {
        e.dpp += r.dpp;
        e.ppn += r.ppn;
      } else ctMap.set(r.referensi, { dpp: r.dpp, ppn: r.ppn });
    }
    const appMap = new Map<string, { dpp: number; ppn: number }>();
    for (const r of app) {
      const e = appMap.get(r.referensi);
      if (e) {
        e.dpp += r.dpp;
        e.ppn += r.ppn;
      } else appMap.set(r.referensi, { dpp: r.dpp, ppn: r.ppn });
    }
    const allKeys = new Set([...ctMap.keys(), ...appMap.keys()]);
    const rows: RekonRow[] = [];
    for (const key of allKeys) {
      const ctVal = ctMap.get(key) ?? null;
      const appVal = appMap.get(key) ?? null;
      rows.push({
        referensi: key,
        dppCoretax: ctVal?.dpp ?? null,
        ppnCoretax: ctVal?.ppn ?? null,
        dppApp: appVal?.dpp ?? null,
        ppnApp: appVal?.ppn ?? null,
        selisihDpp: (ctVal?.dpp ?? 0) - (appVal?.dpp ?? 0),
        selisihPpn: (ctVal?.ppn ?? 0) - (appVal?.ppn ?? 0),
      });
    }
    rows.sort((a, b) => a.referensi.localeCompare(b.referensi));
    return rows;
  }

  // ── File handlers ─────────────────────────────────────────────────────────
  async function loadCoretax(file: File) {
    coretaxFile = file;
    coretaxError = "";
    coretaxProcessing = true;
    await new Promise((r) => setTimeout(r, 16)); // yield for UI update
    const text = await file.text();
    const result = parseCoretax(text);
    coretaxProcessing = false;
    if (result.error) {
      coretaxError = result.error;
      coretaxRows = [];
    } else coretaxRows = result.rows;
    rekonRows = reconcile(coretaxRows, appRows);
  }

  async function loadApp(file: File) {
    appFile = file;
    appError = "";
    appProcessing = true;
    await new Promise((r) => setTimeout(r, 16));
    const text = await file.text();
    const result = parseApp(text);
    appProcessing = false;
    if (result.error) {
      appError = result.error;
      appRows = [];
    } else appRows = result.rows;
    rekonRows = reconcile(coretaxRows, appRows);
  }

  function onCoretaxInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) loadCoretax(f);
  }
  function onAppInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) loadApp(f);
  }
  function onCoretaxDrop(e: DragEvent) {
    e.preventDefault();
    coretaxDragOver = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) loadCoretax(f);
  }
  function onAppDrop(e: DragEvent) {
    e.preventDefault();
    appDragOver = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) loadApp(f);
  }

  // ── Copy ──────────────────────────────────────────────────────────────────
  function copyRef(ref: string) {
    if (browser && navigator.clipboard) {
      navigator.clipboard.writeText(ref).then(() => {
        copiedRef = ref;
        setTimeout(() => {
          if (copiedRef === ref) copiedRef = null;
        }, 2000);
      });
    }
  }

  // ── Templates ─────────────────────────────────────────────────────────────
  function downloadTemplate(type: "coretax" | "app") {
    const headers =
      type === "coretax"
        ? "npwp pembeli;nama pembeli;no faktur;tanggal;dpp;dpp nilai lain;ppn;referensi"
        : "no faktur aplikasi;referensi;dpp;ppn";
    const blob = new Blob([headers + "\n"], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template_${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Formatting ────────────────────────────────────────────────────────────
  function fmt(n: number | null): string {
    if (n === null) return "—";
    return n.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  function fmtSelisih(n: number): string {
    return n.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  // ── Summary stats ─────────────────────────────────────────────────────────
  $: totalSelisihDpp = rekonRows.reduce((s, r) => s + r.selisihDpp, 0);
  $: totalSelisihPpn = rekonRows.reduce((s, r) => s + r.selisihPpn, 0);
  $: rowsWithDiff = rekonRows.filter(
    (r) => r.selisihDpp !== 0 || r.selisihPpn !== 0,
  );
  $: rowsMatch = rekonRows.filter(
    (r) => r.selisihDpp === 0 && r.selisihPpn === 0,
  );

  // ── Export ────────────────────────────────────────────────────────────────
  function exportCsv() {
    const lines = [
      "Referensi;DPP Coretax;PPN Coretax;DPP Aplikasi;PPN Aplikasi;Selisih DPP;Selisih PPN",
      ...rekonRows.map((r) =>
        [
          r.referensi,
          r.dppCoretax ?? "",
          r.ppnCoretax ?? "",
          r.dppApp ?? "",
          r.ppnApp ?? "",
          r.selisihDpp,
          r.selisihPpn,
        ].join(";"),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rekonsiliasi.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="container">
  <div class="rekon-body">
    <!-- Upload row (compact) -->
    <div class="upload-row">
      <!-- Coretax -->
      <div class="upload-card">
        <div class="upload-card-header">
          <span class="source-label coretax-label">Coretax</span>
          <span class="column-hint"
            >npwp · nama · no faktur · tanggal · dpp · dpp nilai lain · ppn ·
            referensi</span
          >
          <button
            class="btn-icon"
            title="Unduh template Coretax"
            on:click={() => downloadTemplate("coretax")}
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="drop-zone"
          class:drag-over={coretaxDragOver}
          class:has-file={coretaxFile !== null && !coretaxProcessing}
          class:is-loading={coretaxProcessing}
          on:dragover|preventDefault={() => (coretaxDragOver = true)}
          on:dragleave={() => (coretaxDragOver = false)}
          on:drop={onCoretaxDrop}
        >
          {#if coretaxProcessing}
            <div class="processing-bar">
              <div class="processing-fill"></div>
            </div>
            <span class="drop-text">Memproses…</span>
          {:else if coretaxFile}
            <svg
              class="file-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              /><polyline points="14 2 14 8 20 8" />
            </svg>
            <span class="file-name">{coretaxFile.name}</span>
            <span class="file-count">{coretaxRows.length} baris</span>
          {:else}
            <svg
              class="upload-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <polyline points="16 16 12 12 8 16" /><line
                x1="12"
                y1="12"
                x2="12"
                y2="21"
              />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            <span class="drop-text">Drag & drop atau klik untuk pilih file</span
            >
          {/if}
          <label class="file-label" for="coretax-input">
            <input
              id="coretax-input"
              type="file"
              accept=".csv,.txt"
              on:change={onCoretaxInput}
              class="file-input"
            />
          </label>
        </div>

        {#if coretaxError}<div class="upload-error">{coretaxError}</div>{/if}
      </div>

      <!-- Aplikasi Penjualan -->
      <div class="upload-card">
        <div class="upload-card-header">
          <span class="source-label app-label">Aplikasi Penjualan</span>
          <span class="column-hint">no faktur · referensi · dpp · ppn</span>
          <button
            class="btn-icon"
            title="Unduh template Aplikasi Penjualan"
            on:click={() => downloadTemplate("app")}
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="drop-zone"
          class:drag-over={appDragOver}
          class:has-file={appFile !== null && !appProcessing}
          class:is-loading={appProcessing}
          on:dragover|preventDefault={() => (appDragOver = true)}
          on:dragleave={() => (appDragOver = false)}
          on:drop={onAppDrop}
        >
          {#if appProcessing}
            <div class="processing-bar">
              <div class="processing-fill"></div>
            </div>
            <span class="drop-text">Memproses…</span>
          {:else if appFile}
            <svg
              class="file-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              /><polyline points="14 2 14 8 20 8" />
            </svg>
            <span class="file-name">{appFile.name}</span>
            <span class="file-count">{appRows.length} baris</span>
          {:else}
            <svg
              class="upload-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <polyline points="16 16 12 12 8 16" /><line
                x1="12"
                y1="12"
                x2="12"
                y2="21"
              />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            <span class="drop-text">Drag & drop atau klik untuk pilih file</span
            >
          {/if}
          <label class="file-label" for="app-input">
            <input
              id="app-input"
              type="file"
              accept=".csv,.txt"
              on:change={onAppInput}
              class="file-input"
            />
          </label>
        </div>

        {#if appError}<div class="upload-error">{appError}</div>{/if}
      </div>
    </div>

    <!-- Results -->
    {#if rekonRows.length > 0}
      <!-- Summary bar -->
      <div class="summary-bar">
        <div class="stat-pill">
          <span class="stat-label">Total referensi</span>
          <span class="stat-value">{rekonRows.length}</span>
        </div>
        <div class="stat-pill ok">
          <span class="stat-label">Cocok</span>
          <span class="stat-value">{rowsMatch.length}</span>
        </div>
        <div class="stat-pill diff" class:has-diff={rowsWithDiff.length > 0}>
          <span class="stat-label">Selisih</span>
          <span class="stat-value">{rowsWithDiff.length}</span>
        </div>
        <div class="stat-pill total-diff">
          <span class="stat-label">Total selisih DPP</span>
          <span class="stat-value" class:negative={totalSelisihDpp < 0}
            >{fmtSelisih(totalSelisihDpp)}</span
          >
        </div>
        <div class="stat-pill total-diff">
          <span class="stat-label">Total selisih PPN</span>
          <span class="stat-value" class:negative={totalSelisihPpn < 0}
            >{fmtSelisih(totalSelisihPpn)}</span
          >
        </div>
        <button class="btn btn-outline btn-sm export-btn" on:click={exportCsv}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
              points="7 10 12 15 17 10"
            /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      <!-- Table with Filter Bar inside -->
      <div class="table-wrapper card card-full">
        <!-- Filter bar -->
        <div class="filter-bar">
          <div class="search-wrap">
            <svg
              class="search-icon"
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
              <circle cx="11" cy="11" r="8" /><line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
              />
            </svg>
            <input
              class="search-input"
              type="text"
              placeholder="Cari referensi…"
              bind:value={filterText}
            />
            {#if filterText}
              <button
                class="search-clear"
                on:click={() => (filterText = "")}
                title="Hapus"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  ><line x1="18" y1="6" x2="6" y2="18" /><line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                  /></svg
                >
              </button>
            {/if}
          </div>
          <div class="filter-chips">
            <button
              class="chip"
              class:chip-active={filterType === "all"}
              on:click={() => (filterType = "all")}>Semua</button
            >
            <button
              class="chip"
              class:chip-active={filterType === "diff"}
              on:click={() => (filterType = "diff")}>Ada Selisih</button
            >
            <button
              class="chip"
              class:chip-active={filterType === "onlyCt"}
              on:click={() => (filterType = "onlyCt")}>Hanya Coretax</button
            >
            <button
              class="chip"
              class:chip-active={filterType === "onlyApp"}
              on:click={() => (filterType = "onlyApp")}>Hanya Aplikasi</button
            >
          </div>
          <span class="filter-count">
            {filteredRows.length} / {rekonRows.length}
          </span>
        </div>

        <div class="table-scroll">
          <table class="rekon-table">
            <thead>
              <tr>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <th
                  class="ref-th sortable"
                  on:click={() => toggleSort("referensi")}
                >
                  <span>Referensi</span>
                  <span class="sort-icon" class:active={sortCol === "referensi"}
                    >{sortCol === "referensi"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}</span
                  >
                </th>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <th
                  class="num-col coretax-col sortable"
                  on:click={() => toggleSort("dppCoretax")}
                >
                  <span>DPP Coretax</span>
                  <span
                    class="sort-icon"
                    class:active={sortCol === "dppCoretax"}
                    >{sortCol === "dppCoretax"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}</span
                  >
                </th>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <th
                  class="num-col coretax-col sortable"
                  on:click={() => toggleSort("ppnCoretax")}
                >
                  <span>PPN Coretax</span>
                  <span
                    class="sort-icon"
                    class:active={sortCol === "ppnCoretax"}
                    >{sortCol === "ppnCoretax"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}</span
                  >
                </th>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <th
                  class="num-col app-col sortable"
                  on:click={() => toggleSort("dppApp")}
                >
                  <span>DPP Aplikasi</span>
                  <span class="sort-icon" class:active={sortCol === "dppApp"}
                    >{sortCol === "dppApp"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}</span
                  >
                </th>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <th
                  class="num-col app-col sortable"
                  on:click={() => toggleSort("ppnApp")}
                >
                  <span>PPN Aplikasi</span>
                  <span class="sort-icon" class:active={sortCol === "ppnApp"}
                    >{sortCol === "ppnApp"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}</span
                  >
                </th>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <th
                  class="num-col selisih-col sortable"
                  on:click={() => toggleSort("selisihDpp")}
                >
                  <span>Selisih DPP</span>
                  <span
                    class="sort-icon"
                    class:active={sortCol === "selisihDpp"}
                    >{sortCol === "selisihDpp"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}</span
                  >
                </th>
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <th
                  class="num-col selisih-col sortable"
                  on:click={() => toggleSort("selisihPpn")}
                >
                  <span>Selisih PPN</span>
                  <span
                    class="sort-icon"
                    class:active={sortCol === "selisihPpn"}
                    >{sortCol === "selisihPpn"
                      ? sortDir === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}</span
                  >
                </th>
              </tr>
            </thead>
            <tbody>
              {#if filteredRows.length === 0}
                <tr
                  ><td colspan="7" class="empty-row"
                    >Tidak ada data yang cocok dengan filter.</td
                  ></tr
                >
              {/if}
              {#each filteredRows as row}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <tr
                  class:row-diff={row.selisihDpp !== 0 || row.selisihPpn !== 0}
                  on:click={() => openDetails(row)}
                  style="cursor: pointer;"
                >
                  <td class="ref-cell">
                    <div class="cell-content">
                      <span class="ref-text">{row.referensi}</span>
                      <button
                        class="btn-copy"
                        class:copied={copiedRef === row.referensi}
                        on:click|stopPropagation={() => copyRef(row.referensi)}
                        title="Salin referensi"
                      >
                        {#if copiedRef === row.referensi}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        {:else}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                            />
                            <path
                              d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                            />
                          </svg>
                        {/if}
                      </button>
                    </div>
                  </td>
                  <td class="num-col">{fmt(row.dppCoretax)}</td>
                  <td class="num-col">{fmt(row.ppnCoretax)}</td>
                  <td class="num-col">{fmt(row.dppApp)}</td>
                  <td class="num-col">{fmt(row.ppnApp)}</td>
                  <td
                    class="num-col selisih-cell"
                    class:selisih-nonzero={row.selisihDpp !== 0}
                    >{fmtSelisih(row.selisihDpp)}</td
                  >
                  <td
                    class="num-col selisih-cell"
                    class:selisih-nonzero={row.selisihPpn !== 0}
                    >{fmtSelisih(row.selisihPpn)}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else if coretaxFile || appFile}
      <div class="waiting-hint">
        {#if !coretaxFile}
          Upload file Coretax untuk memulai rekonsiliasi.
        {:else if !appFile}
          Upload file Aplikasi Penjualan untuk memulai rekonsiliasi.
        {:else}
          Tidak ada data yang dapat direkonsiliasi.
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Details Dialog -->
{#if selectedRow}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" on:click={closeDetails}>
    <div class="dialog-content card" on:click|stopPropagation>
      <div class="dialog-header">
        <h2 class="dialog-title">
          Detail Referensi: <span class="text-primary"
            >{selectedRow.referensi}</span
          >
        </h2>
        <button
          class="dialog-close"
          on:click={closeDetails}
          title="Tutup (Esc)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><line x1="18" y1="6" x2="6" y2="18"></line><line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            ></line></svg
          >
        </button>
      </div>
      <div class="dialog-body">
        <!-- Coretax Section -->
        <div class="dialog-section">
          <div class="dialog-section-header">
            <span class="source-label coretax-label">Coretax</span>
            <span class="dialog-section-summary"
              >Total DPP: {fmt(selectedRow.dppCoretax)} &nbsp;&bull;&nbsp; Total
              PPN: {fmt(selectedRow.ppnCoretax)}</span
            >
          </div>
          {#if detailCoretaxRows.length > 0}
            <div class="detail-table-wrap">
              <table class="detail-table">
                <thead
                  ><tr
                    ><th>No Faktur</th><th>Tanggal</th><th>NPWP</th><th
                      >Nama Pembeli</th
                    ><th class="num-col">DPP</th><th class="num-col">DPP NL</th
                    ><th class="num-col">PPN</th></tr
                  ></thead
                >
                <tbody>
                  {#each detailCoretaxRows as r, i}
                    <tr>
                      <td>
                        <div class="cell-content">
                          <span class="ref-text">{r.noFaktur || "—"}</span>
                          {#if r.noFaktur}
                            <button
                              class="btn-copy"
                              class:copied={copiedRef === `ct-faktur-${i}`}
                              on:click|stopPropagation={() =>
                                copyRef(r.noFaktur)}
                              title="Salin No Faktur"
                            >
                              {#if copiedRef === r.noFaktur}
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2.5"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              {:else}
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                >
                                  <rect
                                    x="9"
                                    y="9"
                                    width="13"
                                    height="13"
                                    rx="2"
                                    ry="2"
                                  />
                                  <path
                                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                                  />
                                </svg>
                              {/if}
                            </button>
                          {/if}
                        </div>
                      </td>
                      <td>{r.tanggal || "—"}</td>
                      <td>{r.npwp || "—"}</td>
                      <td>{r.nama || "—"}</td>
                      <td class="num-col">{fmt(r.dpp)}</td>
                      <td class="num-col">{fmt(r.dppNilaiLain)}</td>
                      <td class="num-col">{fmt(r.ppn)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="detail-empty">
              Tidak ada data di Coretax untuk referensi ini.
            </div>
          {/if}
        </div>

        <!-- App Section -->
        <div class="dialog-section" style="margin-top: 1.5rem;">
          <div class="dialog-section-header">
            <span class="source-label app-label">Aplikasi Penjualan</span>
            <span class="dialog-section-summary"
              >Total DPP: {fmt(selectedRow.dppApp)} &nbsp;&bull;&nbsp; Total PPN:
              {fmt(selectedRow.ppnApp)}</span
            >
          </div>
          {#if detailAppRows.length > 0}
            <div class="detail-table-wrap">
              <table class="detail-table">
                <thead
                  ><tr
                    ><th>No Faktur Aplikasi</th><th class="num-col">DPP</th><th
                      class="num-col">PPN</th
                    ></tr
                  ></thead
                >
                <tbody>
                  {#each detailAppRows as r, i}
                    <tr>
                      <td>
                        <div class="cell-content">
                          <span class="ref-text">{r.noFakturApp || "—"}</span>
                          {#if r.noFakturApp}
                            <button
                              class="btn-copy"
                              class:copied={copiedRef === `app-faktur-${i}`}
                              on:click|stopPropagation={() =>
                                copyRef(r.noFakturApp)}
                              title="Salin No Faktur Aplikasi"
                            >
                              {#if copiedRef === r.noFakturApp}
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2.5"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              {:else}
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                >
                                  <rect
                                    x="9"
                                    y="9"
                                    width="13"
                                    height="13"
                                    rx="2"
                                    ry="2"
                                  />
                                  <path
                                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                                  />
                                </svg>
                              {/if}
                            </button>
                          {/if}
                        </div>
                      </td>
                      <td class="num-col">{fmt(r.dpp)}</td>
                      <td class="num-col">{fmt(r.ppn)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="detail-empty">
              Tidak ada data di Aplikasi Penjualan untuk referensi ini.
            </div>
          {/if}
        </div>

        <!-- Discrepancy Alert if exists -->
        {#if selectedRow.selisihDpp !== 0 || selectedRow.selisihPpn !== 0}
          <div class="dialog-alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="flex-shrink:0"
              ><polygon
                points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"
              ></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line
                x1="12"
                y1="16"
                x2="12.01"
                y2="16"
              ></line></svg
            >
            <div>
              <strong>Terdapat Selisih!</strong>
              <div style="margin-top:0.25rem;">
                {#if selectedRow.selisihDpp !== 0}Selisih DPP: <span
                    class="selisih-nonzero"
                    >{fmtSelisih(selectedRow.selisihDpp)}</span
                  >{/if}
                {#if selectedRow.selisihDpp !== 0 && selectedRow.selisihPpn !== 0}
                  &nbsp;&bull;&nbsp;
                {/if}
                {#if selectedRow.selisihPpn !== 0}Selisih PPN: <span
                    class="selisih-nonzero"
                    >{fmtSelisih(selectedRow.selisihPpn)}</span
                  >{/if}
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<svelte:window
  on:keydown={(e) => {
    if (e.key === "Escape" && selectedRow) closeDetails();
  }}
/>

<style>
  /* ── Layout ──────────────────────────────────────────────────────────── */
  .rekon-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Upload row (compact) ──────────────────────────────────────────── */
  .upload-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .upload-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .upload-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .source-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .coretax-label {
    background: rgba(217, 119, 6, 0.12);
    color: var(--primary-dark);
  }
  .app-label {
    background: rgba(5, 150, 105, 0.1);
    color: var(--success);
  }

  .column-hint {
    font-size: 0.7rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  /* Template download icon button */
  .btn-icon {
    width: 26px;
    height: 26px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-card);
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition:
      color 0.2s,
      border-color 0.2s,
      background 0.2s;
  }
  .btn-icon:hover {
    color: var(--primary);
    border-color: var(--primary);
    background: rgba(217, 119, 6, 0.05);
  }

  /* ── Drop zone (compact) ─────────────────────────────────────────── */
  .drop-zone {
    position: relative;
    border: 2px dashed var(--border);
    border-radius: 10px;
    padding: 0.7rem 1rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s;
    background: var(--bg-card);
    min-height: 56px;
  }
  .drop-zone:hover,
  .drop-zone.drag-over {
    border-color: var(--primary);
    background: rgba(217, 119, 6, 0.04);
  }
  .drop-zone.has-file {
    border-style: solid;
    border-color: var(--border);
  }
  .drop-zone.is-loading {
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.6rem 1rem;
    cursor: default;
  }

  .file-label {
    position: absolute;
    inset: 0;
    cursor: pointer;
  }
  .file-input {
    display: none;
  }

  .upload-icon {
    width: 20px;
    height: 20px;
    color: var(--text-muted);
    opacity: 0.4;
    flex-shrink: 0;
  }
  .file-icon {
    width: 18px;
    height: 18px;
    color: var(--primary);
    flex-shrink: 0;
  }

  .drop-text {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
  .file-name {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  .file-count {
    font-size: 0.75rem;
    color: var(--success);
    font-weight: 500;
    margin-left: auto;
    white-space: nowrap;
  }

  /* Processing bar */
  .processing-bar {
    width: 100%;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }
  .processing-fill {
    height: 100%;
    width: 40%;
    background: linear-gradient(90deg, var(--primary), var(--primary-light));
    border-radius: 2px;
    animation: slide 1s ease-in-out infinite alternate;
  }
  @keyframes slide {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(300%);
    }
  }

  .upload-error {
    font-size: 0.75rem;
    color: var(--danger);
    background: rgba(220, 38, 38, 0.08);
    border-radius: 6px;
    padding: 0.3rem 0.65rem;
  }

  /* ── Summary bar ─────────────────────────────────────────────────────── */
  .summary-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .stat-pill {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.25rem 0.7rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 72px;
  }
  .stat-label {
    font-size: 0.65rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .stat-value {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text);
  }
  .stat-pill.ok .stat-value {
    color: var(--success);
  }
  .stat-pill.diff.has-diff .stat-value {
    color: var(--danger);
  }
  .stat-value.negative {
    color: var(--danger);
  }

  .export-btn {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    white-space: nowrap;
  }

  /* ── Table ───────────────────────────────────────────────────────────── */
  .table-wrapper {
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Separate scrollable container — keeps thead sticky inside it */
  .table-scroll {
    overflow: auto;
    flex: 1;
    min-height: 0;
  }

  .rekon-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
    table-layout: auto;
  }

  .rekon-table thead th {
    background: var(--bg-card); /* solid, not transparent */
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    padding: 0.55rem 0.75rem;
    position: sticky;
    top: 0;
    z-index: 2;
    white-space: nowrap;
    text-align: right;
    border-bottom: 2px solid var(--border);
    /* Prevent bleed-through on scroll */
    box-shadow: 0 1px 0 var(--border);
  }
  .ref-th {
    text-align: left !important;
  }

  .coretax-col {
    border-bottom-color: rgba(217, 119, 6, 0.4) !important;
  }
  .app-col {
    border-bottom-color: rgba(5, 150, 105, 0.35) !important;
  }
  .selisih-col {
    border-bottom-color: rgba(220, 38, 38, 0.3) !important;
  }

  .rekon-table td {
    padding: 0.45rem 0.75rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
    text-align: right;
  }

  /* Referensi cell */
  .ref-cell {
    text-align: left !important;
  }
  .cell-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
  }
  .ref-text {
    font-weight: 500;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  /* Copy button */
  .btn-copy {
    background: transparent;
    border: none;
    border-radius: 4px;
    padding: 2px 4px;
    cursor: pointer;
    color: var(--text-muted);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 22px;
    min-width: 22px;
    flex-shrink: 0;
    opacity: 0;
  }
  tr:hover .btn-copy {
    opacity: 1;
  }
  .btn-copy:hover {
    color: var(--primary);
    background: rgba(251, 191, 36, 0.1);
  }
  .btn-copy.copied {
    opacity: 1;
    color: var(--success);
    background: transparent;
  }

  .num-col {
    font-variant-numeric: tabular-nums;
  }
  .selisih-cell {
    color: var(--text-muted);
  }
  .selisih-nonzero {
    color: var(--danger);
    font-weight: 600;
  }
  .row-diff {
    background: rgba(220, 38, 38, 0.025);
  }
  tr:hover {
    background: rgba(251, 191, 36, 0.05);
  }

  /* ── Waiting hint ──────────────────────────────────────────────────────── */
  .waiting-hint {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  /* ── Filter bar ──────────────────────────────────────────────────────── */
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
    flex-wrap: wrap;
    padding: 1rem 1rem 0.6rem 1rem;
    position: relative;
    z-index: 3;
  }

  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .search-icon {
    position: absolute;
    left: 0.55rem;
    color: var(--text-muted);
    pointer-events: none;
  }
  .search-input {
    width: 200px;
    padding: 0.35rem 2rem 0.35rem 1.9rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-card);
    color: var(--text);
    font-size: 0.8rem;
    transition: border-color 0.2s;
  }
  .search-input:focus {
    outline: none;
    border-color: var(--primary);
  }
  .search-clear {
    position: absolute;
    right: 0.4rem;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 2px;
    border-radius: 3px;
  }
  .search-clear:hover {
    color: var(--danger);
  }

  .filter-chips {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }
  .chip {
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .chip:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
  .chip.chip-active {
    background: rgba(217, 119, 6, 0.12);
    border-color: var(--primary);
    color: var(--primary-dark);
    font-weight: 600;
  }

  .filter-count {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* ── Sortable headers ────────────────────────────────────────────────── */
  .sortable {
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  .sortable:hover {
    color: var(--primary);
  }
  .rekon-table thead th.sortable {
    display: table-cell; /* keep display consistent */
  }
  /* Inner layout of a sortable th */
  .sortable span:first-child {
    margin-right: 0.25rem;
  }
  .sort-icon {
    font-size: 0.65rem;
    opacity: 0.3;
    vertical-align: middle;
  }
  .sort-icon.active {
    opacity: 1;
    color: var(--primary);
  }

  .empty-row {
    text-align: center !important;
    color: var(--text-muted);
    font-size: 0.85rem;
    padding: 2rem 0 !important;
  }

  /* ── Dialog ───────────────────────────────────────────────────────────── */
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
    animation: fadeIn 0.15s ease-out;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .dialog-content {
    background: var(--bg-card);
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    animation: slideUp 0.15s ease-out;
  }
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .dialog-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
  }
  .dialog-title .text-primary {
    color: var(--primary);
  }
  .dialog-close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background-color 0.2s,
      color 0.2s;
  }
  .dialog-close:hover {
    background: var(--border);
    color: var(--text);
  }
  .dialog-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }
  .dialog-section-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  .dialog-section-summary {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-weight: 500;
  }
  .detail-table-wrap {
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow-x: auto;
  }
  .detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
  }
  .detail-table th {
    background: rgba(0, 0, 0, 0.02);
    padding: 0.6rem 0.8rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  :global([data-theme="dark"]) .detail-table th {
    background: rgba(255, 255, 255, 0.02);
  }
  .detail-table td {
    padding: 0.6rem 0.8rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .detail-table tr:last-child td {
    border-bottom: none;
  }
  .detail-empty {
    padding: 1rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
    background: rgba(0, 0, 0, 0.015);
    border: 1px dashed var(--border);
    border-radius: 8px;
  }
  :global([data-theme="dark"]) .detail-empty {
    background: rgba(255, 255, 255, 0.015);
  }

  .dialog-alert {
    margin-top: 1.5rem;
    padding: 1rem 1.25rem;
    background: rgba(220, 38, 38, 0.08);
    border: 1px solid rgba(220, 38, 38, 0.2);
    border-radius: 8px;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    color: var(--danger);
    font-size: 0.85rem;
  }

  /* ── Responsive ─────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .upload-row {
      grid-template-columns: 1fr;
    }
    .search-input {
      width: 140px;
    }
    .dialog-content {
      max-height: 95vh;
    }
  }
</style>
