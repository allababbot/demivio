<script lang="ts">
  import ThemeToggle from "./ThemeToggle.svelte";

  export let onHelpClick: () => void = () => {};
</script>

<div class="top-bar-wrapper">
  <div class="top-bar">
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

<style>
  .top-bar-wrapper {
    position: fixed;
    top: 1.25rem;
    left: 0;
    right: 0;
    z-index: 100;
    pointer-events: none; /* Let clicks pass through empty space */
    display: flex;
    justify-content: center;
  }

  .top-bar {
    width: 100%;
    max-width: 1400px;
    padding: 0 1rem;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.75rem;
    pointer-events: auto; /* Re-enable clicks on the bar itself */
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
