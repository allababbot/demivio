# Mutasi Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new Demivio tool that converts raw BCA, BNI, and BRI bank mutation exports into standardized, formatted Excel workbooks.

**Architecture:** Keep parsing and workbook shaping in `src/lib/mutasi-bank` so behavior can be tested without the Svelte page. Add a standalone `/mutasi-bank` route that handles upload, bank detection, preview, BNI opening balance input, per-file export, and combined export. Wire the new route into home navigation, top navigation, help text, and README.

**Tech Stack:** SvelteKit, TypeScript, Vitest, SheetJS (`xlsx`).

---

### Task 1: Parser Core

**Files:**
- Create: `src/lib/mutasi-bank/types.ts`
- Create: `src/lib/mutasi-bank/parser.ts`
- Test: `src/lib/mutasi-bank/parser.test.ts`

- [ ] Write failing tests for BCA, BNI, and BRI sample text conversion.
- [ ] Run `npm test -- src/lib/mutasi-bank/parser.test.ts` and confirm missing module failure.
- [ ] Implement bank detection, CSV parsing, amount parsing, date normalization, and row validation.
- [ ] Run focused parser tests and confirm pass.

### Task 2: Excel Export Helpers

**Files:**
- Create: `src/lib/mutasi-bank/exporter.ts`
- Test: `src/lib/mutasi-bank/exporter.test.ts`

- [ ] Write failing tests for workbook sheet creation, headers, column widths, and combined workbook behavior.
- [ ] Run focused exporter tests and confirm missing module failure.
- [ ] Implement helpers returning `XLSX.WorkBook` objects and file-safe names.
- [ ] Run focused exporter tests and confirm pass.

### Task 3: Svelte Tool Page

**Files:**
- Create: `src/routes/mutasi-bank/+page.ts`
- Create: `src/routes/mutasi-bank/+page.svelte`

- [ ] Build upload flow for `.csv`, `.xls`, and `.txt` files.
- [ ] Display detected bank, row count, validation status, summary totals, preview table, and errors.
- [ ] Add opening balance input for BNI files and re-parse on change.
- [ ] Add Excel export buttons for active file and all valid files.

### Task 4: App Integration and Docs

**Files:**
- Modify: `src/lib/components/TopBar.svelte`
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/+layout.svelte`
- Modify: `README.md`

- [ ] Add Mutasi Bank to main navigation.
- [ ] Add homepage tool card.
- [ ] Add help modal tab and usage copy.
- [ ] Update README feature list and instructions.

### Task 5: Verification

- [ ] Run `npm test -- src/lib/mutasi-bank/parser.test.ts src/lib/mutasi-bank/exporter.test.ts`.
- [ ] Run `npm run build`.
- [ ] Report baseline `npm test` failures separately if unrelated simulator tests remain failing.
