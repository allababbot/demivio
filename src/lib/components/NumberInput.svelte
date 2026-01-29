<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let value: number | null = null;
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let placeholder: string = '';
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();
  let inputElement: HTMLInputElement;
  let isFocused = false;

  // Format number (1000 -> 1.000)
  function format(val: number | null): string {
    if (val === null || val === undefined || isNaN(val)) return '';
    return new Intl.NumberFormat('id-ID').format(val);
  }

  // Parse formatted string (1.000 -> 1000)
  function parse(str: string): number | null {
    if (!str) return null;
    // Remove dots (thousands separator) and replace comma with dot (decimal) if any
    const cleanStr = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  }

  // Handle focus: show raw number
  function handleFocus() {
    isFocused = true;
    if (inputElement) {
        inputElement.type = 'number'; // Switch to number input for mobile keyboards
        inputElement.value = value?.toString() ?? '';
    }
  }

  // Handle blur: show formatted string
  function handleBlur() {
    isFocused = false;
    if (inputElement) {
       inputElement.type = 'text'; // Switch back to text for formatting
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
    
    if (target.type === 'number') {
        newValue = target.valueAsNumber;
        if (isNaN(newValue)) newValue = null;
    } else {
        newValue = parse(rawValue);
    }
    
    value = newValue;
    dispatch('input', event);
  }

  // Initialize display value
  // We need to use action or reactive statement to set initial value because binding happens after mount
  $: if (inputElement && !isFocused) {
      inputElement.type = 'text';
      inputElement.value = format(value);
  }
</script>

<input
  bind:this={inputElement}
  type="text"
  {placeholder}
  {disabled}
  {min}
  {max}
  on:focus={handleFocus}
  on:blur={handleBlur}
  on:input={handleInput}
/>

<style>
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

  input:focus {
    outline: none;
    border-color: var(--primary);
  }
</style>
