<script lang="ts">
  import { page } from "$app/stores";
</script>

<nav class="navbar">
  <a
    href="/kalkulator"
    class="nav-link"
    class:active={$page.url.pathname === "/kalkulator" ||
      $page.url.pathname === "/"}
  >
    Kalkulator PPN
  </a>
  <a
    href="/rekonsiliasi"
    class="nav-link"
    class:active={$page.url.pathname === "/rekonsiliasi"}
  >
    Rekonsiliasi
  </a>
</nav>

<style>
  .navbar {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 1.25rem;
  }

  .nav-link {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    padding-bottom: 4px;
    border-bottom: 2px solid transparent;
    transition:
      color 0.2s,
      border-color 0.2s;
  }

  .nav-link:hover {
    color: var(--text);
  }

  .nav-link.active {
    color: var(--primary-dark);
    font-weight: 600;
    border-bottom-color: var(--primary-dark);
  }

  :global([data-theme="dark"]) .nav-link.active {
    color: var(--primary-light);
    border-bottom-color: var(--primary-light);
  }
</style>
