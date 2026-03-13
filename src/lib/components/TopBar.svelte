<script lang="ts">
  import ThemeToggle from "./ThemeToggle.svelte";
  import { page } from '$app/stores';
  
  export let onHelpClick: () => void = () => {};

</script>

<div class="top-bar-wrapper">
  <div class="top-bar">
    <div class="brand">
      <h1 class="brand-name">Demivio</h1>
      <p class="brand-tagline">Simulator PPN & Rekonsiliasi Pajak</p>
    </div>


    <div class="utility-icons">
      <button
        class="icon-btn help-btn"
        on:click={onHelpClick}
        title="Cara menggunakan Demivio"
        aria-label="Cara menggunakan"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </button>

      <a
        href="https://github.com/allababbot/demivio"
        target="_blank"
        rel="noopener noreferrer"
        class="icon-btn github-btn"
        title="Lihat source code di GitHub"
        aria-label="GitHub Repository"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
          ></path>
        </svg>
      </a>

      <div class="theme-toggle-wrapper">
        <ThemeToggle />
      </div>
    </div>
  </div>
</div>

<style>
  .top-bar-wrapper {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
    background: var(--surface-alt);
    border-bottom: 1px solid var(--border);
  }

  .top-bar {
    width: 100%;
    max-width: 1400px;
    padding: var(--space-3) var(--space-6);
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: auto;
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .brand-name {
    font-size: var(--text-lg);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--primary-dark);
    margin: 0;
    line-height: 1;
  }

  .brand-tagline {
    font-size: var(--text-xs);
    color: var(--text-muted);
    margin: 0;
    font-weight: 500;
  }


  .utility-icons {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .icon-btn {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
    text-decoration: none;
  }

  .icon-btn:hover {
    color: var(--primary);
    border-color: var(--primary);
    background: var(--primary-muted);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .icon-btn svg {
    width: 20px;
    height: 20px;
  }

  .theme-toggle-wrapper :global(.theme-toggle) {
    box-shadow: var(--shadow-sm);
  }

  .theme-toggle-wrapper :global(.theme-toggle:hover) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  @media (max-width: 640px) {
    .brand-tagline {
      display: none;
    }
  }
</style>
