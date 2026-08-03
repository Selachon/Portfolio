// Los datos de estas pruebas son inventados a propósito: el repositorio es
// público. Lo que sí es real es el FORMATO —el que sueltan los extractos y la
// hoja— porque es justo donde se rompen los importadores.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, crearApp, crearUsuario, iniciarSesion } from "./helpers.js";
import { sembrarReglasIniciales } from "../src/db/seed.js";

const EXTRACTO_PEGADO = `
| Fecha | Descripcion | Valor | a |
| :-: | :-: | :-: | :-: |
| 01 feb. 2026 | Abono intereses mes anterior | 38.09 | Ingreso |
| 01 feb. 2026 | Compra no presencial nacional | \\-35,700.00 | Gasto |
| 01 feb. 2026 | Transferencia Bre-B | 200,000.00 | Ingreso |
| 02 feb. 2026 | Pago PSE Vanti | \\-9,290.00 | Gasto |
| 03 feb. 2026 | Compra presencial nacional | \\-198,000.00 | Gasto |
| 04 feb. 2026 | Depósito ACH | 5,051,855.00 | Ingreso |
| 05 feb. 2026 | Transferencia bolsillo | \\-1,600,000.00 | Gasto |
| Suma total | | \\-9,501,529.78 | |
`.trim();

