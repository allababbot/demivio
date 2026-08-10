import { describe, expect, test } from "vitest";
import { detectBank, parseBankMutation } from "./parser";

const bcaText = `Periode : 01/05/2026 - 31/05/2026
Saldo Awal : 1,000,000.00
Tanggal Transaksi,Keterangan,Cabang,Jumlah,Saldo
01/05,TRANSFER MASUK,,250,000.00 CR,1,250,000.00
02/05,BIAYA ADMIN,,50,000.00 DB,1,200,000.00
Saldo Akhir : 1,200,000.00`;

const bniText = `Post Date,Value Date,Branch,Journal No.,Description,Debit,Credit
01/05/26 10:00,01/05/26,001,ABC001,SETORAN TUNAI,,300000
02/05/26 12:30,02/05/26,001,ABC002,TARIK TUNAI,125000,`;

const briText = `SALDO_AWAL_MUTASI
ID,NO_REKENING,TGL_TRANSAKSI,TGL_EFEKTIF,NO_JURNAL,TIPE_TRANSAKSI,DESKRIPSI,SALDO_AWAL,DEBET,KREDIT,SALDO_AKHIR,USER_ID,REMARK1,REMARK2,REMARK3,REMARK4,REMARK5,REMARK6,REMARK_CUSTOM
1,123,2026-05-01 08:00:00,2026-05-01,JRN1,CR,TRANSFER,500000,0,200000,700000,,,,,,,,Invoice A
2,123,2026-05-02 09:00:00,2026-05-02,JRN2,DB,ADMIN,700000,25000,0,675000,,,,,,,,`;

describe("detectBank", () => {
  test("detects supported bank exports", () => {
    expect(detectBank(bcaText)).toBe("BCA");
    expect(detectBank(bniText)).toBe("BNI");
    expect(detectBank(briText)).toBe("BRI");
    expect(detectBank("Tanggal,Keterangan\n01/01,Foo")).toBe("UNKNOWN");
  });
});

describe("parseBankMutation", () => {
  test("normalizes BCA rows and verifies printed balances", () => {
    const result = parseBankMutation(bcaText);

    expect(result.bank).toBe("BCA");
    expect(result.needsOpeningBalance).toBe(false);
    expect(result.openingBalance).toBe(1000000);
    expect(result.endingBalancePrinted).toBe(1200000);
    expect(result.rows).toEqual([
      {
        keterangan: "TRANSFER MASUK",
        tanggal: "01/05/2026",
        debit: 0,
        kredit: 250000,
        saldo: 1250000,
        computedSaldo: 1250000,
        status: "match",
      },
      {
        keterangan: "BIAYA ADMIN",
        tanggal: "02/05/2026",
        debit: 50000,
        kredit: 0,
        saldo: 1200000,
        computedSaldo: 1200000,
        status: "match",
      },
    ]);
  });

  test("normalizes BNI rows from a manual opening balance", () => {
    const result = parseBankMutation(bniText, { openingBalance: 1000000 });

    expect(result.bank).toBe("BNI");
    expect(result.needsOpeningBalance).toBe(true);
    expect(result.openingBalance).toBe(1000000);
    expect(result.rows).toEqual([
      {
        keterangan: "SETORAN TUNAI",
        tanggal: "01/05/2026",
        debit: 0,
        kredit: 300000,
        saldo: 1300000,
        computedSaldo: 1300000,
        status: "manual",
      },
      {
        keterangan: "TARIK TUNAI",
        tanggal: "02/05/2026",
        debit: 125000,
        kredit: 0,
        saldo: 1175000,
        computedSaldo: 1175000,
        status: "manual",
      },
    ]);
  });

  test("normalizes BRI rows and uses custom remarks when available", () => {
    const result = parseBankMutation(briText);

    expect(result.bank).toBe("BRI");
    expect(result.needsOpeningBalance).toBe(false);
    expect(result.openingBalance).toBe(500000);
    expect(result.rows.map((row) => row.keterangan)).toEqual(["Invoice A", "ADMIN"]);
    expect(result.rows.map((row) => row.status)).toEqual(["match", "match"]);
    expect(result.rows[1]).toMatchObject({
      tanggal: "02/05/2026",
      debit: 25000,
      kredit: 0,
      saldo: 675000,
      computedSaldo: 675000,
    });
  });

  test("throws a helpful error for unsupported layouts", () => {
    expect(() => parseBankMutation("foo,bar\n1,2")).toThrow("Format mutasi bank belum dikenali");
  });
});
