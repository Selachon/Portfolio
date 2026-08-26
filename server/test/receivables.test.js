// Datos inventados: el repositorio es público.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, collection, crearApp, crearUsuario, iniciarSesion } from "./helpers.js";
import { createDocument } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";

describe("cobros con abonos parciales", () => {
  let app;
  let cookie;
  let cobroId;

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

  it("crea un cobro de abono libre", async () => {
    const res = await pedir("POST", "/api/deudores", {
      deudor: "Persona A",
      importe: "850000",
    });

    assert.equal(res.statusCode, 200);
    const cobro = res.json().deudor;
    cobroId = cobro.id;

    assert.equal(cobro.tipo, "libre");
    assert.equal(cobro.centavos, 85_000_000);
    assert.equal(cobro.restanteCentavos, 85_000_000);
    assert.equal(cobro.abonadoCentavos, 0);
    assert.equal(cobro.estado, "pendiente");
  });

  it("descuenta del saldo lo que va entrando", async () => {
    const primero = await pedir("POST", `/api/deudores/${cobroId}/abonos`, {
      importe: "200000",
      fecha: "2026-08-05",
      notas: "Me pasó lo que pudo",
    });

    assert.equal(primero.statusCode, 200);
    assert.equal(primero.json().deudor.restanteCentavos, 65_000_000);
    assert.equal(primero.json().deudor.abonadoCentavos, 20_000_000);
    assert.equal(primero.json().deudor.estado, "pendiente", "todavía falta por entrar");

    const segundo = await pedir("POST", `/api/deudores/${cobroId}/abonos`, { importe: "150000" });
    assert.equal(segundo.json().deudor.restanteCentavos, 50_000_000);
    assert.equal(segundo.json().deudor.porcentaje, 41);
  });

  it("guarda el historial de lo cobrado", async () => {
    const res = await pedir("GET", `/api/deudores/${cobroId}`);
    const abonos = res.json().deudor.abonos;

    assert.equal(abonos.length, 2);
    assert.equal(abonos.at(-1).centavos, 20_000_000);
    assert.equal(abonos.at(-1).fecha, "2026-08-05");
    assert.equal(abonos.at(-1).notas, "Me pasó lo que pudo");
  });

  it("no deja cobrar más de lo que le falta por pagar", async () => {
    const res = await pedir("POST", `/api/deudores/${cobroId}/abonos`, { importe: "900000" });

    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.mensaje, /supera el saldo/);
  });

  it("el resumen cuenta lo que falta por entrar, no el total prestado", async () => {
    const res = await pedir("GET", "/api/deudores");
    const { resumen } = res.json();

    assert.equal(resumen.pendienteCentavos, 50_000_000, "solo lo que queda por cobrar");
    assert.equal(resumen.prestadoCentavos, 85_000_000);
    assert.equal(resumen.recuperadoCentavos, 35_000_000);
    assert.equal(resumen.prestadoCentavos, resumen.pendienteCentavos + resumen.recuperadoCentavos);
  });

  it("al entrar el último peso pasa a cobrado por sí solo", async () => {
    const res = await pedir("POST", `/api/deudores/${cobroId}/abonos`, { importe: "500000" });

    assert.equal(res.json().deudor.restanteCentavos, 0);
    assert.equal(res.json().deudor.estado, "cobrado", "sin tener que marcarlo a mano");
    assert.equal(res.json().deudor.saldada, true);
    assert.ok(res.json().deudor.saldadaEn);

    const resumen = await pedir("GET", "/api/deudores");
    assert.equal(resumen.json().resumen.pendienteCentavos, 0);
  });

  it("deshacer un abono devuelve el saldo y lo saca de cobrado", async () => {
    const antes = await pedir("GET", `/api/deudores/${cobroId}`);
    const abono = antes.json().deudor.abonos[0];

    const res = await pedir("DELETE", `/api/deudores/${cobroId}/abonos/${abono.id}`);

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().deudor.restanteCentavos, abono.centavos);
    assert.equal(res.json().deudor.estado, "pendiente");
  });

  it("marcarlo cobrado a mano da por recuperado todo", async () => {
    const res = await pedir("PATCH", `/api/deudores/${cobroId}`, { estado: "cobrado" });

    assert.equal(res.json().deudor.estado, "cobrado");
    assert.equal(
      res.json().deudor.restanteCentavos,
      0,
      "si no, el saldo seguiría diciendo que falta dinero por entrar",
    );
  });

  it("perdonar una deuda la saca de lo pendiente sin tocar las cifras", async () => {
    const creado = await pedir("POST", "/api/deudores", { deudor: "Persona B", importe: "50000" });
    const id = creado.json().deudor.id;

    const res = await pedir("PATCH", `/api/deudores/${id}`, { estado: "perdonado" });
    assert.equal(res.json().deudor.estado, "perdonado");
    assert.equal(res.json().deudor.restanteCentavos, 5_000_000, "el importe original no se toca");

    const resumen = await pedir("GET", "/api/deudores");
    assert.equal(resumen.json().resumen.pendienteCentavos, 0, "no cuenta como por cobrar");

    const abono = await pedir("POST", `/api/deudores/${id}/abonos`, { importe: "1000" });
    assert.equal(abono.statusCode, 400, "no se abona algo perdonado");
  });
});

