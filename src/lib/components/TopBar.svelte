<script lang="ts">
  import ThemeToggle from "./ThemeToggle.svelte";
  import { page } from '$app/stores';
  
  export let onHelpClick: () => void = () => {};

  const navLinks = [
    { href: '/kalkulator', label: 'Kalkulator PPN' },
    { href: '/rekonsiliasi', label: 'Rekonsiliasi' },
    { href: '/bppu', label: 'BPPU Extractor' }
  ];
</script>

<div class="top-bar-wrapper">
  <div class="top-bar">
    <!-- Logo Left -->
    <div class="top-bar-logo">
      <a href="/" class="logo-text">Demivio</a>
    </div>

    <!-- Navigation Center -->
    <nav class="nav-links">
      {#each navLinks as link}
        <a
          href={link.href}
          class="nav-link"
          class:active={$page.url.pathname.startsWith(link.href)}
        >
          {link.label}
        </a>
      {/each}
    </nav>
    <div class="top-bar-actions">
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
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    pointer-events: none; /* Let clicks pass through empty space */
    display: flex;
    justify-content: center;
  }

  .top-bar {
    width: 100%;
    max-width: none;
    padding: 0.5rem 2rem;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.75rem;
    pointer-events: auto; /* Re-enable clicks on the bar itself */
    transition: background 0.3s, border-color 0.3s;
  }

  .top-bar-logo {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .logo-text {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--primary-dark);
    text-decoration: none;
    letter-spacing: -0.02em;
  }

  :global([data-theme="dark"]) .logo-text {
    color: var(--primary-light);
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .nav-link {
    padding: 0.4rem 0.875rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.2s, background 0.2s;
    white-space: nowrap;
  }

  .nav-link:hover {
    color: var(--text);
    background: var(--bg-card);
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }

  .nav-link.active {
    color: var(--primary-dark);
    background: var(--bg-card);
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  :global([data-theme="dark"]) .nav-link.active {
    color: var(--primary-light);
  }

  .top-bar-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .icon-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: var(--bg-card);
    color: var(--text);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition:
      transform 0.2s,
      box-shadow 0.2s,
      color 0.2s;
    text-decoration: none;
  }

  .icon-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    color: var(--primary);
  }

  .icon-btn svg {
    width: 20px;
    height: 20px;
  }

  /* Override internal absolute positioning for ThemeToggle within wrapper */
  :global(.top-bar .theme-toggle) {
    position: static;
    bottom: auto;
    right: auto;
  }

  /* We also need to apply the hover state for children of top-bar */
  :global(.top-bar .theme-toggle:hover) {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
</style>
