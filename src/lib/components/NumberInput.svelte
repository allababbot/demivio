<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let value: number | null = null;
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let placeholder: string = "";
  export let disabled: boolean = false;
  export let locked: boolean = false;
  export let showLock: boolean = false;
  export let id: string | undefined = undefined;

  const dispatch = createEventDispatcher();
  let inputElement: HTMLInputElement;
  let isFocused = false;

  // Format number (1000 -> 1.000)
  function format(val: number | null): string {
    if (val === null || val === undefined || isNaN(val)) return "";
    return new Intl.NumberFormat("id-ID").format(val);
  }

  // Parse formatted string (1.000 -> 1000)
  function parse(str: string): number | null {
    if (!str) return null;
    // Remove dots (thousands separator) and replace comma with dot (decimal) if any
    const cleanStr = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  }

  // Handle focus: show raw number
  function handleFocus() {
    isFocused = true;
    if (inputElement) {
      inputElement.type = "number"; // Switch to number input for mobile keyboards
      inputElement.value = value?.toString() ?? "";
    }
  }

  // Handle blur: show formatted string
  function handleBlur() {
    isFocused = false;
    if (inputElement) {
      inputElement.type = "text"; // Switch back to text for formatting
      inputElement.value = format(value);
    }
  }

  // Handle input changes
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const rawValue = target.value;

    // When type is text (unexpected during focus but possible), parse it
    // When type is number (expected during focus), valueAsNumber might work

    let newValue: number | null = null;

    if (target.type === "number") {
      newValue = target.valueAsNumber;
      if (isNaN(newValue)) newValue = null;
    } else {
      newValue = parse(rawValue);
    }

    value = newValue;
    dispatch("input", event);
  }

  // Initialize display value
  // We need to use action or reactive statement to set initial value because binding happens after mount
  $: if (inputElement && !isFocused) {
    inputElement.type = "text";
    inputElement.value = format(value);
  }

  function toggleLock() {
    locked = !locked;
    dispatch("lock", locked);
  }
</script>

<div class="input-wrapper">
  <input
    bind:this={inputElement}
    type="text"
    {id}
    {placeholder}
    {disabled}
    {min}
    {max}
    class:has-lock={showLock}
    on:focus={handleFocus}
    on:blur={handleBlur}
    on:input={handleInput}
  />

  {#if showLock}
    <button
      type="button"
      class="lock-btn"
      class:locked
      on:click={toggleLock}
      title={locked ? "Terkunci" : "Tidak Terkunci"}
    >
      {#if locked}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path
            d="M7 11V7a5 5 0 0 1 10 0v4"
          ></path></svg
        >
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path
            d="M7 11V7a5 5 0 0 1 9.9-1"
          ></path></svg
        >
      {/if}
    </button>
  {/if}
</div>

<style>
  .input-wrapper {
    position: relative;
    width: 100%;
  }

  input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-input);
    color: var(--text);
    font-size: 0.875rem;
    transition: border-color 0.2s;
  }

  input.has-lock {
    padding-right: 2.5rem;
  }

  input:focus {
    outline: none;
    border-color: var(--primary);
  }

  .lock-btn {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    transition: color 0.2s;
  }

  .lock-btn:hover {
    color: var(--text);
  }

  .lock-btn.locked {
    color: var(--primary);
  }
</style>