describe("cobros por cuotas", () => {
  let app;
  let cookie;
  let cobroId;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;

    const res = await app.inject({
      method: "POST",
      url: "/api/deudores",
      headers: { cookie },
      payload: { deudor: "Persona C", importe: "900000", tipo: "cuotas", cuotas: 3 },
    });
    cobroId = res.json().deudor.id;
  });

  after(async () => {
    await cerrarApp(app);
  });

  const pedir = (method, url, payload) =>
    app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

  it("reparte el total entre las cuotas pactadas", async () => {
    const res = await pedir("GET", `/api/deudores/${cobroId}`);
    const cobro = res.json().deudor;

    assert.equal(cobro.tipo, "cuotas");
    assert.equal(cobro.cuotas, 3);
    assert.equal(cobro.pendientes, 3);
    assert.equal(cobro.cuotaSugeridaCentavos, 30_000_000);
  });

  it("el atajo de cuota registra la cuota completa", async () => {
    const res = await pedir("POST", `/api/deudores/${cobroId}/cuota`);

    assert.equal(res.json().deudor.pagadas, 1);
    assert.equal(res.json().deudor.restanteCentavos, 60_000_000);
    assert.equal(res.json().abono.cuentaCuota, true);
  });

  it("la última cuota cierra el cobro en cero exacto", async () => {
    const creado = await pedir("POST", "/api/deudores", {
      deudor: "Persona D",
      importe: "1000000",
      tipo: "cuotas",
      cuotas: 3,
    });
    const id = creado.json().deudor.id;

    let ultima;
    for (let i = 0; i < 3; i += 1) ultima = await pedir("POST", `/api/deudores/${id}/cuota`);

    assert.equal(ultima.json().deudor.restanteCentavos, 0);
    assert.equal(ultima.json().deudor.estado, "cobrado");
  });
});

describe("cobros que venían de antes", () => {
  let app;
  let cookie;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;

    // Registros con la forma antigua: solo total y estado, sin `kind`.
    await collection("receivables").insertMany([
      createDocument({
        debtor: "Pendiente antiguo",
        amount_cents: 20_000_000,
        currency: "COP",
        day_of_month: null,
        notes: null,
        status: "pendiente",
      }),
      createDocument({
        debtor: "Cobrado antiguo",
        amount_cents: 150_000_000,
        currency: "COP",
        day_of_month: 25,
        notes: "Cobrado",
        status: "cobrado",
      }),
    ]);

    await runMigrations({ log: () => {} });
  });

  after(async () => {
    await cerrarApp(app);
  });

  it("los adapta sin cambiarles las cifras", async () => {
    const res = await app.inject({ method: "GET", url: "/api/deudores", headers: { cookie } });
    const porNombre = Object.fromEntries(res.json().deudores.map((d) => [d.deudor, d]));

    const pendiente = porNombre["Pendiente antiguo"];
    assert.equal(pendiente.tipo, "libre");
    assert.equal(pendiente.centavos, 20_000_000);
    assert.equal(pendiente.restanteCentavos, 20_000_000, "sigue debiéndose entero");
    assert.equal(pendiente.estado, "pendiente");

    const cobrado = porNombre["Cobrado antiguo"];
    assert.equal(cobrado.restanteCentavos, 0, "lo ya cobrado queda en cero");
    assert.equal(cobrado.abonadoCentavos, 150_000_000);
    assert.equal(cobrado.estado, "cobrado");

    assert.equal(res.json().resumen.pendienteCentavos, 20_000_000);
  });

  it("acepta abonos sobre un registro antiguo", async () => {
    const lista = await app.inject({ method: "GET", url: "/api/deudores", headers: { cookie } });
    const pendiente = lista.json().deudores.find((d) => d.deudor === "Pendiente antiguo");

    const res = await app.inject({
      method: "POST",
      url: `/api/deudores/${pendiente.id}/abonos`,
      headers: { cookie },
      payload: { importe: "50000" },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().deudor.restanteCentavos, 15_000_000);
  });
});
