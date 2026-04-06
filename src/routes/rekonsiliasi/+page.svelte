<script lang="ts">
  import TopBar from "$lib/components/TopBar.svelte";
  import Navbar from "$lib/components/Navbar.svelte";
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
    // Coretax
    npwp: string;
    nama: string;
    noFaktur: string;
    tanggal: string;
    dppCoretax: number | null;
    dppNilaiLainCoretax: number | null;
    ppnCoretax: number | null;
    // App
    noFakturApp: string;
    dppApp: number | null;
    ppnApp: number | null;
    // Difference
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
    const ctMap = new Map<
      string,
      {
        dpp: number;
        ppn: number;
        dppNL: number;
        npwps: Set<string>;
        namas: Set<string>;
        noFakturs: Set<string>;
        tanggals: Set<string>;
      }
    >();
    for (const r of ct) {
      let e = ctMap.get(r.referensi);
      if (!e) {
        e = {
          dpp: 0,
          ppn: 0,
          dppNL: 0,
          npwps: new Set(),
          namas: new Set(),
          noFakturs: new Set(),
          tanggals: new Set(),
        };
        ctMap.set(r.referensi, e);
      }
      e.dpp += r.dpp;
      e.ppn += r.ppn;
      e.dppNL += r.dppNilaiLain;
      if (r.npwp) e.npwps.add(r.npwp);
      if (r.nama) e.namas.add(r.nama);
      if (r.noFaktur) e.noFakturs.add(r.noFaktur);
      if (r.tanggal) e.tanggals.add(r.tanggal);
    }

    const appMap = new Map<
      string,
      { dpp: number; ppn: number; noFakturs: Set<string> }
    >();
    for (const r of app) {
      let e = appMap.get(r.referensi);
      if (!e) {
        e = { dpp: 0, ppn: 0, noFakturs: new Set() };
        appMap.set(r.referensi, e);
      }
      e.dpp += r.dpp;
      e.ppn += r.ppn;
      if (r.noFakturApp) e.noFakturs.add(r.noFakturApp);
    }

    const allKeys = new Set([...ctMap.keys(), ...appMap.keys()]);
    const rows: RekonRow[] = [];
    for (const key of allKeys) {
      const ctVal = ctMap.get(key);
      const appVal = appMap.get(key);

      rows.push({
        referensi: key,
        npwp: Array.from(ctVal?.npwps || []).join(", "),
        nama: Array.from(ctVal?.namas || []).join(", "),
        noFaktur: Array.from(ctVal?.noFakturs || []).join(", "),
        tanggal: Array.from(ctVal?.tanggals || []).join(", "),
        dppCoretax: ctVal?.dpp ?? null,
        dppNilaiLainCoretax: ctVal?.dppNL ?? null,
        ppnCoretax: ctVal?.ppn ?? null,

        noFakturApp: Array.from(appVal?.noFakturs || []).join(", "),
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
    const headers = [
      "Referensi",
      "NPWP",
      "Nama",
      "No Faktur Coretax",
      "Tanggal Coretax",
      "DPP Coretax",
      "DPP Nilai Lain Coretax",
      "PPN Coretax",
      "No Faktur Aplikasi",
      "DPP Aplikasi",
      "PPN Aplikasi",
      "Selisih DPP",
      "Selisih PPN",
    ];

    const lines = [
      headers.join(";"),
      ...rekonRows.map((r) =>
        [
          r.referensi,
          r.npwp,
          r.nama,
          r.noFaktur,
          r.tanggal,
          r.dppCoretax ?? 0,
          r.dppNilaiLainCoretax ?? 0,
          r.ppnCoretax ?? 0,
          r.noFakturApp,
          r.dppApp ?? 0,
          r.ppnApp ?? 0,
          r.selisihDpp,
          r.selisihPpn,
        ].join(";"),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rekonsiliasi_lengkap.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="container animate-in">
  <Navbar />

  <div class="rekon-dashboard">
    <!-- Upload Section -->
    <div class="upload-grid">
      <!-- Coretax -->
      <div class="upload-card">
        <header class="card-header">
          <div class="card-header-main">
            <div class="step-badge">1</div>
            <h2 class="card-title">Coretax</h2>
          </div>
          <div class="card-header-actions">
            <button
              class="btn btn-outline btn-icon-only"
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
        </header>

        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <label
          class="drop-zone"
          class:drag-over={coretaxDragOver}
          class:has-file={coretaxFile !== null && !coretaxProcessing}
          class:is-loading={coretaxProcessing}
          on:dragover|preventDefault={() => (coretaxDragOver = true)}
          on:dragleave={() => (coretaxDragOver = false)}
          on:drop={onCoretaxDrop}
          for="coretax-input"
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
            <span class="drop-text">Drag & drop di sini</span>
            <span class="drop-divider">atau</span>
            <span class="btn btn-outline btn-sm">Pilih File</span>
          {/if}
          <input
            id="coretax-input"
            type="file"
            accept=".csv,.txt"
            on:change={onCoretaxInput}
            class="file-input"
          />
        </label>

        {#if coretaxError}<div class="upload-error">{coretaxError}</div>{/if}
      </div>

      <!-- Aplikasi Penjualan -->
      <div class="upload-card">
        <header class="card-header">
          <div class="card-header-main">
            <div class="step-badge">2</div>
            <h2 class="card-title">Aplikasi Penjualan</h2>
          </div>
          <div class="card-header-actions">
            <button
              class="btn btn-outline btn-icon-only"
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
        </header>

        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <label
          class="drop-zone"
          class:drag-over={appDragOver}
          class:has-file={appFile !== null && !appProcessing}
          class:is-loading={appProcessing}
          on:dragover|preventDefault={() => (appDragOver = true)}
          on:dragleave={() => (appDragOver = false)}
          on:drop={onAppDrop}
          for="app-input"
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
            <span class="drop-text">Drag & drop di sini</span>
            <span class="drop-divider">atau</span>
            <span class="btn btn-outline btn-sm">Pilih File</span>
          {/if}
          <input
            id="app-input"
            type="file"
            accept=".csv,.txt"
            on:change={onAppInput}
            class="file-input"
          />
        </label>

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
                  <div class="th-content">
                    <span>Referensi</span>
                    <span class="sort-icon" class:active={sortCol === "referensi"}
                      >{sortCol === "referensi"
                        ? sortDir === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}</span
                    >
                  </div>
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
  .rekon-dashboard {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .upload-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .upload-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-sm);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--surface-alt);
    border-bottom: 1px solid var(--border);
  }

  .source-label {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }

  .coretax-label {
    background: var(--primary-muted);
    color: var(--primary-dark);
  }

  .app-label {
    background: oklch(90% 0.1 160);
    color: oklch(40% 0.15 160);
  }


  .drop-zone {
    height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    border: 2px dashed var(--border);
    margin: var(--space-4);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition);
    position: relative;
    gap: var(--space-1);
  }

  .drop-zone:hover {
    border-color: var(--primary);
    background: var(--surface-alt);
  }

  .drop-zone.drag-over {
    border-color: var(--primary);
    background: var(--primary-muted);
  }

  .drop-zone.has-file {
    border-style: solid;
    border-color: var(--primary-dark);
    background: var(--primary-muted);
  }

  .drop-divider {
    font-size: 10px;
    color: var(--text-muted);
  }

  .btn-sm {
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-xs);
  }

  .upload-icon, .file-icon {
    width: 32px;
    height: 32px;
    color: var(--text-muted);
  }

  .drop-text {
    font-size: var(--text-xs);
    color: var(--text-muted);
    text-align: center;
  }

  .file-name {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text);
  }

  .file-count {
    font-size: 10px;
    color: var(--primary-dark);
    font-weight: 600;
    background: rgba(255, 255, 255, 0.5);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .upload-error {
    font-size: var(--text-xs);
    color: var(--danger);
    background: var(--danger-muted);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-4);
    margin: 0 var(--space-4) var(--space-4) var(--space-4);
  }

  .summary-bar {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    align-items: center;
    flex-wrap: wrap;
    box-shadow: var(--shadow-sm);
  }

  .stat-pill {
    display: flex;
    flex-direction: column;
    padding: var(--space-2) var(--space-4);
    border-right: 1px solid var(--border);
    gap: 4px;
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
    font-size: var(--text-xs);
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
    font-size: var(--text-xs);
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
    position: relative;
  }

  .rekon-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
    table-layout: auto;
  }

  .rekon-table th {
    background: var(--surface-alt);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: var(--space-3) var(--space-4);
    position: sticky;
    top: 0;
    z-index: 2;
    text-align: right;
    border-bottom: 2px solid var(--border-strong);
  }

  .ref-th, .ref-cell {
    text-align: left !important;
  }

  .th-content {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.25rem;
  }

  .rekon-table td {
    padding: var(--space-2) var(--space-4);
    border-bottom: 1px solid var(--border);
    text-align: right;
  }

  .num-col {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .selisih-nonzero {
    color: var(--danger);
    font-weight: 700;
  }

  tr:hover {
    background: var(--surface-alt);
  }

  tr.row-diff {
    background: var(--danger-muted);
  }

  /* ── Waiting hint ──────────────────────────────────────────────────────── */
  .waiting-hint {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: var(--text-sm);
  }

  /* ── Filter bar ──────────────────────────────────────────────────────── */
  .filter-bar {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    border-bottom: 1px solid var(--border);
    background: var(--surface-alt);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
  }

  .search-icon {
    position: absolute;
    left: var(--space-3);
    color: var(--text-muted);
  }

  .search-input {
    width: 100%;
    padding: var(--space-2) var(--space-4) var(--space-2) var(--space-12);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
    font-size: var(--text-sm);
    transition: var(--transition);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-muted);
  }

  .filter-chips {
    display: flex;
    gap: var(--space-2);
  }

  .chip {
    padding: var(--space-1) var(--space-4);
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
  }

  .chip:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .chip.chip-active {
    background: var(--primary-muted);
    border-color: var(--primary);
    color: var(--primary-dark);
  }

  .filter-count {
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-weight: 600;
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
    font-size: var(--text-xs);
    opacity: 0.3;
    vertical-align: middle;
  }
  .sort-icon.active {
    opacity: 1;
    color: var(--primary);
  }

  /* ── Copy Button ─────────────────────────────────────────────────────── */
  .cell-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .btn-copy {
    opacity: 0;
    background: transparent;
    border: 1px solid var(--border);
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    transition: var(--transition);
    color: var(--text-muted);
    flex-shrink: 0;
  }

  tr:hover .btn-copy, .btn-copy.copied {
    opacity: 1;
  }

  .btn-copy:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: var(--surface);
  }

  .btn-copy.copied {
    color: var(--success);
    border-color: var(--success);
  }

  .btn-copy svg {
    width: 14px;
    height: 14px;
  }

  .empty-row {
    text-align: center !important;
    color: var(--text-muted);
    font-size: var(--text-sm);
    padding: 2rem 0 !important;
  }

  /* ── Dialog ───────────────────────────────────────────────────────────── */
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: oklch(0% 0 0 / 0.4);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-4);
  }

  .dialog-content {
    background: var(--surface);
    width: 100%;
    max-width: 1000px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-strong);
    overflow: hidden;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    background: var(--surface-alt);
    border-bottom: 1px solid var(--border);
  }

  .dialog-title {
    margin: 0;
    font-size: var(--text-base);
    font-weight: 800;
  }

  .dialog-body {
    padding: var(--space-6);
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }
  .dialog-section-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  .dialog-section-summary {
    font-size: var(--text-sm);
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
    font-size: var(--text-sm);
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
    font-size: var(--text-sm);
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
    font-size: var(--text-sm);
  }

  .file-input {
    display: none;
  }

  /* ── Responsive ─────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .upload-grid {
      grid-template-columns: 1fr;
    }
    .search-input {
      width: 100%;
    }
    .dialog-content {
      max-height: 95vh;
    }
  }
</style>
