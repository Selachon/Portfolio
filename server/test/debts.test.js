// Datos inventados: el repositorio es público.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, crearApp, crearUsuario, iniciarSesion } from "./helpers.js";

describe("deudas de abono libre", () => {
  let app;
  let cookie;
  let deudaId;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;
  });

  after(async () => {
    await cerrarApp(app);
  });

  const pedir = (method, url, payload) =>
    app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

  it("crea una deuda sin cuota fija", async () => {
    const res = await pedir("POST", "/api/deudas", {
      concepto: "Préstamo de un familiar",
      importe: "1200000",
      tipo: "libre",
    });

    assert.equal(res.statusCode, 200);
    const deuda = res.json().deuda;
    deudaId = deuda.id;

    assert.equal(deuda.tipo, "libre");
    assert.equal(deuda.centavos, 120_000_000);
    assert.equal(deuda.restanteCentavos, 120_000_000);
    assert.equal(deuda.abonadoCentavos, 0);
    assert.equal(deuda.cuotas, null, "una deuda libre no tiene cuotas");
    assert.equal(deuda.cuotaSugeridaCentavos, null);
  });

  it("descuenta del saldo lo que se abona, sea el importe que sea", async () => {
    const primero = await pedir("POST", `/api/deudas/${deudaId}/abonos`, {
      importe: "300000",
      fecha: "2026-08-05",
      notas: "Lo que pude este mes",
    });

    assert.equal(primero.statusCode, 200);
    assert.equal(primero.json().deuda.restanteCentavos, 90_000_000);
    assert.equal(primero.json().deuda.abonadoCentavos, 30_000_000);

    // Un importe distinto, que es justo el caso que no cabía en las cuotas.
    const segundo = await pedir("POST", `/api/deudas/${deudaId}/abonos`, { importe: "175500" });

    assert.equal(segundo.json().deuda.restanteCentavos, 72_450_000);
    assert.equal(segundo.json().deuda.abonadoCentavos, 47_550_000);
    assert.equal(segundo.json().deuda.porcentaje, 40);
  });

  it("guarda el historial de abonos con su fecha", async () => {
    const res = await pedir("GET", `/api/deudas/${deudaId}`);
    const abonos = res.json().deuda.abonos;

    assert.equal(abonos.length, 2);
    assert.equal(abonos.at(-1).centavos, 30_000_000);
    assert.equal(abonos.at(-1).fecha, "2026-08-05");
    assert.equal(abonos.at(-1).notas, "Lo que pude este mes");
    assert.ok(abonos.every((abono) => abono.cuentaCuota === false));
  });

  it("no deja abonar más de lo que se debe", async () => {
    const res = await pedir("POST", `/api/deudas/${deudaId}/abonos`, { importe: "5000000" });

    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.mensaje, /supera el saldo/);
  });

  it("rechaza abonos que no son un importe positivo", async () => {
    for (const importe of ["0", "-1000", "no es un número"]) {
      const res = await pedir("POST", `/api/deudas/${deudaId}/abonos`, { importe });
      assert.equal(res.statusCode, 400, `debería rechazar ${importe}`);
    }
  });

  it("deshacer un abono devuelve el saldo a como estaba", async () => {
    const antes = await pedir("GET", `/api/deudas/${deudaId}`);
    const abono = antes.json().deuda.abonos[0];
    const saldoAntes = antes.json().deuda.restanteCentavos;

    const res = await pedir("DELETE", `/api/deudas/${deudaId}/abonos/${abono.id}`);

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().deuda.restanteCentavos, saldoAntes + abono.centavos);

    const despues = await pedir("GET", `/api/deudas/${deudaId}`);
    assert.equal(despues.json().deuda.abonos.length, 1);
  });

  it("al cubrir el capital la deuda queda saldada", async () => {
    const actual = await pedir("GET", `/api/deudas/${deudaId}`);
    const restante = actual.json().deuda.restanteCentavos;

    const res = await pedir("POST", `/api/deudas/${deudaId}/abonos`, {
      importe: String(restante / 100),
    });

    assert.equal(res.json().deuda.restanteCentavos, 0);
    assert.equal(res.json().deuda.saldada, true);
    assert.equal(res.json().deuda.porcentaje, 100);
    assert.ok(res.json().deuda.saldadaEn, "debería guardar cuándo quedó saldada");

    const otro = await pedir("POST", `/api/deudas/${deudaId}/abonos`, { importe: "1000" });
    assert.equal(otro.statusCode, 400);
    assert.match(otro.json().error.mensaje, /saldada/);
  });

  it("el atajo de cuota no aplica a una deuda libre", async () => {
    const res = await pedir("POST", `/api/deudas/${deudaId}/cuota`);

    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.mensaje, /no tiene cuotas fijas/);
  });
});

