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
  <a
    href="/bppu"
    class="nav-link"
    class:active={$page.url.pathname.startsWith("/bppu")}
  >
    BPPU Extractor
  </a>
</nav>

<style>
  .navbar {
    display: flex;
    gap: var(--space-4);
    margin-bottom: 0;
    border-bottom: 1px solid var(--border);
    padding-bottom: var(--space-2);
  }

  .nav-link {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-muted);
    text-decoration: none;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    transition: var(--transition);
  }

  .nav-link:hover {
    color: var(--text);
    background: var(--surface-alt);
  }

  .nav-link.active {
    color: var(--primary-dark);
    background: var(--primary-muted);
    font-weight: 700;
  }
</style>
