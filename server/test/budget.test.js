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

describe("editar el presupuesto", () => {
  let app;
  let cookie;
  let conceptoId;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    await crearUsuario({ email: "asesor@kora.test", role: "advisor" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;

    const res = await app.inject({
      method: "POST",
      url: "/api/presupuesto",
      headers: { cookie },
      payload: {
        concepto: "Suscripción de ejemplo",
        dia: 14,
        importe: "99900",
        frecuencia: "mensual",
        tipo: "gasto",
        pago: "automatico",
      },
    });
    conceptoId = res.json().concepto.id;
  });

  after(async () => {
    await cerrarApp(app);
  });

  const pedir = (method, url, payload) =>
    app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

  it("cambia el nombre y el importe cuando suben el precio", async () => {
    const res = await pedir("PATCH", `/api/presupuesto/${conceptoId}`, {
      concepto: "Suscripción de ejemplo (plan nuevo)",
      importe: "129900",
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().concepto.concepto, "Suscripción de ejemplo (plan nuevo)");
    assert.equal(res.json().concepto.centavos, 12_990_000);
  });

  it("permite quitarle el día a un concepto que deja de tener fecha fija", async () => {
    const res = await pedir("PATCH", `/api/presupuesto/${conceptoId}`, { dia: null });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().concepto.dia, null);
  });

  it("rechaza un importe o una frecuencia que no valen", async () => {
    for (const payload of [{ importe: "-100" }, { importe: "0" }, { frecuencia: "cada rato" }]) {
      const res = await pedir("PATCH", `/api/presupuesto/${conceptoId}`, payload);
      assert.equal(res.statusCode, 400, `debería rechazar ${JSON.stringify(payload)}`);
    }
  });

  it("retirar un concepto lo saca del mes pero no lo pierde", async () => {
    const retirar = await pedir("PATCH", `/api/presupuesto/${conceptoId}`, { activo: false });
    assert.equal(retirar.json().concepto.activo, false);

    const mes = await pedir("GET", "/api/presupuesto?anio=2026&mes=8");
    assert.ok(
      !mes.json().conceptos.some((c) => c.id === conceptoId),
      "ya no cuenta en el plan del mes",
    );

    const conRetirados = await pedir("GET", "/api/presupuesto?anio=2026&mes=8&retirados=1");
    assert.ok(
      conRetirados.json().retirados.some((c) => c.id === conceptoId),
      "pero sigue estando para poder recuperarlo",
    );
  });

  it("un concepto retirado se puede volver a activar", async () => {
    const res = await pedir("PATCH", `/api/presupuesto/${conceptoId}`, { activo: true });
    assert.equal(res.json().concepto.activo, true);

    const mes = await pedir("GET", "/api/presupuesto?anio=2026&mes=8");
    assert.ok(mes.json().conceptos.some((c) => c.id === conceptoId));
  });

  it("los retirados no suman en el plan del mes", async () => {
    const antes = await pedir("GET", "/api/presupuesto?anio=2026&mes=8");
    const planAntes = antes.json().resumen.gastosPlaneados;

    await pedir("PATCH", `/api/presupuesto/${conceptoId}`, { activo: false });

    const despues = await pedir("GET", "/api/presupuesto?anio=2026&mes=8&retirados=1");
    assert.equal(despues.json().resumen.gastosPlaneados, planAntes - 12_990_000);
  });

  it("el asesor puede corregir pero no borrar", async () => {
    const cookieAsesor = (await iniciarSesion(app, "asesor@kora.test")).cookie;

    const corregir = await app.inject({
      method: "PATCH",
      url: `/api/presupuesto/${conceptoId}`,
      headers: { cookie: cookieAsesor },
      payload: { notas: "Revisado con Sela" },
    });
    assert.equal(corregir.statusCode, 200);

    const borrar = await app.inject({
      method: "DELETE",
      url: `/api/presupuesto/${conceptoId}`,
      headers: { cookie: cookieAsesor },
    });
    assert.equal(borrar.statusCode, 403);
  });

  it("deja constancia de qué cambió", async () => {
    const res = await pedir("GET", "/api/auditoria?limite=50");
    const evento = res.json().eventos.find((e) => e.accion === "presupuesto.actualizado");

    assert.ok(evento, "la edición queda auditada");
    assert.ok(Array.isArray(evento.detalles.campos));
    assert.ok(evento.detalles.antes, "guarda cómo estaba antes");
  });
});
