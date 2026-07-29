<script lang="ts">
  import { page } from '$app/stores';
  import ThemeToggle from "./ThemeToggle.svelte";

  export let onHelpClick: () => void = () => {};

  const navLinks = [
    { href: "/kalkulator", label: "Kalkulator PPN" },
    { href: "/rekonsiliasi", label: "Rekonsiliasi" },
    { href: "/bppu", label: "BPPU" },
    { href: "/faktur", label: "Faktur" },
  ];

  function isActive(href: string) {
    const path = $page.url.pathname;
    if (path === "/") return false;
    if (href === "/kalkulator") {
      return path === "/kalkulator";
    }
    return path.startsWith(href);
  }
</script>

<div class="top-bar-wrapper">
  <div class="top-bar">
    <div class="brand">
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
    padding: 0 var(--space-6);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    height: 56px;
    pointer-events: auto;
  }

  .brand {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .brand-link {
    text-decoration: none;
    color: var(--primary-dark);
  }

  .brand-link:visited {
    color: var(--primary-dark);
  }

  :global([data-theme="dark"]) .brand-link,
  :global([data-theme="dark"]) .brand-link:visited {
    color: var(--primary-light);
  }

  .brand-name {
    font-size: var(--text-lg);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--primary-dark);
    margin: 0;
    line-height: 1;
  }

  :global([data-theme="dark"]) .brand-name {
    color: var(--primary-light);
  }

  /* Navbar */
  .navbar {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex: 1;
    justify-content: flex-end;
  }

  .nav-link {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    transition: var(--transition);
    white-space: nowrap;
  }

  .nav-link:hover {
    color: var(--text);
    background: var(--bg);
  }

  .nav-link.active {
    color: var(--primary-dark);
    background: var(--primary-muted);
    font-weight: 700;
  }

  :global([data-theme="dark"]) .nav-link.active {
    color: var(--primary-light);
  }

  .utility-icons {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
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
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .icon-btn svg {
    width: 18px;
    height: 18px;
  }

  .theme-toggle-wrapper :global(.theme-toggle) {
    box-shadow: var(--shadow-sm);
  }

  .theme-toggle-wrapper :global(.theme-toggle:hover) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  @media (max-width: 768px) {
    .top-bar {
      padding: 0 var(--space-4);
      gap: var(--space-3);
    }

    .navbar {
      gap: 0;
    }

    .nav-link {
      padding: var(--space-2) var(--space-2);
      font-size: var(--text-xs);
    }
  }
</style>
