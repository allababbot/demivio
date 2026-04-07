import * as XLSX from 'xlsx';
import type { SerializableSimulationResult } from './worker-types';

/**
 * Export simulation results to XLSX format and trigger download.
 */
export function exportResultsToExcel(results: SerializableSimulationResult[], filename = 'demivio-results.xlsx'): void {
  if (results.length === 0) return;

  const headers = [
    '#',
    'Harga Satuan',
    'Qty',
    'Potongan',
    'DPP Nilai Lain',
    'PPN',
    'Selisih PPN',
    'Skor (%)',
    'Kualitas',
  ];

  const rows = results.map((r, i) => [
    i + 1,
    r.transaction.unitPrice,
    r.transaction.quantity,
    r.transaction.discount,
    r.metadata.dppNilaiLain,
    r.calculatedPpn,
    r.ppnDifference,
    r.humanScore?.accuracy ?? '',
    r.humanScore?.label ?? '',
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Simulasi');

  // Trigger download
  XLSX.writeFile(workbook, filename);
}
