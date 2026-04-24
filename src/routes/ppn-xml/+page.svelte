<script lang="ts">
  import TopBar from "$lib/components/TopBar.svelte";
  import Navbar from "$lib/components/Navbar.svelte";
  import { supabase } from "$lib/supabase";
  import { onMount } from "svelte";

  // --- Types ---
  interface BuyerMapping {
    id?: string;
    buyertin_lama: string;
    buyer_name: string;
    buyertin_baru: string;
    buyeridtku_baru: string;
  }

  interface XMLChange {
    invoiceDate: string;
    oldTin: string;
    newTin: string;
    oldIdtku: string;
    newIdtku: string;
    buyerName: string;
  }

  // --- State ---
  let activeTab: "modifier" | "master" = "modifier";
  let masterData: BuyerMapping[] = [];
  let loadingMaster = false;
  let processingXML = false;
  let xmlFile: File | null = null;
  let modifiedDoc: Document | null = null;
  let changes: XMLChange[] = [];
  let errorMessage = "";
  let successMessage = "";

  onMount(() => {
    fetchMasterData();
  });

  async function fetchMasterData() {
    loadingMaster = true;
    const { data, error } = await supabase
      .from("buyer_mappings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching master data:", error);
      errorMessage = "Gagal mengambil data master dari Supabase.";
    } else {
      masterData = data || [];
    }
    loadingMaster = false;
  }

  // --- CSV Import ---
  async function handleCSVUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return;

    // Detect delimiter (semicolon or comma)
    const header = lines[0];
    const delim = header.includes(";") ? ";" : ",";
    
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(delim).map(c => c.trim());
      return {
        buyertin_lama: cols[0],
        buyer_name: cols[1],
        buyertin_baru: cols[2],
        buyeridtku_baru: cols[3],
      };
    }).filter(row => row.buyertin_lama && row.buyertin_baru);

    errorMessage = "";
    successMessage = "Sedang mengimpor data...";

    const { error } = await supabase.from("buyer_mappings").upsert(rows, {
      onConflict: "buyertin_lama",
    });

    if (error) {
      errorMessage = "Gagal mengimpor CSV: " + error.message;
      successMessage = "";
    } else {
      successMessage = `Berhasil mengimpor ${rows.length} data mapping.`;
      fetchMasterData();
    }
  }

  // --- XML Processing ---
  async function handleXMLUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    xmlFile = file;
    processXML();
  }

  function processXML() {
    if (!xmlFile || masterData.length === 0) return;
    processingXML = true;
    changes = [];
    errorMessage = "";

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "application/xml");

        // Error checking for XML
        const parseError = doc.getElementsByTagName("parsererror");
        if (parseError.length > 0) {
          throw new Error("Format XML tidak valid.");
        }

        const invoices = doc.getElementsByTagName("TaxInvoice");
        const mappingMap = new Map(masterData.map(m => [m.buyertin_lama, m]));

        for (let i = 0; i < invoices.length; i++) {
          const inv = invoices[i];
          const tinNode = inv.getElementsByTagName("BuyerTin")[0];
          const idtkuNode = inv.getElementsByTagName("BuyerIDTKU")[0];
          const dateNode = inv.getElementsByTagName("TaxInvoiceDate")[0];
          const nameNode = inv.getElementsByTagName("BuyerName")[0];

          if (tinNode) {
            const oldTin = tinNode.textContent?.trim() || "";
            const mapping = mappingMap.get(oldTin);

            if (mapping) {
              const oldIdtku = idtkuNode?.textContent?.trim() || "";
              
              // Apply changes to the XML DOM
              tinNode.textContent = mapping.buyertin_baru;
              if (idtkuNode) {
                idtkuNode.textContent = mapping.buyeridtku_baru;
              }

              // Record change for UI
              changes.push({
                invoiceDate: dateNode?.textContent || "-",
                buyerName: nameNode?.textContent || mapping.buyer_name,
                oldTin: oldTin,
                newTin: mapping.buyertin_baru,
                oldIdtku: oldIdtku,
                newIdtku: mapping.buyeridtku_baru
              });
            }
          }
        }

        modifiedDoc = doc;
        if (changes.length === 0) {
          errorMessage = "Tidak ada data yang cocok dengan master data.";
        } else {
          successMessage = `Berhasil memproses XML. ${changes.length} invoice diperbarui.`;
        }
      } catch (err: any) {
        errorMessage = err.message || "Gagal memproses XML.";
      } finally {
        processingXML = false;
      }
    };
    reader.readAsText(xmlFile);
  }

  function downloadXML() {
    if (!modifiedDoc) return;
    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(modifiedDoc);
    const blob = new Blob([xmlString], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = xmlFile ? `FIXED_${xmlFile.name}` : "modified_tax_invoice.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function deleteMapping(id: string) {
    const { error } = await supabase.from("buyer_mappings").delete().eq("id", id);
    if (!error) fetchMasterData();
  }
</script>

<div class="container animate-in">
  <Navbar />

  <header class="page-header">
    <h1 class="brand-name">XML Modifier</h1>
    <p class="brand-tagline">Perbaiki data XML PPN sebelum di-upload ke Coretax</p>
  </header>

  <div class="tabs">
    <button class="tab" class:active={activeTab === "modifier"} on:click={() => activeTab = "modifier"}>
      Modifier
    </button>
    <button class="tab" class:active={activeTab === "master"} on:click={() => activeTab = "master"}>
      Master Data ({masterData.length})
    </button>
  </div>

  <main class="main-content">
    {#if activeTab === "modifier"}
      <div class="modifier-view">
        <div class="upload-section">
          <div class="card">
            <header class="card-header">
              <div class="card-header-main">
                <span class="card-title">Upload XML PPN Keluaran</span>
              </div>
            </header>
            <div class="card-body" style="padding: var(--space-6);">
              {#if masterData.length === 0}
                <div class="error">
                  Master Data kosong. Harap isi data master terlebih dahulu di tab Master Data.
                </div>
              {/if}
              
              <label class="drop-zone" class:is-loading={processingXML} for="xml-upload">
                {#if processingXML}
                  <div class="processing-bar"><div class="processing-fill"></div></div>
                  <span>Memproses XML...</span>
                {:else if xmlFile}
                  <div class="file-info">
                    <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span class="file-name">{xmlFile.name}</span>
                  </div>
                  <button class="btn btn-outline btn-sm" on:click={() => xmlFile = null}>Ganti File</button>
                {:else}
                  <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>Klik atau drag file XML di sini</span>
                  <input type="file" id="xml-upload" accept=".xml" on:change={handleXMLUpload} class="file-input" />
                {/if}
              </label>

              {#if errorMessage}<div class="error" style="margin-top: var(--space-4);">{errorMessage}</div>{/if}
              {#if successMessage}<div class="badge" style="background: var(--success); color: white; display: block; margin-top: var(--space-4); padding: var(--space-3);">{successMessage}</div>{/if}

              {#if changes.length > 0}
                <div style="margin-top: var(--space-6);">
                  <button class="btn btn-primary w-full" on:click={downloadXML}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download XML yang Sudah Diperbaiki
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </div>

        {#if changes.length > 0}
          <div class="results-section card card-full" style="margin-top: var(--space-6);">
            <header class="card-header">
              <div class="card-header-main">
                <span class="card-title">Data yang Diperbarui ({changes.length})</span>
              </div>
            </header>
            <div class="table-wrapper" style="max-height: 500px; overflow-y: auto;">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Nama Pembeli</th>
                    <th>NPWP Lama</th>
                    <th>NPWP Baru</th>
                    <th>IDTKU Baru</th>
                  </tr>
                </thead>
                <tbody>
                  {#each changes as change}
                    <tr>
                      <td>{change.invoiceDate}</td>
                      <td>{change.buyerName}</td>
                      <td class="text-muted">{change.oldTin}</td>
                      <td style="font-weight: 700; color: var(--success);">{change.newTin}</td>
                      <td style="font-size: var(--text-xs);">{change.newIdtku}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}
      </div>
    {:else if activeTab === "master"}
      <div class="master-view">
        <div class="card" style="margin-bottom: var(--space-6);">
          <header class="card-header">
            <div class="card-header-main">
              <span class="card-title">Import Master Data</span>
            </div>
          </header>
          <div class="card-body" style="padding: var(--space-4);">
            <p class="subtitle" style="margin-bottom: var(--space-4);">Upload file <code>data.csv</code> untuk memperbarui database master secara masal.</p>
            <div class="form-group">
              <input type="file" accept=".csv" on:change={handleCSVUpload} class="btn btn-outline" />
            </div>
            {#if errorMessage}<div class="error">{errorMessage}</div>{/if}
            {#if successMessage}<div class="badge" style="background: var(--success); color: white; display: inline-block;">{successMessage}</div>{/if}
          </div>
        </div>

        <div class="card card-full">
          <header class="card-header">
            <div class="card-header-main">
              <span class="card-title">Daftar Mapping ({masterData.length})</span>
            </div>
            <div class="card-header-actions">
               <button class="btn btn-icon-only" on:click={fetchMasterData} title="Refresh">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
               </button>
            </div>
          </header>
          <div class="table-wrapper" style="max-height: 600px; overflow-y: auto;">
            {#if loadingMaster}
              <div style="padding: var(--space-12); text-align: center; color: var(--text-muted);">Memuat data...</div>
            {:else if masterData.length === 0}
              <div style="padding: var(--space-12); text-align: center; color: var(--text-muted);">Belum ada data master. Silakan import CSV.</div>
            {:else}
              <table>
                <thead>
                  <tr>
                    <th>NPWP Lama</th>
                    <th>Nama Pembeli</th>
                    <th>NPWP Baru</th>
                    <th>IDTKU Baru</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {#each masterData as mapping}
                    <tr>
                      <td>{mapping.buyertin_lama}</td>
                      <td>{mapping.buyer_name}</td>
                      <td>{mapping.buyertin_baru}</td>
                      <td style="font-family: monospace; font-size: var(--text-xs);">{mapping.buyeridtku_baru}</td>
                      <td>
                        <button class="btn btn-outline btn-sm" style="color: var(--error); border-color: transparent;" on:click={() => deleteMapping(mapping.id!)}>
                          Hapus
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .drop-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    border: 2px dashed var(--border-strong);
    border-radius: var(--radius-card);
    background: var(--surface-alt);
    cursor: pointer;
    transition: var(--transition);
    gap: var(--space-4);
    color: var(--text-muted);
    position: relative;
    overflow: hidden;
  }

  .drop-zone:hover {
    border-color: var(--primary);
    background: var(--surface);
    color: var(--primary);
  }

  .file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .file-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    color: var(--text);
  }

  .file-name {
    font-weight: 700;
    font-size: var(--text-base);
  }

  .w-full {
    width: 100%;
  }

  .processing-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 4px;
    width: 100%;
    background: var(--border);
  }

  .processing-fill {
    height: 100%;
    width: 50%;
    background: var(--primary);
    animation: loading-stripes 1.5s linear infinite;
  }

  @keyframes loading-stripes {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }

  .modifier-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  
  .card-full {
    border-radius: var(--radius-card);
    overflow: hidden;
    padding: 0;
  }

  .card-body {
    background: var(--surface);
  }
</style>
