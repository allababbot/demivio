<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { formatRupiah } from "$lib";
  import type { CachedSimulation } from "$lib/db";
  import { getAllCachedSimulations, deleteCachedSimulation } from "$lib/db";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher<{
    load: CachedSimulation;
  }>();

  let entries: CachedSimulation[] = [];
  let open = false;

  async function refresh() {
    if (!browser) return;
    entries = await getAllCachedSimulations();
  }

  onMount(refresh);

  async function handleDelete(id: string) {
    await deleteCachedSimulation(id);
    await refresh();
  }

  function handleLoad(entry: CachedSimulation) {
    dispatch("load", entry);
    open = false;
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="history-wrapper">
  <button
    class="btn btn-sm btn-outline"
    on:click={() => {
      open = !open;
      if (open) refresh();
    }}
    title="Riwayat pencarian"
  >
    Riwayat ({entries.length})
  </button>

  {#if open && entries.length > 0}
    <div class="history-dropdown">
      {#each entries as entry (entry.id)}
        <div class="history-item">
          <button
            class="history-load"
            on:click={() => handleLoad(entry)}
            title="Muat hasil ini"
          >
            <div class="history-meta">
              <span class="history-target">
                PPN {formatRupiah(entry.config.targetPpn)}
              </span>
              <span class="history-ref">
                Ref: {formatRupiah(entry.config.referenceTransaction.unitPrice)}
                × {entry.config.referenceTransaction.quantity}
              </span>
            </div>
            <div class="history-info">
              <span>{entry.results.length} hasil</span>
              <span class="history-date">{formatDate(entry.timestamp)}</span>
            </div>
          </button>
          <button
            class="history-delete"
            on:click|stopPropagation={() => handleDelete(entry.id)}
            title="Hapus"
          >
            ✕
          </button>
        </div>
      {/each}
    </div>
  {:else if open}
    <div class="history-dropdown history-empty">Belum ada riwayat.</div>
  {/if}
</div>

<style>
  .history-wrapper {
    position: relative;
  }

  .history-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    min-width: 280px;
    max-height: 320px;
    overflow-y: auto;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    z-index: 50;
    padding: 0.25rem;
  }

  .history-empty {
    padding: 1rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .history-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    border-radius: 8px;
    transition: background 0.15s;
  }

  .history-item:hover {
    background: rgba(217, 119, 6, 0.08);
  }

  .history-load {
    flex: 1;
    background: none;
    border: none;
    padding: 0.5rem 0.6rem;
    text-align: left;
    cursor: pointer;
    color: var(--text);
    font-size: 0.8rem;
    line-height: 1.3;
  }

  .history-meta {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .history-target {
    font-weight: 600;
    font-size: 0.85rem;
  }

  .history-ref {
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .history-info {
    display: flex;
    gap: 0.5rem;
    margin-top: 2px;
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .history-date {
    opacity: 0.7;
  }

  .history-delete {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 0.75rem;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    transition:
      color 0.15s,
      background 0.15s;
  }

  .history-delete:hover {
    color: var(--danger);
    background: rgba(239, 68, 68, 0.1);
  }
</style>
