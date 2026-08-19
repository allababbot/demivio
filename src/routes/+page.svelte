<script lang="ts">
  import { page } from "$app/stores";
</script>

<svelte:head>
  <title>Demivio — Tax Utility Suite</title>
</svelte:head>

<div class="home animate-in">
  <!-- Hero -->
  <section class="hero">
    <h1 class="hero-title">
      <span class="hero-emblem">Demivio</span>
    </h1>
    <p class="hero-tagline">
      Utilitas pajak yang cepat, akurat, dan sepenuhnya di sisi klien.
    </p>
    <p class="hero-note">
      Semua data diproses di browser Anda. Tidak ada yang dikirim ke server.
    </p>
  </section>

  <!-- Tool Cards Grid -->
  <section class="tool-grid">
    <a href="/kalkulator" class="tool-card">
      <div class="tool-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
          <line x1="8" y1="6" x2="16" y2="6"></line>
          <line x1="8" y1="10" x2="8" y2="10"></line>
          <line x1="12" y1="10" x2="12" y2="10"></line>
          <line x1="16" y1="10" x2="16" y2="10"></line>
          <line x1="8" y1="14" x2="8" y2="14"></line>
          <line x1="12" y1="14" x2="12" y2="14"></line>
          <line x1="16" y1="14" x2="16" y2="14"></line>
          <line x1="8" y1="18" x2="8" y2="18"></line>
          <line x1="12" y1="18" x2="12" y2="18"></line>
        </svg>
      </div>
      <div class="tool-info">
        <h2 class="tool-name">Kalkulator PPN</h2>
        <p class="tool-desc">Cari kombinasi harga satuan, kuantitas, dan diskon yang menghasilkan target PPN tertentu.</p>
      </div>
      <span class="tool-arrow">&rarr;</span>
    </a>

    <a href="/rekonsiliasi" class="tool-card">
      <div class="tool-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 3h5v5"></path>
          <path d="M8 3H3v5"></path>
          <path d="M3 16v5h5"></path>
          <path d="M21 16v5h-5"></path>
          <path d="M3 12h18"></path>
          <line x1="12" y1="3" x2="12" y2="21"></line>
        </svg>
      </div>
      <div class="tool-info">
        <h2 class="tool-name">Rekonsiliasi</h2>
        <p class="tool-desc">Cocokkan data transaksi penjualan antara Coretax dan Aplikasi internal.</p>
      </div>
      <span class="tool-arrow">&rarr;</span>
    </a>

    <a href="/mutasi-bank" class="tool-card">
      <div class="tool-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2"></rect>
          <path d="M7 8h10"></path>
          <path d="M7 12h10"></path>
          <path d="M7 16h4"></path>
        </svg>
      </div>
      <div class="tool-info">
        <h2 class="tool-name">Mutasi Bank</h2>
        <p class="tool-desc">Ubah raw data mutasi BCA, BNI, dan BRI menjadi Excel standar yang siap direkonsiliasi.</p>
      </div>
      <span class="tool-arrow">&rarr;</span>
    </a>

    <a href="/bppu" class="tool-card">
      <div class="tool-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </div>
      <div class="tool-info">
        <h2 class="tool-name">BPPU Extractor</h2>
        <p class="tool-desc">Ekstrak data Bukti Potong/Pungut Unifikasi dari PDF Coretax.</p>
      </div>
      <span class="tool-arrow">&rarr;</span>
    </a>

    <a href="/faktur" class="tool-card">
      <div class="tool-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </div>
      <div class="tool-info">
        <h2 class="tool-name">Faktur Extractor</h2>
        <p class="tool-desc">Ekstrak data terstruktur dari file PDF e-Faktur DJP.</p>
      </div>
      <span class="tool-arrow">&rarr;</span>
    </a>
  </section>
</div>

<style>
  .home {
    max-width: 900px;
    margin: 0 auto;
    padding: var(--space-12) var(--space-6) var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }

  /* Hero */
  .hero {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }

  .hero-title {
    font-size: var(--text-2xl);
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0;
  }

  .hero-emblem {
    color: var(--primary-dark);
  }

  :global([data-theme="dark"]) .hero-emblem {
    color: var(--primary-light);
  }

  .hero-tagline {
    font-size: var(--text-base);
    color: var(--text-muted);
    margin: 0;
    max-width: 480px;
    line-height: 1.5;
  }

  .hero-note {
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin: 0;
    opacity: 0.7;
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* Tool Cards Grid */
  .tool-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .tool-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-6);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    text-decoration: none;
    color: inherit;
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
    position: relative;
  }

  .tool-card:hover {
    border-color: var(--primary);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .tool-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: var(--radius-sm);
    background: var(--primary-muted);
    color: var(--primary-dark);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global([data-theme="dark"]) .tool-icon {
    color: var(--primary-light);
  }

  .tool-info {
    flex: 1;
    min-width: 0;
  }

  .tool-name {
    font-family: var(--font-body);
    font-size: var(--text-base);
    font-weight: 700;
    margin: 0 0 var(--space-1);
    color: var(--text);
  }

  .tool-desc {
    font-size: var(--text-sm);
    color: var(--text-muted);
    margin: 0;
    line-height: 1.5;
  }

  .tool-arrow {
    flex-shrink: 0;
    color: var(--text-muted);
    font-size: 1.25rem;
    transition: var(--transition);
    margin-top: var(--space-1);
  }

  .tool-card:hover .tool-arrow {
    color: var(--primary);
    transform: translateX(4px);
  }

  @media (max-width: 640px) {
    .home {
      padding: var(--space-8) var(--space-4);
      gap: var(--space-8);
    }

    .tool-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
