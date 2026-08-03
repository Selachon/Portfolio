import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertirCentavos } from "../src/services/tasas.js";

// TRM de ejemplo: 3.144,14 pesos por dólar.
const TASA = 3_144_140_000;

describe("conversión entre pesos y dólares", () => {
  it("convierte dólares a pesos con la tasa dada", () => {
    // 100,00 USD × 3.144,14 = 314.414,00 COP
    assert.equal(convertirCentavos(10_000, TASA, { de: "USD", a: "COP" }), 31_441_400);
    // 3,42 USD × 3.144,14 = 10.752,96 COP
    assert.equal(convertirCentavos(342, TASA, { de: "USD", a: "COP" }), 1_075_296);
  });

  it("convierte pesos a dólares", () => {
    assert.equal(convertirCentavos(31_441_400, TASA, { de: "COP", a: "USD" }), 10_000);
    assert.equal(convertirCentavos(250_000_000, TASA, { de: "COP", a: "USD" }), 79_513);
  });

  it("conserva el signo de los gastos", () => {
    assert.equal(convertirCentavos(-342, TASA, { de: "USD", a: "COP" }), -1_075_296);
    assert.equal(convertirCentavos(-31_441_400, TASA, { de: "COP", a: "USD" }), -10_000);
  });

  it("no toca nada si la moneda ya es la pedida", () => {
    assert.equal(convertirCentavos(12_345, TASA, { de: "COP", a: "COP" }), 12_345);
  });

  it("devuelve null si no hay tasa, en vez de inventarse una cifra", () => {
    assert.equal(convertirCentavos(10_000, null, { de: "USD", a: "COP" }), null);
    assert.equal(convertirCentavos(10_000, 0, { de: "USD", a: "COP" }), null);
  });

  it("redondea al centavo más cercano, sin coma flotante", () => {
    // 0,01 USD × 3.144,14 = 31,4414 COP → 31,44
    assert.equal(convertirCentavos(1, TASA, { de: "USD", a: "COP" }), 3144);
    // Medio centavo hacia arriba, y simétrico en negativo.
    assert.equal(convertirCentavos(1, 1_500_000, { de: "USD", a: "COP" }), 2);
    assert.equal(convertirCentavos(-1, 1_500_000, { de: "USD", a: "COP" }), -2);
  });

  it("ida y vuelta no se desvía más de un centavo", () => {
    for (const centavos of [1, 99, 12_345, 505_185_500, -250_000_000]) {
      const enDolares = convertirCentavos(centavos, TASA, { de: "COP", a: "USD" });
      const devuelta = convertirCentavos(enDolares, TASA, { de: "USD", a: "COP" });
      const desvio = Math.abs(devuelta - centavos);
      assert.ok(
        desvio <= Math.abs(Math.round(TASA / 1_000_000)) + 1,
        `${centavos} → ${enDolares} → ${devuelta} se desvió ${desvio}`,
      );
    }
  });

  it("aguanta importes grandes sin perder exactitud", () => {
    // 30 millones de pesos, el orden de magnitud de un mes real.
    // 30.000.000 ÷ 3.144,14 = 9.541,5567 USD → 954.156 centavos.
    const enDolares = convertirCentavos(3_000_000_000, TASA, { de: "COP", a: "USD" });
    assert.equal(enDolares, 954_156);
    assert.ok(Number.isSafeInteger(enDolares));
  });
});
