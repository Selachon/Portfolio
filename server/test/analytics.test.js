// Datos inventados para validar los agregados que alimentan los gráficos.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, crearApp, crearUsuario, iniciarSesion } from "./helpers.js";

describe("analítica financiera", () => {
  let app;
  let cookie;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;

    const cuentaCop = await app.inject({
      method: "POST",
      url: "/api/cuentas",
      headers: { cookie },
      payload: { nombre: "Cuenta COP", tipo: "banco", moneda: "COP" },
    });
    const cuentaUsd = await app.inject({
      method: "POST",
      url: "/api/cuentas",
      headers: { cookie },
      payload: { nombre: "Cuenta USD", tipo: "banco", moneda: "USD" },
    });

    await app.inject({
      method: "POST",
      url: "/api/movimientos/importar/confirmar",
      headers: { cookie },
      payload: {
        cuentaId: cuentaCop.json().cuenta.id,
        movimientos: [
          { fecha: "2026-01-03", descripcion: "Ingreso enero", centavos: 500_000, categoria: "Honorarios" },
          { fecha: "2026-01-08", descripcion: "Arriendo enero", centavos: -100_000, categoria: "Vivienda" },
          { fecha: "2026-02-01", descripcion: "Ingreso febrero", centavos: 800_000, categoria: "Honorarios" },
          { fecha: "2026-02-02", descripcion: "Mercado febrero", centavos: -200_000, categoria: "Mercado" },
          { fecha: "2026-02-05", descripcion: "Arriendo febrero", centavos: -300_000, categoria: "Vivienda" },
        ],
      },
    });

    await app.inject({
      method: "POST",
      url: "/api/movimientos/importar/confirmar",
      headers: { cookie },
      payload: {
        cuentaId: cuentaUsd.json().cuenta.id,
        movimientos: [
          { fecha: "2026-02-07", descripcion: "Ingreso USD", centavos: 9_999_999, categoria: "Honorarios" },
        ],
      },
    });
  });

  after(async () => {
    await cerrarApp(app);
  });

  it("arma series completas, categorías e indicadores sin mezclar monedas", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/analitica?anio=2026&mes=2&moneda=COP&meses=3",
      headers: { cookie },
    });

    assert.equal(response.statusCode, 200);
    const data = response.json();

    assert.equal(data.serieMensual.length, 3);
    assert.deepEqual(
      data.serieMensual.map((row) => [row.mes, row.ingresosCentavos, row.gastosCentavos, row.netoCentavos]),
      [
        [12, 0, 0, 0],
        [1, 500_000, -100_000, 400_000],
        [2, 800_000, -500_000, 300_000],
      ],
    );

    assert.equal(data.serieDiaria.length, 28);
    assert.equal(data.serieDiaria[1].gastosCentavos, -200_000);
    assert.equal(data.serieDiaria[4].gastosCentavos, -300_000);
    assert.equal(data.serieDiaria.at(-1).acumuladoCentavos, 300_000);

    assert.deepEqual(
      data.categorias.map((row) => [row.categoria, row.magnitudCentavos, row.porcentaje]),
      [
        ["Vivienda", 300_000, 60],
        ["Mercado", 200_000, 40],
      ],
    );

    assert.equal(data.indicadores.promedioIngresosCentavos, 650_000);
    assert.equal(data.indicadores.promedioGastosCentavos, -300_000);
    assert.equal(data.indicadores.promedioNetoCentavos, 350_000);
    assert.equal(data.indicadores.tasaAhorro, 37.5);
    assert.equal(data.indicadores.diasConGasto, 2);
    assert.equal(data.indicadores.diasSinGasto, 26);
    assert.equal(data.indicadores.mejorMes.mes, 1);
    assert.equal(data.indicadores.peorMes.mes, 2);
    assert.equal(data.indicadores.mayorGasto.centavos, -300_000);
  });

  it("rechaza periodos, monedas y rangos inválidos", async () => {
    for (const url of [
      "/api/analitica?anio=2026&mes=13",
      "/api/analitica?moneda=EUR",
      "/api/analitica?meses=30",
    ]) {
      const response = await app.inject({ method: "GET", url, headers: { cookie } });
      assert.equal(response.statusCode, 400, url);
    }
  });
});