describe("deudas por cuotas con abonos", () => {
  let app;
  let cookie;
  let deudaId;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;

    const res = await app.inject({
      method: "POST",
      url: "/api/deudas",
      headers: { cookie },
      payload: { concepto: "Crédito de ejemplo", importe: "3390000", cuotas: 24, pagadas: 6 },
    });
    deudaId = res.json().deuda.id;
  });

  after(async () => {
    await cerrarApp(app);
  });

  const pedir = (method, url, payload) =>
    app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

  it("conserva el saldo que ya traía de la hoja de cálculo", async () => {
    const res = await pedir("GET", `/api/deudas/${deudaId}`);
    const deuda = res.json().deuda;

    // 3.390.000 · 18/24 = 2.542.500
    assert.equal(deuda.restanteCentavos, 254_250_000);
    assert.equal(deuda.abonadoCentavos, 84_750_000);
    assert.equal(deuda.pendientes, 18);
    assert.equal(deuda.cuotaSugeridaCentavos, 14_125_000, "el saldo entre las cuotas que faltan");
  });

  it("el atajo de cuota registra un abono por el importe de la cuota", async () => {
    const res = await pedir("POST", `/api/deudas/${deudaId}/cuota`);

    assert.equal(res.json().deuda.pagadas, 7);
    assert.equal(res.json().deuda.restanteCentavos, 240_125_000);
    assert.equal(res.json().abono.centavos, 14_125_000);
    assert.equal(res.json().abono.cuentaCuota, true);

    const historial = await pedir("GET", `/api/deudas/${deudaId}`);
    assert.equal(historial.json().deuda.abonos.length, 1, "la cuota queda en el historial");
  });

  it("acepta un abono extraordinario sin gastar una cuota", async () => {
    const res = await pedir("POST", `/api/deudas/${deudaId}/abonos`, {
      importe: "500000",
      cuentaCuota: false,
      notas: "Abono extra con la prima",
    });

    assert.equal(res.json().deuda.pagadas, 7, "no consume una cuota");
    assert.equal(res.json().deuda.restanteCentavos, 190_125_000);
    // La cuota sugerida baja sola: el saldo se reparte entre las 17 que faltan.
    assert.equal(res.json().deuda.cuotaSugeridaCentavos, 11_183_824);
  });

  it("deshacer una cuota devuelve el contador y el saldo", async () => {
    const antes = await pedir("GET", `/api/deudas/${deudaId}`);
    const cuota = antes.json().deuda.abonos.find((abono) => abono.cuentaCuota);

    const res = await pedir("DELETE", `/api/deudas/${deudaId}/abonos/${cuota.id}`);

    assert.equal(res.json().deuda.pagadas, 6, "vuelve el contador de cuotas");
    assert.equal(res.json().deuda.restanteCentavos, 190_125_000 + 14_125_000);
  });

  it("la última cuota cierra la deuda en cero exacto", async () => {
    const creada = await pedir("POST", "/api/deudas", {
      concepto: "Deuda que no divide bien",
      importe: "1000000",
      cuotas: 3,
    });
    const id = creada.json().deuda.id;

    let ultima;
    for (let i = 0; i < 3; i += 1) ultima = await pedir("POST", `/api/deudas/${id}/cuota`);

    assert.equal(ultima.json().deuda.restanteCentavos, 0, "sin centavos sueltos al final");
    assert.equal(ultima.json().deuda.pagadas, 3);
    assert.equal(ultima.json().deuda.saldada, true);
  });

  it("cambiar una deuda a abono libre olvida las cuotas pero no el saldo", async () => {
    const antes = await pedir("GET", `/api/deudas/${deudaId}`);
    const saldoAntes = antes.json().deuda.restanteCentavos;

    const res = await pedir("PATCH", `/api/deudas/${deudaId}`, { tipo: "libre" });

    assert.equal(res.json().deuda.tipo, "libre");
    assert.equal(res.json().deuda.restanteCentavos, saldoAntes, "el saldo no se mueve");
    assert.equal(res.json().deuda.cuotas, null);
  });

  it("el resumen distingue capital, abonado y saldo", async () => {
    const res = await pedir("GET", "/api/deudas");
    const { resumen, deudas } = res.json();

    const activas = deudas.filter((deuda) => deuda.activa);
    assert.equal(
      resumen.restanteCentavos,
      activas.reduce((total, deuda) => total + deuda.restanteCentavos, 0),
    );
    assert.equal(
      resumen.abonadoCentavos,
      activas.reduce((total, deuda) => total + deuda.abonadoCentavos, 0),
    );
    assert.equal(resumen.capitalCentavos, resumen.restanteCentavos + resumen.abonadoCentavos);
  });
});
