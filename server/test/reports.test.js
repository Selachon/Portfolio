// Datos inventados, formatos reales: el repositorio es público.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, crearApp, crearUsuario, iniciarSesion } from "./helpers.js";

describe("reporte mensual", () => {
  let app;
  let cookie;
  let cuentaId;

  // Un mes pequeño pero con las dos direcciones y varias categorías.
  const MOVIMIENTOS = [
    { fecha: "2026-02-01", descripcion: "Depósito ACH", centavos: 500_000_000, categoria: "Nómina y depósitos" },
    { fecha: "2026-02-04", descripcion: "Abono intereses mes anterior", centavos: 3809, categoria: "Rendimientos" },
    { fecha: "2026-02-05", descripcion: "Compra presencial nacional", centavos: -19_800_000, categoria: "Compras nacionales" },
    { fecha: "2026-02-06", descripcion: "Compra presencial nacional", centavos: -10_420_000, categoria: "Compras nacionales" },
    { fecha: "2026-02-11", descripcion: "Pago PSE Eaab", centavos: -13_020_000, categoria: "Servicios · agua" },
    { fecha: "2026-02-13", descripcion: "Arriendo", centavos: -250_000_000, categoria: "Vivienda" },
  ];

  const INGRESOS = 500_000_000 + 3809;
  const GASTOS = -19_800_000 - 10_420_000 - 13_020_000 - 250_000_000;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    await crearUsuario({ email: "asesor@kora.test", role: "advisor" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;

    const cuenta = await app.inject({
      method: "POST",
      url: "/api/cuentas",
      headers: { cookie },
      payload: { nombre: "Cuenta principal", tipo: "banco", moneda: "COP" },
    });
    cuentaId = cuenta.json().cuenta.id;

    await app.inject({
      method: "POST",
      url: "/api/movimientos/importar/confirmar",
      headers: { cookie },
      payload: { cuentaId, movimientos: MOVIMIENTOS },
    });
  });

  after(async () => {
    await cerrarApp(app);
  });

  it("calcula el mismo cierre que se hace a mano en la hoja", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/reportes/2026/2?moneda=COP",
      headers: { cookie },
    });

    assert.equal(res.statusCode, 200);
    const { totales } = res.json();

    assert.equal(totales.ingresosCentavos, INGRESOS);
    assert.equal(totales.gastosCentavos, GASTOS);
    assert.equal(totales.totalCentavos, INGRESOS + GASTOS);
    assert.equal(totales.periodo.dias, 28, "febrero de 2026 tiene 28 días");
    assert.equal(
      totales.promedioDiarioCentavos,
      Math.round((INGRESOS + GASTOS) / 28),
      "el promedio diario libre es el total entre los días del mes",
    );
    assert.equal(totales.movimientos, MOVIMIENTOS.length);
  });

  it("agrupa por categoría como el pivot, de mayor a menor peso", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/reportes/2026/2?moneda=COP",
      headers: { cookie },
    });
    const { totales } = res.json();

    assert.equal(totales.gastos[0].categoria, "Vivienda", "el gasto más grande va primero");
    assert.equal(totales.ingresos[0].categoria, "Nómina y depósitos");

    const compras = totales.gastos.find((f) => f.categoria === "Compras nacionales");
    assert.equal(compras.centavos, -30_220_000, "las dos compras se suman en una línea");
    assert.equal(compras.movimientos, 2);

    // Las sumas de las líneas tienen que dar el total, sin decimales perdidos.
    assert.equal(
      totales.gastos.reduce((s, f) => s + f.centavos, 0),
      totales.gastosCentavos,
    );
  });

  it("no mezcla monedas", async () => {
    const enDolares = await app.inject({
      method: "GET",
      url: "/api/reportes/2026/2?moneda=USD",
      headers: { cookie },
    });

    assert.equal(enDolares.json().totales.movimientos, 0, "los pesos no aparecen en el reporte en dólares");
  });

  it("cierra el mes y congela las cifras", async () => {
    const cierre = await app.inject({
      method: "POST",
      url: "/api/reportes/2026/2/cerrar?moneda=COP",
      headers: { cookie },
      payload: { notas: "Mes revisado con Camilo." },
    });

    assert.equal(cierre.statusCode, 200);
    assert.equal(cierre.json().reporte.estado, "cerrado");
    assert.equal(cierre.json().reporte.totalesCongelados.totalCentavos, INGRESOS + GASTOS);

    const repetido = await app.inject({
      method: "POST",
      url: "/api/reportes/2026/2/cerrar?moneda=COP",
      headers: { cookie },
    });
    assert.equal(repetido.statusCode, 409, "no se cierra dos veces");
  });

  it("avisa si el mes cerrado cambia después, sin tocar la foto firmada", async () => {
    await app.inject({
      method: "POST",
      url: "/api/movimientos",
      headers: { cookie },
      payload: { cuentaId, fecha: "2026-02-20", descripcion: "Gasto olvidado", importe: "-50000" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/reportes/2026/2?moneda=COP",
      headers: { cookie },
    });
    const cuerpo = res.json();

    assert.ok(cuerpo.descuadre, "debería avisar del cambio posterior al cierre");
    assert.equal(cuerpo.descuadre.congelado.totalCentavos, INGRESOS + GASTOS);
    assert.equal(cuerpo.descuadre.actual.totalCentavos, INGRESOS + GASTOS - 5_000_000);
    assert.equal(
      cuerpo.reporte.totalesCongelados.totalCentavos,
      INGRESOS + GASTOS,
      "la foto firmada no se toca",
    );
  });

  it("no deja escribir notas en un mes cerrado", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/reportes/2026/2/notas?moneda=COP",
      headers: { cookie },
      payload: { notas: "Cambio a destiempo" },
    });
    assert.equal(res.statusCode, 409);
  });

  it("solo el propietario reabre un mes cerrado", async () => {
    const cookieAsesor = (await iniciarSesion(app, "asesor@kora.test")).cookie;

    const comoAsesor = await app.inject({
      method: "POST",
      url: "/api/reportes/2026/2/reabrir?moneda=COP",
      headers: { cookie: cookieAsesor },
    });
    assert.equal(comoAsesor.statusCode, 403);

    const comoDuena = await app.inject({
      method: "POST",
      url: "/api/reportes/2026/2/reabrir?moneda=COP",
      headers: { cookie },
    });
    assert.equal(comoDuena.statusCode, 200);
    assert.equal(comoDuena.json().reporte.estado, "borrador");
  });

  it("no cierra un mes vacío", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/reportes/2026/9/cerrar?moneda=COP",
      headers: { cookie },
    });
    assert.equal(res.statusCode, 400);
  });

  it("exporta el reporte con la misma estructura de la hoja", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/reportes/2026/2/export.csv?moneda=COP",
      headers: { cookie },
    });

    assert.equal(res.statusCode, 200);
    assert.match(res.body, /GASTOS,Valor,Movimientos/);
    assert.match(res.body, /INGRESOS,Valor,Movimientos/);
    assert.match(res.body, /PROMEDIO DIARIO LIBRE/);
  });
});
