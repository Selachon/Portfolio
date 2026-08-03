// Datos inventados, formatos reales: el repositorio es público.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, crearApp, crearUsuario, iniciarSesion } from "./helpers.js";

describe("presupuesto fijo", () => {
  let app;
  let cookie;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;
  });

  after(async () => {
    await cerrarApp(app);
  });

  it("registra conceptos con la misma forma que la hoja", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/presupuesto",
      headers: { cookie },
      payload: {
        concepto: "Arriendo",
        dia: 13,
        importe: "$2,500,000",
        moneda: "COP",
        frecuencia: "mensual",
        tipo: "gasto",
        pago: "manual",
      },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().concepto.centavos, 250_000_000, "acepta el formato con $ y comas");
    assert.equal(res.json().concepto.dia, 13);
  });

  it("exige que el importe sea positivo: el sentido lo da el tipo", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/presupuesto",
      headers: { cookie },
      payload: { concepto: "Mal", importe: "-1000", frecuencia: "mensual", tipo: "gasto", pago: "manual" },
    });

    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.mensaje, /positivo/);
  });

  it("lleva el estado de pagado mes a mes, sin tocar el plan", async () => {
    const alta = await app.inject({
      method: "POST",
      url: "/api/presupuesto",
      headers: { cookie },
      payload: {
        concepto: "Agua",
        dia: 11,
        importe: "$150,000",
        frecuencia: "mensual",
        tipo: "gasto",
        pago: "manual",
        notas: "Variable",
      },
    });
    const id = alta.json().concepto.id;

    // En febrero llegó más cara de lo planeado.
    const marcar = await app.inject({
      method: "PUT",
      url: `/api/presupuesto/${id}/2026/2`,
      headers: { cookie },
      payload: { estado: "pagado", importe: "$172,300", pagadoEl: "2026-02-11" },
    });
    assert.equal(marcar.statusCode, 200);
    assert.equal(marcar.json().estado, "pagado");

    const febrero = await app.inject({
      method: "GET",
      url: "/api/presupuesto?anio=2026&mes=2",
      headers: { cookie },
    });
    const agua = febrero.json().conceptos.find((c) => c.concepto === "Agua");
    assert.equal(agua.estadoDelMes, "pagado");
    assert.equal(agua.centavosDelMes, 17_230_000, "manda el importe real del mes");
    assert.equal(agua.centavos, 15_000_000, "el plan sigue intacto");

    // Marzo arranca limpio: el estado es por mes.
    const marzo = await app.inject({
      method: "GET",
      url: "/api/presupuesto?anio=2026&mes=3",
      headers: { cookie },
    });
    const aguaMarzo = marzo.json().conceptos.find((c) => c.concepto === "Agua");
    assert.equal(aguaMarzo.estadoDelMes, "pendiente");
    assert.equal(aguaMarzo.centavosDelMes, undefined);
  });

  it("resume lo pendiente del mes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/presupuesto?anio=2026&mes=3",
      headers: { cookie },
    });

    const { resumen } = res.json();
    assert.ok(resumen.pendientes >= 2);
    assert.equal(resumen.gastosPlaneados, 265_000_000, "arriendo más agua");
  });

  it("los conceptos anuales no aparecen todos los meses", async () => {
    await app.inject({
      method: "POST",
      url: "/api/presupuesto",
      headers: { cookie },
      payload: {
        concepto: "Suscripciones Camilo",
        dia: 15,
        importe: "$300,000",
        frecuencia: "anual",
        tipo: "ingreso",
        pago: "manual",
      },
    });

    const esteMes = new Date();
    const dentroDeSeis = await app.inject({
      method: "GET",
      url: `/api/presupuesto?anio=${esteMes.getUTCFullYear()}&mes=${((esteMes.getUTCMonth() + 6) % 12) + 1}`,
      headers: { cookie },
    });

    const anual = dentroDeSeis.json().conceptos.find((c) => c.concepto === "Suscripciones Camilo");
    assert.equal(anual, undefined, "un concepto anual no toca seis meses después");
  });
});

describe("deudas y deudores", () => {
  let app;
  let cookie;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;
  });

  after(async () => {
    await cerrarApp(app);
  });

  it("calcula el saldo restante de una deuda en cuotas", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/deudas",
      headers: { cookie },
      payload: { concepto: "Crédito de ejemplo", importe: "3390000", cuotas: 24, pagadas: 6 },
    });

    assert.equal(res.statusCode, 200);
    const deuda = res.json().deuda;
    assert.equal(deuda.pendientes, 18);
    // 3.390.000 · 18/24 = 2.542.500
    assert.equal(deuda.restanteCentavos, 254_250_000);
  });

  it("registrar una cuota baja el saldo", async () => {
    const lista = await app.inject({ method: "GET", url: "/api/deudas", headers: { cookie } });
    const id = lista.json().deudas[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/deudas/${id}/cuota`,
      headers: { cookie },
    });

    assert.equal(res.json().deuda.pagadas, 7);
    assert.equal(res.json().deuda.restanteCentavos, 240_125_000);
  });

  it("no acepta más cuotas pagadas que las que existen", async () => {
    const lista = await app.inject({ method: "GET", url: "/api/deudas", headers: { cookie } });
    const id = lista.json().deudas[0].id;

    const res = await app.inject({
      method: "PATCH",
      url: `/api/deudas/${id}`,
      headers: { cookie },
      payload: { pagadas: 30 },
    });

    assert.equal(res.statusCode, 400);
  });

  it("lleva quién te debe y cuánto queda por cobrar", async () => {
    await app.inject({
      method: "POST",
      url: "/api/deudores",
      headers: { cookie },
      payload: { deudor: "Persona A", importe: "200000" },
    });
    const segundo = await app.inject({
      method: "POST",
      url: "/api/deudores",
      headers: { cookie },
      payload: { deudor: "Persona B", importe: "850000" },
    });

    let lista = await app.inject({ method: "GET", url: "/api/deudores", headers: { cookie } });
    assert.equal(lista.json().resumen.pendienteCentavos, 105_000_000);

    await app.inject({
      method: "PATCH",
      url: `/api/deudores/${segundo.json().deudor.id}`,
      headers: { cookie },
      payload: { estado: "cobrado" },
    });

    lista = await app.inject({ method: "GET", url: "/api/deudores", headers: { cookie } });
    assert.equal(lista.json().resumen.pendienteCentavos, 20_000_000, "lo cobrado ya no cuenta");
  });
});
