<script lang="ts">
  import { page } from '$app/stores';
  import ThemeToggle from "./ThemeToggle.svelte";

  export let onHelpClick: () => void = () => {};
  export let home: boolean = false;

  const navLinks = [
    { href: "/kalkulator", label: "Kalkulator PPN" },
    { href: "/rekonsiliasi", label: "Rekonsiliasi" },
    { href: "/mutasi-bank", label: "Mutasi Bank" },
    { href: "/ekstraktor", label: "Ekstraktor" },
  ];

  function isActive(href: string) {
    const path = $page.url.pathname;
    if (path === "/") return false;
    if (href === "/kalkulator") return path === "/kalkulator";
    if (href === "/mutasi-bank") return path === "/mutasi-bank";
    if (href === "/ekstraktor") return path === "/ekstraktor" || path === "/bppu" || path === "/faktur";
    return path.startsWith(href);
  }
</script>

<div class="top-bar-wrapper">
  <div class="top-bar-outer" class:home-header={home}>
    <header class="card-header top-bar">
      <div class="card-header-main">
        <a href="/" class="brand-link">
          <h1 class="brand-name">Demivio</h1>
        </a>
      </div>

      <nav class="navbar">
        {#each navLinks as link}
          <a
            href={link.href}
            class="nav-link"
            class:active={isActive(link.href)}
          >
            {link.label}
          </a>
        {/each}
      </nav>

      <div class="card-header-actions">
        <button
          class="icon-btn"
          on:click={onHelpClick}
          title="Cara menggunakan Demivio"
          aria-label="Cara menggunakan"
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
          class="icon-btn"
          title="Lihat source code di GitHub"
          aria-label="GitHub Repository"
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
    </header>
  </div>
</div>

<style>
  .top-bar-wrapper {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
  }

  .top-bar-outer {
    width: 100%;
    max-width: 1400px;
    margin: 0 var(--space-4);
    border-radius: 0 0 var(--radius-card) var(--radius-card);
    background: var(--surface-alt);
    overflow: hidden;
  }

  .top-bar-outer.home-header {
    max-width: 900px;
    background: var(--surface-alt);
  }

  .top-bar-outer.home-header .top-bar {
    height: var(--card-header-height);
    padding: 0;
    border-bottom: none;
    background: transparent;
  }

  .top-bar-outer.home-header .navbar {
    display: none;
  }

  .top-bar-outer.home-header .top-bar :global(.card-header-actions) {
    border-left: none;
  }

  .top-bar {
    height: var(--card-header-height);
    padding: 0;
    border-bottom: 1px solid var(--border);
    background: var(--surface-alt);
    display: flex;
    align-items: stretch;
  }

  .top-bar :global(.card-header-main) {
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
    }

    .brand-link {
    text-decoration: none;
    color: var(--primary-dark);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    height: 100%;
  }

  .brand-link:visited {
    color: var(--primary-dark);
  }

  :global([data-theme="dark"]) .brand-link,
  :global([data-theme="dark"]) .brand-link:visited {
    color: var(--primary-light);
  }

  .brand-link:hover {
    background: var(--surface);
  }

  .brand-name {
    font-size: var(--text-base);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--primary-dark);
    margin: 0;
    line-height: 1;
    padding: 0 var(--space-2);
  }

  :global([data-theme="dark"]) .brand-name {
    color: var(--primary-light);
  }

  /* Navbar — di antara logo dan icon, mendorong ke kanan */
  .navbar {
    display: flex;
    align-items: stretch;
    height: 100%;
    flex: 1;
    justify-content: flex-end;
    margin-right: var(--space-2);
  }

  .nav-link {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    padding: 0 var(--space-3);
    border-radius: 0;
    transition: var(--transition);
    white-space: nowrap;
    display: flex;
    align-items: center;
    height: 100%;
    border-bottom: 2px solid transparent;
  }

  .nav-link:hover {
    color: var(--text);
    background: var(--surface);
  }

  .nav-link.active {
    color: var(--primary-dark);
    background: var(--surface);
    font-weight: 700;
  }

  :global([data-theme="dark"]) .nav-link.active {
    color: var(--primary-light);
  }

  /* Utility icons as card-header-actions */
  .top-bar :global(.card-header-actions) {
    display: flex;
    align-items: stretch;
    border-left: 1px solid var(--border);
  }

  .icon-btn {
    border: none;
    border-radius: 0;
    height: 100%;
    padding: 0 var(--space-4);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition);
    text-decoration: none;
  }

  .icon-btn:hover {
    background: var(--surface);
    color: var(--primary);
    transform: none;
    box-shadow: none;
  }

  .icon-btn svg {
    width: 20px;
    height: 20px;
  }

  .theme-toggle-wrapper {
    display: flex;
    align-items: stretch;
  }

  .theme-toggle-wrapper :global(.theme-toggle) {
    border: none;
    border-radius: 0;
    height: 100%;
    padding: 0 var(--space-4);
    background: transparent;
    color: var(--text-muted);
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .theme-toggle-wrapper :global(.theme-toggle:hover) {
    background: var(--surface);
    color: var(--primary);
    transform: none;
    box-shadow: none;
  }

  @media (max-width: 768px) {
    .navbar {
      gap: 0;
    }

    .nav-link {
      padding: var(--space-2) var(--space-2);
      font-size: var(--text-xs);
    }
  }
</style>

