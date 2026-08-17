# Demivio — Agent Guide

Demivio is a client-side-only suite of Indonesian tax utilities (SvelteKit, no backend). All file processing happens in the user's browser — **no data leaves the browser**: no server routes, no SSR, no API calls. Adding a backend is out of scope; keep it that way.

## Map

Each tool is a module: pure TypeScript in `src/lib/<tool>/`, a thin route in `src/routes/<tool>/`, wired into home nav and the README.

- `kalkulator` (PPN reverse calculator) — `calculator.ts` (tax math), `simulator.ts` + `simulator.worker.ts` (combinatorial search in a Web Worker), `db.ts` (IndexedDB result cache)
- `rekonsiliasi` (sales reconciliation, Coretax vs app CSV) — matching logic is inline in the route, the one legacy exception; new logic follows the lib-module pattern
- `mutasi-bank` (BCA/BNI/BRI CSV → Excel) — `parser.ts` bank detection + row normalization, `exporter.ts`
- `faktur` (PDF e-Faktur extraction) — `parser.ts`, `formatter.ts`
- `bppu` (PDF BPPU Coretax extraction) — `parser.ts`, `formatter.ts`

## Rules

- Logic lives in `src/lib/<tool>/` as pure functions; routes and `.svelte` files stay thin. Anything testable is tested without the browser.
- Money uses `Decimal.js` (`Decimal.set({ precision: 20, rounding: ROUND_HALF_UP })` in `types.ts`). Never float-arithmetic amounts.
- CSV/amount parsing is tolerant: plain numbers via `parseAmount`-style logic, accepts `,`/`.` thousands and decimals; dates normalize to `DD/MM/YYYY`.
- Tax rates and formulas live in `src/lib/constants.ts` (PPN = DPP × 11/12 × 12% = DPP × 11%). Change them there, not inline.
- UI labels are Indonesian (`faktur pajak`, `mutasi bank`, `bukti potong`); identifiers are English.
- Plans live in `docs/superpowers/plans/` as checkbox task lists (`- [ ]`) and are implemented task-by-task.
- Tests are colocated `<name>.test.ts` (Vitest); fixtures are inline strings of real export/PDF text.

## Done means

`pnpm check` (svelte-check + typecheck) and `pnpm test` (Vitest) both green. New parsing or money logic ships with a test.