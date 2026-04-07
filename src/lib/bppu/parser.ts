import * as pdfjsLib from 'pdfjs-dist';
import type { BppuData, ObjekPajak } from './types';

// Set worker path — bundled with pdfjs-dist
if (typeof window !== 'undefined' || typeof self !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

export const parseBppuText = (text: string): BppuData => {
  const data: BppuData = {
    header: { nomor: '', masa_pajak: '', sifat_pemotongan: '', status_bukti_pemotongan: '' },
    penerima: { npwp_nik: '', nama: '', nitku: '' },
    pemotongan: {
      jenis_fasilitas: '',
      jenis_pph: '',
      objek_pajak: [],
      dokumen_dasar: { jenis_dokumen: '', tanggal_dokumen: '', nomor_dokumen: '' },
      nomor_sp2d: ''
    },
    pemotong: { npwp_nik: '', nitku: '', nama_pemotong: '', tanggal: '', nama_penandatangan: '' }
  };

  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l !== '');

  const cleanVal = (v: string | undefined): string => {
    if (!v) return '';
    if (/^[A-C]\.\s/.test(v)) return '';
    if (v.includes('IDENTITAS') || v.includes('PEMOTONGAN')) return '';
    return v;
  };

  // Extract Header
  const pemungutanIdx = lines.findIndex((l) => l === 'PEMUNGUTAN');
  if (pemungutanIdx !== -1) {
    const headerVals = lines
      .slice(pemungutanIdx + 1, pemungutanIdx + 15)
      .filter((l) => l !== '' && !l.includes('IDENTITAS') && !l.includes('WAJIB PAJAK'));
    if (headerVals.length >= 4) {
      data.header.nomor = cleanVal(headerVals[0]);
      data.header.masa_pajak = cleanVal(headerVals[1]);
      data.header.sifat_pemotongan = cleanVal(headerVals[2]);
      data.header.status_bukti_pemotongan = cleanVal(headerVals[3]);
    }
  }

  // Extract Penerima
  const idxA1 = lines.findIndex((l) => l === 'A.1');
  if (idxA1 !== -1) {
    const colonIdx = lines.indexOf(':', idxA1);
    if (colonIdx !== -1) data.penerima.npwp_nik = cleanVal(lines[colonIdx + 1]);
  }
  const idxA2 = lines.findIndex((l) => l === 'A.2');
  if (idxA2 !== -1) {
    const colonIdx = lines.indexOf(':', idxA2);
    if (colonIdx !== -1) data.penerima.nama = cleanVal(lines[colonIdx + 1]);
  }
  const idxA3 = lines.findIndex((l) => l.startsWith('A.3') || l.includes('USAHA (NITKU)'));
  if (idxA3 !== -1) {
    const colonIdx = lines.indexOf(':', idxA3);
    if (colonIdx !== -1) {
      const val = lines[colonIdx + 1];
      const parts = val.split(' - ');
      data.penerima.nitku = cleanVal(parts[0].trim());
    }
  }

  // Extract Pemotongan
  const b1Idx = lines.findIndex((l) => l === 'B.1');
  if (b1Idx !== -1) {
    const line = lines[b1Idx + 1] || '';
    if (line.includes('Jenis Fasilitas'))
      data.pemotongan.jenis_fasilitas = cleanVal(line.split(':')[1]?.trim());
  }
  const b2Idx = lines.findIndex((l) => l === 'B.2');
  if (b2Idx !== -1) {
    const line = lines[b2Idx + 1] || '';
    if (line.includes('Jenis PPh'))
      data.pemotongan.jenis_pph = cleanVal(line.split(':')[1]?.trim());
  }

  // Extract Objek Pajak Table
  const b3Idx = lines.findIndex((l) => l.startsWith('B.3'));
  if (b3Idx !== -1) {
    const b7Idx = lines.findIndex((l, i) => i >= b3Idx && l.startsWith('B.7'));
    if (b7Idx !== -1) {
      let curr = b7Idx + 1;
      let currentCode = '';
      let buffer: string[] = [];

      const finalize = () => {
        if (!currentCode || buffer.length < 1) return;
        
        // Search for rate (contains %)
        let tIdx = buffer.findIndex((s) => s.includes('%'));
        
        // If no %, fallback to some heuristic or assume it's the 2nd to last if we have 3+
        if (tIdx === -1 && buffer.length >= 3) tIdx = buffer.length - 2;

        if (tIdx !== -1) {
          const dIdx = tIdx - 1;
          const pIdx = tIdx + 1;

          const obj: ObjekPajak = {
            kode_objek_pajak: currentCode,
            objek_pajak: buffer
              .slice(0, dIdx)
              .filter((s) => s !== '')
              .join(' '),
            dpp: cleanVal(buffer[dIdx]),
            tarif_persen: cleanVal(buffer[tIdx]),
            pajak_penghasilan: cleanVal(buffer[pIdx])
          };
          data.pemotongan.objek_pajak.push(obj);
        } else {
          // Fallback if structure is weird: everything is description
          data.pemotongan.objek_pajak.push({
            kode_objek_pajak: currentCode,
            objek_pajak: buffer.join(' '),
            dpp: '',
            tarif_persen: '',
            pajak_penghasilan: ''
          });
        }
      };

      while (curr < lines.length) {
        const line = lines[curr];
        if (line.startsWith('B.8') || line.includes('Dokumen Dasar') || line.startsWith('C.')) {
          finalize();
          break;
        }

        // New record starts with a code
        if (/^\d{2}-\d{3}-\d{2}$/.test(line)) {
          finalize();
          currentCode = line;
          buffer = [];
        } else if (currentCode) {
          buffer.push(line);
        }
        curr++;
      }
    }
  }

  // Extract Dokumen Dasar
  const jenisDocIdx = lines.findIndex((l) => l === 'Jenis Dokumen');
  if (jenisDocIdx !== -1) {
    const colonIdx = lines.indexOf(':', jenisDocIdx);
    if (colonIdx !== -1)
      data.pemotongan.dokumen_dasar.jenis_dokumen = cleanVal(lines[colonIdx + 1]);
  }
  const tglIdx = lines.findIndex((l) => l.startsWith('Tanggal :'));
  if (tglIdx !== -1)
    data.pemotongan.dokumen_dasar.tanggal_dokumen = cleanVal(lines[tglIdx].split(':')[1]?.trim());

  const nomorDocIdx = lines.findIndex((l) => l === 'Nomor Dokumen');
  if (nomorDocIdx !== -1) {
    const colonIdx = lines.indexOf(':', nomorDocIdx);
    if (colonIdx !== -1)
      data.pemotongan.dokumen_dasar.nomor_dokumen = cleanVal(lines[colonIdx + 1]);
  }

  const sp2dIdx = lines.findIndex((l) => l === 'Nomor SP2D');
  if (sp2dIdx !== -1) {
    const colonIdx = lines.indexOf(':', sp2dIdx);
    if (colonIdx !== -1) data.pemotongan.nomor_sp2d = cleanVal(lines[colonIdx + 1]);
  }

  // Extract Pemotong
  const c1Idx = lines.findIndex((l) => l === 'C.1');
  if (c1Idx !== -1) {
    const colonIdx = lines.indexOf(':', c1Idx);
    if (colonIdx !== -1) data.pemotong.npwp_nik = cleanVal(lines[colonIdx + 1]);
  }
  const c2Idx = lines.findIndex((l) => l === 'C.2');
  if (c2Idx !== -1) {
    const colonIdx = lines.indexOf(':', c2Idx);
    if (colonIdx !== -1) {
      const val = lines[colonIdx + 1];
      data.pemotong.nitku = cleanVal(val.split(' - ')[0].trim());
    }
  }
  const c3Idx = lines.findIndex((l) => l === 'C.3');
  if (c3Idx !== -1) {
    const colonIdx = lines.indexOf(':', c3Idx);
    if (colonIdx !== -1) data.pemotong.nama_pemotong = cleanVal(lines[colonIdx + 1]);
  }
  const c4Idx = lines.findIndex((l) => l === 'C.4');
  if (c4Idx !== -1) {
    const colonIdx = lines.indexOf(':', c4Idx);
    if (colonIdx !== -1) data.pemotong.tanggal = cleanVal(lines[colonIdx + 1]);
  }
  const c5Idx = lines.findIndex((l) => l === 'C.5');
  if (c5Idx !== -1) {
    const colonIdx = lines.indexOf(':', c5Idx);
    if (colonIdx !== -1) data.pemotong.nama_penandatangan = cleanVal(lines[colonIdx + 1]);
  }

  return data;
};

export const extractPdfTextLocal = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const strings = (textContent.items as { str: string }[]).map((item) => item.str);
    fullText += strings.join('\n') + '\n';
  }
  return fullText;
};
