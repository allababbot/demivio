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
  {isDark ? "☀️" : "🌙"}
</button>

<style>
  .theme-toggle {
    position: fixed;
    bottom: 1.25rem;
    right: 1.25rem;
    z-index: 100;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid var(--border);
    background: var(--bg-card);
    color: var(--text);
    font-size: 1.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .theme-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
</style>
