import { describe, it, expect, vi } from 'vitest';
import { parseBppuText } from './parser';

// Mock pdfjs-dist since it fails in Node environment during Vitest
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
  version: 'mock',
}));

describe('BPPU Parser', () => {
  it('should parse multiline tax object descriptions correctly', () => {
    const mockText = `
PEMUNGUTAN
01.01.01.01.01.01.01
01-2026
Normal
Selesai
A. IDENTITAS PENERIMA
A.1 NPWP : 1234567890
A.2 Nama : PT Testing
A.3 NITKU : 000000
B. PEMOTONGAN
B.1 Jenis Fasilitas : Tanpa Fasilitas
B.2 Jenis PPh : PPh Pasal 21
B.3 Objek Pajak
B.7
24-401-01
Hadiah, Penghargaan, Bonus dan Lainnya
Selain yang Telah Dipotong PPh Pasal 21
Ayat (1) Huruf E UU PPh
10.000.000
5%
500.000
B.8 Total
Dokumen Dasar
Jenis Dokumen : Faktur Pajak
Tanggal : 01-01-2026
Nomor Dokumen : FP-001
C. IDENTITAS PEMOTONG
C.1 NPWP : 9876543210
C.2 NITKU : 000000
C.3 Nama : PT Pemotong
C.4 Tanggal : 02-01-2026
C.5 Penandatangan : Direktur
`;

    const data = parseBppuText(mockText);
    
    expect(data.pemotongan.objek_pajak.length).toBe(1);
    const op = data.pemotongan.objek_pajak[0];
    
    expect(op.kode_objek_pajak).toBe('24-401-01');
    // Multiline description should be joined
    expect(op.objek_pajak).toBe('Hadiah, Penghargaan, Bonus dan Lainnya Selain yang Telah Dipotong PPh Pasal 21 Ayat (1) Huruf E UU PPh');
    expect(op.dpp).toBe('10.000.000');
    expect(op.tarif_persen).toBe('5%');
    expect(op.pajak_penghasilan).toBe('500.000');
  });
});
