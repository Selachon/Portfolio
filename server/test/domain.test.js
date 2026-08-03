import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCents, parseAmountToCents, sumCents } from "../src/domain/money.js";
import { normalizarPeriodo, parseSpanishDate } from "../src/domain/dates.js";

describe("importes", () => {
  it("lee los formatos que aparecen en la hoja y en los extractos", () => {
    const casos = [
      // Tal cual salen del extracto del banco.
      ["38.09", 3809],
      ["\\-35,700.00", -3_570_000],
      ["-300,000.00", -30_000_000],
      ["5,051,855.00", 505_185_500],
      ["\\-183.06", -18_306],
      // Tal cual salen del presupuesto de la hoja.
      ["$41,900", 4_190_000],
      ["$2,500,000", 250_000_000],
      ["$13", 1300],
      [" $ 2,542,500 ", 254_250_000],
      ["600000", 60_000_000],
      // Formato colombiano, que es como lo escribe el banco en el PDF.
      ["1.234.567,89", 123_456_789],
      ["24.900", 2_490_000],
      ["1.500", 150_000],
      // Contabilidad con paréntesis.
      ["(1.200)", -120_000],
      // Ruido.
      ["", null],
      ["   ", null],
      ["sin valor", null],
      [null, null],
    ];

    for (const [entrada, esperado] of casos) {
      assert.equal(parseAmountToCents(entrada), esperado, `no cuadra con "${entrada}"`);
    }
  });

  it("distingue decimales de separadores de miles", () => {
    assert.equal(parseAmountToCents("24.900"), 2_490_000, "tres cifras detrás son miles");
    assert.equal(parseAmountToCents("24.90"), 2490, "dos cifras detrás son decimales");
    assert.equal(parseAmountToCents("24.9"), 2490, "una cifra detrás es decimal");
    assert.equal(parseAmountToCents("1.234.567"), 123_456_700, "miles encadenados");
    assert.equal(parseAmountToCents("0.005"), 1, "con la parte entera en cero es decimal");
  });

  it("redondea al centavo sin usar coma flotante", () => {
    assert.equal(parseAmountToCents("0.005"), 1);
    assert.equal(parseAmountToCents("0.004"), 0);
    assert.equal(parseAmountToCents("1.9994"), 200);
    assert.equal(parseAmountToCents("-1.9994"), -200);
    assert.equal(parseAmountToCents("0.9999"), 100, "el redondeo se lleva la unidad");
  });

  it("no acumula error al sumar, que es donde la coma flotante rompe las cuentas", () => {
    const centavos = Array.from({ length: 1000 }, () => parseAmountToCents("0.10"));
    assert.equal(sumCents(centavos), 10_000);
    assert.equal(formatCents(sumCents(centavos)), "100.00");
  });

  it("formatea centavos de vuelta a texto", () => {
    assert.equal(formatCents(-3_570_000), "-35700.00");
    assert.equal(formatCents(3809), "38.09");
    assert.equal(formatCents(0), "0.00");
    assert.equal(formatCents(5), "0.05");
  });
});

describe("fechas", () => {
  it("lee los formatos de los extractos", () => {
    const casos = [
      ["01 feb. 2026", "2026-02-01"],
      ["27 feb. 2026", "2026-02-27"],
      ["31 mar. 2026", "2026-03-31"],
      ["01 jun. 2026", "2026-06-01"],
      ["30 jun. 2026", "2026-06-30"],
      ["15 de septiembre de 2026", "2026-09-15"],
      ["01/02/2026", "2026-02-01"],
      ["2026-02-01", "2026-02-01"],
      ["1 dic 2025", "2025-12-01"],
    ];

    for (const [entrada, esperado] of casos) {
      assert.equal(parseSpanishDate(entrada), esperado, `no cuadra con "${entrada}"`);
    }
  });

  it("resuelve el formato sin año de la cuenta en dólares", () => {
    assert.equal(parseSpanishDate("jun 01", { anioPorDefecto: 2026 }), "2026-06-01");
    assert.equal(parseSpanishDate("jul 31", { anioPorDefecto: 2026 }), "2026-07-31");
    assert.equal(parseSpanishDate("jun 01"), null, "sin año de referencia no se inventa nada");
  });

  it("tolera la puntuación colgando que traen los datos reales", () => {
    // Una sola fila "jun 19." descuadraba el mes entero.
    assert.equal(parseSpanishDate("jun 19.", { anioPorDefecto: 2026 }), "2026-06-19");
    assert.equal(parseSpanishDate("01 feb. 2026,"), "2026-02-01");
    assert.equal(parseSpanishDate("01 feb.", { anioPorDefecto: 2026 }), "2026-02-01");
  });

  it("rechaza fechas imposibles en vez de correrlas al mes siguiente", () => {
    assert.equal(parseSpanishDate("31 feb. 2026"), null);
    assert.equal(parseSpanishDate("31 jun. 2026"), null);
    assert.equal(parseSpanishDate("00 feb. 2026"), null);
    assert.equal(parseSpanishDate("cualquier cosa"), null);
    assert.equal(parseSpanishDate(""), null);
  });

  it("acepta el 29 de febrero solo en año bisiesto", () => {
    assert.equal(parseSpanishDate("29 feb. 2024"), "2024-02-29");
    assert.equal(parseSpanishDate("29 feb. 2026"), null);
  });

  it("valida periodos que llegan por la API", () => {
    assert.deepEqual(normalizarPeriodo("2026", "2"), { anio: 2026, mes: 2 });
    assert.equal(normalizarPeriodo("2026", "13"), null);
    assert.equal(normalizarPeriodo("1999", "2"), null);
    assert.equal(normalizarPeriodo("abc", "2"), null);
  });
});
