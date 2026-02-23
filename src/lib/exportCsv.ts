import type { SerializableSimulationResult } from './worker-types';

/**
 * Export simulation results to CSV format and trigger download.
 */
export function exportResultsToCsv(results: SerializableSimulationResult[], filename = 'demivio-results.csv'): void {
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

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