describe("cuentas y movimientos", () => {
  let app;
  let cookie;
  let cuentaId;

  before(async () => {
    app = await crearApp();
    await sembrarReglasIniciales({ log: () => {} });
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;

    const res = await app.inject({
      method: "POST",
      url: "/api/cuentas",
      headers: { cookie },
      payload: { nombre: "Cuenta principal", tipo: "banco", moneda: "COP" },
    });
    cuentaId = res.json().cuenta.id;
  });

  after(async () => {
    await cerrarApp(app);
  });

  it("registra un movimiento manual y lo clasifica solo", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/movimientos",
      headers: { cookie },
      payload: {
        cuentaId,
        fecha: "11 feb. 2026",
        descripcion: "Pago PSE Eaab",
        importe: "-130,200.00",
      },
    });

    assert.equal(res.statusCode, 200);
    const movimiento = res.json().movimiento;
    assert.equal(movimiento.fecha, "2026-02-11");
    assert.equal(movimiento.centavos, -13_020_000);
    assert.equal(movimiento.sentido, "gasto");
    assert.equal(movimiento.categoria, "Servicios · agua", "la regla debería haberlo clasificado");
  });

  it("rechaza importes y fechas que no se entienden en vez de inventarlos", async () => {
    for (const payload of [
      { cuentaId, fecha: "31 feb. 2026", descripcion: "Fecha imposible", importe: "-1000" },
      { cuentaId, fecha: "01 feb. 2026", descripcion: "Sin importe", importe: "no es un número" },
      { cuentaId, fecha: "01 feb. 2026", descripcion: "Importe cero", importe: "0" },
      { cuentaId, fecha: "01 feb. 2026", descripcion: "", importe: "-1000" },
    ]) {
      const res = await app.inject({ method: "POST", url: "/api/movimientos", headers: { cookie }, payload });
      assert.equal(res.statusCode, 400, `debería rechazar: ${JSON.stringify(payload)}`);
    }
  });

  it("no deja mezclar una cuenta con una moneda que no es la suya", async () => {
    const enDolares = await app.inject({
      method: "POST",
      url: "/api/cuentas",
      headers: { cookie },
      payload: { nombre: "Cuenta en dólares", tipo: "cripto", moneda: "USD" },
    });
    assert.equal(enDolares.json().cuenta.moneda, "USD");

    const lista = await app.inject({ method: "GET", url: "/api/cuentas", headers: { cookie } });
    const monedas = lista.json().cuentas.map((c) => c.moneda);
    assert.deepEqual([...new Set(monedas)].sort(), ["COP", "USD"]);
  });

  describe("importar pegando una tabla", () => {
    it("revisa antes de escribir, y no escribe nada al revisar", async () => {
      const revision = await app.inject({
        method: "POST",
        url: "/api/movimientos/importar/revisar",
        headers: { cookie },
        payload: { cuentaId, contenido: EXTRACTO_PEGADO },
      });

      assert.equal(revision.statusCode, 200);
      const cuerpo = revision.json();

      assert.equal(cuerpo.resumen.nuevos, 7, "siete movimientos; la fila de totales no cuenta");
      assert.equal(cuerpo.resumen.duplicados, 0);
      assert.ok(
        cuerpo.avisos.some((aviso) => aviso.includes("ignoraron")),
        "debería avisar de la fila de totales descartada",
      );

      const antes = await app.inject({
        method: "GET",
        url: `/api/movimientos?cuenta=${cuentaId}`,
        headers: { cookie },
      });
      assert.equal(antes.json().total, 1, "revisar no puede haber insertado nada");
    });

    it("respeta el signo y la columna de sentido", async () => {
      const revision = await app.inject({
        method: "POST",
        url: "/api/movimientos/importar/revisar",
        headers: { cookie },
        payload: { cuentaId, contenido: EXTRACTO_PEGADO },
      });

      const filas = revision.json().filas;
      const deposito = filas.find((f) => f.candidato.description.includes("Depósito ACH"));
      const compra = filas.find((f) => f.candidato.description.includes("Compra no presencial"));

      assert.equal(deposito.candidato.amountCents, 505_185_500);
      assert.equal(deposito.candidato.direction, "ingreso");
      assert.equal(compra.candidato.amountCents, -3_570_000);
      assert.equal(compra.candidato.direction, "gasto");
    });

    it("confirma el lote y suma exactamente lo mismo que la tabla", async () => {
      const revision = await app.inject({
        method: "POST",
        url: "/api/movimientos/importar/revisar",
        headers: { cookie },
        payload: { cuentaId, contenido: EXTRACTO_PEGADO },
      });

      const movimientos = revision.json().filas.map((fila) => ({
        fecha: fila.candidato.occurredOn,
        descripcion: fila.candidato.description,
        centavos: fila.candidato.amountCents,
        categoria: fila.candidato.category,
      }));

      const confirmacion = await app.inject({
        method: "POST",
        url: "/api/movimientos/importar/confirmar",
        headers: { cookie },
        payload: { cuentaId, movimientos },
      });

      assert.equal(confirmacion.statusCode, 200);
      assert.equal(confirmacion.json().insertados, 7);

      // La suma de lo importado tiene que coincidir al centavo con la tabla.
      const esperado = 3809 - 3_570_000 + 20_000_000 - 929_000 - 19_800_000 + 505_185_500 - 160_000_000;
      const consulta = await app.inject({
        method: "GET",
        url: `/api/movimientos?cuenta=${cuentaId}&limite=500`,
        headers: { cookie },
      });

      const totalImportado = consulta
        .json()
        .movimientos.filter((m) => m.origen === "csv")
        .reduce((suma, m) => suma + m.centavos, 0);

      assert.equal(totalImportado, esperado);
    });

    it("detecta el lote repetido y no lo duplica", async () => {
      const revision = await app.inject({
        method: "POST",
        url: "/api/movimientos/importar/revisar",
        headers: { cookie },
        payload: { cuentaId, contenido: EXTRACTO_PEGADO },
      });

      assert.equal(revision.json().resumen.duplicados, 7, "ya se importaron una vez");
      assert.equal(revision.json().resumen.nuevos, 0);

      const movimientos = revision.json().filas.map((fila) => ({
        fecha: fila.candidato.occurredOn,
        descripcion: fila.candidato.description,
        centavos: fila.candidato.amountCents,
      }));

      const confirmacion = await app.inject({
        method: "POST",
        url: "/api/movimientos/importar/confirmar",
        headers: { cookie },
        payload: { cuentaId, movimientos },
      });

      assert.equal(confirmacion.json().insertados, 0);
      assert.equal(confirmacion.json().omitidos, 7);
    });

    it("permite forzar un duplicado legítimo, que también existe", async () => {
      const confirmacion = await app.inject({
        method: "POST",
        url: "/api/movimientos/importar/confirmar",
        headers: { cookie },
        payload: {
          cuentaId,
          duplicados: "insertar",
          movimientos: [
            { fecha: "2026-02-01", descripcion: "Transferencia Bre-B", centavos: 20_000_000 },
          ],
        },
      });

      assert.equal(confirmacion.json().insertados, 1);
    });
  });

  it("exporta a CSV lo mismo que muestra en pantalla", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/movimientos/export.csv?cuenta=${cuentaId}`,
      headers: { cookie },
    });

    assert.equal(res.statusCode, 200);
    assert.match(res.headers["content-type"], /text\/csv/);

    const lineas = res.body.trim().split("\n");
    assert.match(lineas[0], /Fecha,Cuenta,Descripcion,Valor/);
    assert.ok(res.body.includes("-35700.00"), "los importes salen con punto decimal");
  });

  it("solo el propietario borra movimientos", async () => {
    await crearUsuario({ email: "asesor@kora.test", role: "advisor" });
    const cookieAsesor = (await iniciarSesion(app, "asesor@kora.test")).cookie;

    const lista = await app.inject({
      method: "GET",
      url: `/api/movimientos?cuenta=${cuentaId}&limite=1`,
      headers: { cookie },
    });
    const id = lista.json().movimientos[0].id;

    const comoAsesor = await app.inject({
      method: "DELETE",
      url: `/api/movimientos/${id}`,
      headers: { cookie: cookieAsesor },
    });
    assert.equal(comoAsesor.statusCode, 403);

    // Pero el asesor sí puede corregir: ese es su trabajo.
    const correccion = await app.inject({
      method: "PATCH",
      url: `/api/movimientos/${id}`,
      headers: { cookie: cookieAsesor },
      payload: { categoria: "Revisado por el asesor" },
    });
    assert.equal(correccion.statusCode, 200);
    assert.equal(correccion.json().movimiento.categoria, "Revisado por el asesor");

    const comoDuena = await app.inject({
      method: "DELETE",
      url: `/api/movimientos/${id}`,
      headers: { cookie },
    });
    assert.equal(comoDuena.statusCode, 200);
  });

  it("no deja borrar una cuenta con historial", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/cuentas/${cuentaId}`,
      headers: { cookie },
    });

    assert.equal(res.statusCode, 409);
    assert.match(res.json().error.mensaje, /Desactívala/);
  });
});
