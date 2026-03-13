<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  let isDark = false;

  onMount(() => {
    const stored = localStorage.getItem("demivio-theme");
    if (stored === "dark") {
      isDark = true;
      document.documentElement.setAttribute("data-theme", "dark");
    }
    // Default is light — no attribute needed
  });

  function toggle() {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("demivio-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("demivio-theme", "light");
    }
  }
</script>

<button
  class="theme-toggle"
  on:click={toggle}
  title={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
  aria-label="Toggle tema"
>
  {#if isDark}
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
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  {:else}
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
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
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
  }

  .theme-toggle:hover {
    color: var(--primary);
    border-color: var(--primary);
    background: var(--primary-muted);
  }
</style>
