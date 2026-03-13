<script lang="ts">
  import "../app.css";
  import TopBar from "$lib/components/TopBar.svelte";

  let showHelp = false;
  let activeHelpTab: "kalkulator" | "rekonsiliasi" = "kalkulator";

  function handleHelpClick() {
    showHelp = true;
  }
</script>

<TopBar onHelpClick={handleHelpClick} />

<!-- Modal for Help -->
{#if showHelp}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    on:click={() => (showHelp = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Cara Menggunakan Demivio</h2>
        <button class="close-btn" on:click={() => (showHelp = false)}>×</button>
      </div>
      <div class="modal-content">
        <div class="help-tabs">
          <button
            class="help-tab"
            class:active={activeHelpTab === "kalkulator"}
            on:click={() => (activeHelpTab = "kalkulator")}
          >
            Kalkulator PPN
          </button>
          <button
            class="help-tab"
            class:active={activeHelpTab === "rekonsiliasi"}
            on:click={() => (activeHelpTab = "rekonsiliasi")}
          >
            Rekonsiliasi
          </button>
        </div>

        {#if activeHelpTab === "kalkulator"}
          <div class="help-tab-content">
            <p>
              <strong>Demivio (Kalkulator)</strong> adalah simulasi PPN (Pajak Pertambahan
              Nilai) yang membantu Anda menemukan kombinasi Harga Satuan, Kuantitas,
              dan Potongan/Diskon yang pas untuk mencapai target PPN yang Anda inginkan.
            </p>

            <h3>Langkah-langkah:</h3>
            <ol>
              <li>
                <strong>Isi Transaksi Acuan:</strong> Masukkan perkiraan harga satuan,
                kuantitas, dan potongan atau diskon. Anda dapat mengunci nilai tertentu
                agar hasil simulasi hanya berdasarkan nilai tersebut.
              </li>
              <li>
                <strong>Target PPN:</strong> Masukkan nilai PPN yang Anda inginkan.
              </li>
              <li>
                <strong>Parameter Simulasi:</strong> Sesuaikan rentang toleransi
                dan batas pencarian (min/max) untuk Harga, Jumlah, dan Diskon jika
                diperlukan.
              </li>
              <li>
                <strong>Jalankan:</strong> Klik tombol "Jalankan". Sistem akan mencari
                kombinasi terbaik yang mendekati atau sama dengan target PPN Anda.
              </li>
              <li>
                <strong>Hasil:</strong> Lihat tabel hasil. Kombinasi dengan kualitas
                terbaik adalah yang paling akurat.
              </li>
            </ol>

            <p
              style="margin-top: 1rem; font-size: 0.9em; color: var(--text-muted);"
            >
              <em
                >Tip: Semakin kecil rentang parameter pencarian, proses simulasi
                akan semakin cepat.</em
              >
            </p>
          </div>
        {:else}
          <div class="help-tab-content">
            <p>
              <strong>Rekonsiliasi</strong> membantu Anda membandingkan dan
              mencocokkan data penjualan antara sumber <strong>Coretax</strong>
              dan <strong>Aplikasi Penjualan</strong> internal Anda secara otomatis.
            </p>

            <h3>Langkah-langkah:</h3>
            <ol>
              <li>
                <strong>Persiapkan Data:</strong> Unduh format template CSV dengan
                mengklik tombol ikon unduh (↓) di sudut kanan masing-masing kotak
                upload.
              </li>
              <li>
                <strong>Upload Coretax:</strong> Masukkan file CSV dari sumber
                Coretax. Sistem akan mengekstrak informasi Nilai DPP, PPN, dan
                yang terpenting: <strong>Referensi</strong>.
              </li>
              <li>
                <strong>Upload Aplikasi Penjualan:</strong> Masukkan file CSV
                dari sumber aplikasi internal. Sistem akan mengekstrak Nilai
                DPP, PPN, dan <strong>Referensi</strong>.
              </li>
              <li>
                <strong>Rekonsiliasi Otomatis:</strong> Setelah kedua file diunggah,
                tabel hasil akan langsung menampilkan perbandingan kedua sumber berdasarkan
                Referensi yang sama.
              </li>
              <li>
                <strong>Analisis & Filter:</strong> Gunakan kolom filter di bagian
                atas tabel untuk mencari nilai yang "Ada Selisih", "Hanya Coretax",
                atau yang cocok.
              </li>
              <li>
                <strong>Lihat Detail:</strong> Klik pada baris mana saja di tabel
                untuk memunculkan rincian sumber aslinya beserta nomor faktur dari
                Coretax dan Aplikasi.
              </li>
            </ol>

            <p
              style="margin-top: 1rem; font-size: 0.9em; color: var(--text-muted);"
            >
              <em
                >Tip: Anda bisa men-sortir kolom apa saja (seperti Selisih DPP)
                untuk mencari ketidaksesuaian tertinggi dengan cepat.</em
              >
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<slot />

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: oklch(0% 0 0 / 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(8px);
    padding: var(--space-4);
  }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 700px;
    max-height: 85vh;
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    background: var(--surface-alt);
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    margin: 0;
    font-size: var(--text-base);
    font-weight: 800;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 4px;
  }

  .close-btn:hover {
    color: var(--danger);
    background: var(--bg-hover);
  }

  .modal-content {
    padding: 0 1.5rem 1.5rem 1.5rem;
    color: var(--text);
    line-height: 1.6;
    display: flex;
    flex-direction: column;
  }

  .help-tabs {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
    padding-top: 0.5rem;
  }

  .help-tab {
    background: transparent;
    border: none;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-muted);
    padding: 0.75rem 0.25rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition:
      color 0.2s,
      border-color 0.2s;
    margin-bottom: -1px;
  }

  .help-tab:hover {
    color: var(--text);
  }

  .help-tab.active {
    color: var(--primary-dark);
    font-weight: 600;
    border-bottom-color: var(--primary-dark);
  }

  :global([data-theme="dark"]) .help-tab.active {
    color: var(--primary-light);
    border-bottom-color: var(--primary-light);
  }

  .help-tab-content {
    animation: fadeIn 0.2s ease-out;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .help-tab-content p {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .help-tab-content h3 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: var(--primary);
    font-size: 1.1rem;
  }

  .help-tab-content ol {
    padding-left: 1.5rem;
    margin: 0;
  }

  .help-tab-content li {
    margin-bottom: 0.5rem;
  }
</style>
