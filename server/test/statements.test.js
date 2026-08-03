// Datos inventados, formatos reales: el repositorio es público.
// El PDF se genera aquí mismo y pasa por pdf.js igual que uno del banco.

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, crearApp, crearUsuario, iniciarSesion } from "./helpers.js";
import { construirPdf, extractoComoPdf, extractoLuloComoPdf } from "./pdfFixture.js";
import { leerExtracto } from "../src/parsers/index.js";

const FILAS = [
  { fecha: "01 feb. 2026", descripcion: "Abono intereses mes anterior", valor: "38.09" },
  { fecha: "01 feb. 2026", descripcion: "Compra no presencial nacional", valor: "-35,700.00" },
  { fecha: "02 feb. 2026", descripcion: "Transferencia Bre-B", valor: "200,000.00" },
  { fecha: "03 feb. 2026", descripcion: "Pago PSE Vanti", valor: "-9,290.00" },
  { fecha: "04 feb. 2026", descripcion: "Depósito ACH", valor: "5,051,855.00" },
];

const SUMA_ESPERADA = 3809 - 3_570_000 + 20_000_000 - 929_000 + 505_185_500;

// `marca` cambia el contenido —y por tanto el sha256— para poder subir varios
// extractos distintos en las pruebas sin chocar con el control de duplicados.
function pdfDeEjemplo(filas = FILAS, marca = "") {
  return extractoComoPdf(
    [
      "BANCO DE EJEMPLO S.A.",
      `Extracto de cuenta de ahorros ${marca}`.trim(),
      "Fecha operación  Descripción  Valor",
    ],
    filas,
  );
}

describe("lectura de extractos en PDF", () => {
  it("reconstruye las filas de la tabla con su fecha e importe", async () => {
    const lectura = await leerExtracto(pdfDeEjemplo(), { anio: 2026, mes: 2, moneda: "COP" });

    assert.equal(lectura.filas.length, 5);
    assert.equal(lectura.perfil.id, "generico-tabular");
    assert.equal(lectura.sinReconocer.length, 0);

    assert.deepEqual(
      lectura.filas.map((f) => f.occurredOn),
      ["2026-02-01", "2026-02-01", "2026-02-02", "2026-02-03", "2026-02-04"],
    );
    assert.equal(
      lectura.filas.reduce((suma, f) => suma + f.amountCents, 0),
      SUMA_ESPERADA,
    );
  });

  it("ignora encabezados, pies y filas de totales", async () => {
    const pdf = extractoComoPdf(
      ["BANCO DE EJEMPLO S.A.", "Página 1 de 2", "Saldo inicial 1,000,000.00"],
      [...FILAS, { fecha: "", descripcion: "Suma total", valor: "5,206,203.09" }],
    );

    const lectura = await leerExtracto(pdf, { anio: 2026, mes: 2, moneda: "COP" });
    assert.equal(lectura.filas.length, 5, "la fila de totales no es un movimiento");
  });

  it("avisa cuando las fechas caen fuera del mes que se declaró", async () => {
    const lectura = await leerExtracto(pdfDeEjemplo(), { anio: 2026, mes: 5, moneda: "COP" });

    assert.ok(
      lectura.avisos.some((aviso) => aviso.includes("fuera de")),
      "debería avisar de que el extracto no es de ese mes",
    );
  });

  it("avisa cuando todo sale con el mismo signo, que suele ser un error de lectura", async () => {
    const soloGastos = Array.from({ length: 6 }, (_, i) => ({
      fecha: `0${i + 1} feb. 2026`,
      descripcion: "Compra presencial nacional",
      valor: "-10,000.00",
    }));

    const lectura = await leerExtracto(pdfDeEjemplo(soloGastos), { anio: 2026, mes: 2, moneda: "COP" });
    assert.ok(lectura.avisos.some((aviso) => aviso.includes("mismo signo")));
  });

  it("no se inventa nada con un PDF sin tabla", async () => {
    const pdf = construirPdf([[{ texto: "Este documento no contiene movimientos.", x: 50, y: 700 }]]);
    const lectura = await leerExtracto(pdf, { anio: 2026, mes: 2, moneda: "COP" });

    assert.equal(lectura.filas.length, 0);
    assert.ok(lectura.avisos.some((aviso) => aviso.includes("escaneado")));
  });
});

// Lo que se aprendió de extractos reales: el banco pone el número de
// transacción antes de la fecha y parte las descripciones largas en varias
// líneas. Los datos son inventados; el diseño de la página, no.
describe("extractos con el número de transacción delante", () => {
  const FILAS_BANCO = [
    { numero: "135934138", fecha: "01 jun. 2026", descripcion: "Abono intereses mes anterior", valor: "+ 29.81" },
    { numero: "136612569", fecha: "01 jun. 2026", descripcion: "Transferencia Bre-B", valor: "+ 50,000.00" },
    { numero: "610695", fecha: "01 jun. 2026", descripcion: "Compra presencial nacional", valor: "- 19,800.00" },
    { numero: "202606048300998478", fecha: "04 jun. 2026", descripcion: "Depósito ACH", valor: "+ 5,052,764.00" },
  ];

  it("lee la fecha de operación, la descripción y el valor con su signo", async () => {
    const lectura = await leerExtracto(extractoLuloComoPdf(FILAS_BANCO), {
      anio: 2026,
      mes: 6,
      moneda: "COP",
    });

    assert.equal(lectura.perfil.id, "cop-lulo");
    assert.equal(lectura.filas.length, 4);
    assert.equal(lectura.sinReconocer.length, 0);

    assert.deepEqual(lectura.filas.map((f) => f.amountCents), [2981, 5_000_000, -1_980_000, 505_276_400]);
    assert.equal(lectura.filas[3].description, "Depósito ACH");
    assert.equal(
      lectura.filas[0].occurredOn,
      "2026-06-01",
      "el número de transacción no puede confundirse con la fecha",
    );
  });

  it("recompone las descripciones que el banco parte en varias líneas", async () => {
    // El banco deja el principio arriba y el final abajo, y la fila queda sin
    // descripción propia. Sin recomponerlo, estos movimientos se perdían.
    const lectura = await leerExtracto(
      extractoLuloComoPdf([
        ...FILAS_BANCO,
        {
          numero: "557694",
          fecha: "05 jun. 2026",
          descripcion: null,
          valor: "+ 13,621.00",
          trozoAntes: "Ajuste compra no presencial",
          trozoDespues: "nacional",
        },
      ]),
      { anio: 2026, mes: 6, moneda: "COP" },
    );

    assert.equal(lectura.filas.length, 5, "la fila sin descripción también cuenta");

    const recompuesta = lectura.filas.find((f) => f.amountCents === 1_362_100);
    assert.equal(recompuesta.description, "Ajuste compra no presencial nacional");
    assert.ok(recompuesta.avisos.some((aviso) => aviso.includes("recompuso")));
  });

  it("no reutiliza el mismo trozo de descripción en dos movimientos", async () => {
    const lectura = await leerExtracto(
      extractoLuloComoPdf([
        {
          numero: "593227",
          fecha: "29 jul. 2026",
          descripcion: null,
          valor: "- 3,219.00",
          trozoAntes: "Compra no presencial",
          trozoDespues: "internacional",
        },
        { numero: "593227", fecha: "29 jul. 2026", descripcion: null, valor: "+ 3,219.00" },
      ]),
      { anio: 2026, mes: 7, moneda: "COP" },
    );

    const gasto = lectura.filas.find((f) => f.amountCents < 0);
    const abono = lectura.filas.find((f) => f.amountCents > 0);

    assert.equal(gasto.description, "Compra no presencial internacional");
    assert.equal(
      abono.description,
      "(sin descripción)",
      "antes se le colgaba el trozo del movimiento de al lado",
    );
  });

  it("cae al perfil genérico si el banco cambia la maquetación", async () => {
    // Mismo banco (lo dicen las descripciones) pero con la fecha al principio:
    // el perfil acierta el nombre y no lee ni una fila, así que hay que avisar.
    const lectura = await leerExtracto(
      extractoComoPdf(
        ["Lulo Bank NIT 901 383 474-9"],
        [{ fecha: "01 jun. 2026", descripcion: "Transferencia Bre-B", valor: "50,000.00" }],
      ),
      { anio: 2026, mes: 6, moneda: "COP" },
    );

    assert.equal(lectura.filas.length, 1);
    assert.equal(lectura.perfil.id, "generico-tabular");
    assert.ok(lectura.avisos.some((aviso) => aviso.includes("perfil genérico")));
  });
});

describe("subida y confirmación de extractos", () => {
  let app;
  let cookie;
  let cuentaId;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    cookie = (await iniciarSesion(app, "duena@kora.test")).cookie;

    const cuenta = await app.inject({
      method: "POST",
      url: "/api/cuentas",
      headers: { cookie },
      payload: { nombre: "Cuenta principal", tipo: "banco", moneda: "COP" },
    });
    cuentaId = cuenta.json().cuenta.id;
  });

  after(async () => {
    await cerrarApp(app);
  });

  /** Arma un cuerpo multipart a mano, que es como llega desde el navegador. */
  function multipart(campos, archivo) {
    const limite = "----kora-prueba";
    const partes = [];

    for (const [nombre, valor] of Object.entries(campos)) {
      partes.push(
        Buffer.from(
          `--${limite}\r\nContent-Disposition: form-data; name="${nombre}"\r\n\r\n${valor}\r\n`,
        ),
      );
    }

    partes.push(
      Buffer.from(
        `--${limite}\r\nContent-Disposition: form-data; name="archivo"; filename="${archivo.nombre}"\r\n` +
          `Content-Type: ${archivo.tipo}\r\n\r\n`,
      ),
      archivo.contenido,
      Buffer.from(`\r\n--${limite}--\r\n`),
    );

    return {
      payload: Buffer.concat(partes),
      headers: { cookie, "content-type": `multipart/form-data; boundary=${limite}` },
    };
  }

  function subir(contenido, { nombre = "extracto.pdf", tipo = "application/pdf", anio = 2026, mes = 2 } = {}) {
    const { payload, headers } = multipart(
      { cuentaId, anio: String(anio), mes: String(mes) },
      { nombre, tipo, contenido },
    );
    return app.inject({ method: "POST", url: "/api/extractos", headers, payload });
  }

  it("sube el PDF y devuelve las filas para revisar, sin registrar nada todavía", async () => {
    const res = await subir(pdfDeEjemplo());

    assert.equal(res.statusCode, 200);
    const cuerpo = res.json();

    assert.equal(cuerpo.resumen.nuevos, 5);
    assert.equal(cuerpo.resumen.duplicados, 0);
    assert.equal(cuerpo.resumen.sumaCentavos, SUMA_ESPERADA);
    assert.equal(cuerpo.perfil.id, "generico-tabular");

    const movimientos = await app.inject({
      method: "GET",
      url: "/api/movimientos",
      headers: { cookie },
    });
    assert.equal(movimientos.json().total, 0, "subir no puede registrar movimientos");
  });

  it("clasifica los candidatos con las reglas antes de mostrarlos", async () => {
    await app.inject({
      method: "POST",
      url: "/api/reglas",
      headers: { cookie },
      payload: { patron: "pago pse vanti", categoria: "Servicios · gas", prioridad: 40 },
    });

    const res = await subir(pdfDeEjemplo([FILAS[3]]));
    const fila = res.json().filas[0];

    assert.equal(fila.candidato.category, "Servicios · gas");
  });

  it("rechaza un archivo que no sea PDF aunque se llame .pdf", async () => {
    const res = await subir(Buffer.from("PK esto es un zip"), { nombre: "trampa.pdf" });

    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.mensaje, /no es un PDF/);
  });

  it("no deja subir dos veces el mismo PDF a la misma cuenta", async () => {
    const pdf = pdfDeEjemplo([FILAS[0]]);
    const primera = await subir(pdf, { mes: 3 });
    assert.equal(primera.statusCode, 200);

    const segunda = await subir(pdf, { mes: 3 });
    assert.equal(segunda.statusCode, 409);
    assert.match(segunda.json().error.mensaje, /ya se subió/);
  });

  it("registra los movimientos solo al confirmar, y los deja atados al extracto", async () => {
    const subida = await subir(pdfDeEjemplo(FILAS, "abril"), { mes: 4 });
    const { extractoId, filas } = subida.json();

    const confirmacion = await app.inject({
      method: "POST",
      url: `/api/extractos/${extractoId}/confirmar`,
      headers: { cookie },
      payload: {
        movimientos: filas.map((fila) => ({
          fecha: fila.candidato.occurredOn,
          descripcion: fila.candidato.description,
          centavos: fila.candidato.amountCents,
          categoria: fila.candidato.category,
        })),
      },
    });

    assert.equal(confirmacion.statusCode, 200);
    assert.equal(confirmacion.json().insertados, 5);

    const movimientos = await app.inject({
      method: "GET",
      url: `/api/movimientos?extracto=${extractoId}`,
      headers: { cookie },
    });

    assert.equal(movimientos.json().total, 5);
    assert.ok(movimientos.json().movimientos.every((m) => m.origen === "pdf"));
    assert.equal(
      movimientos.json().movimientos.reduce((suma, m) => suma + m.centavos, 0),
      SUMA_ESPERADA,
      "lo registrado suma exactamente lo que decía el extracto",
    );
  });

  it("guarda el PDF original y lo devuelve tal cual", async () => {
    const lista = await app.inject({ method: "GET", url: "/api/extractos", headers: { cookie } });
    const extracto = lista.json().extractos[0];

    const descarga = await app.inject({
      method: "GET",
      url: `/api/extractos/${extracto.id}/archivo`,
      headers: { cookie },
    });

    assert.equal(descarga.statusCode, 200);
    assert.equal(descarga.headers["content-type"], "application/pdf");
    assert.ok(descarga.rawPayload.subarray(0, 5).equals(Buffer.from("%PDF-")));
  });

  it("borrar el extracto no borra la contabilidad del mes", async () => {
    const lista = await app.inject({ method: "GET", url: "/api/extractos", headers: { cookie } });
    const conMovimientos = lista.json().extractos.find((e) => e.movimientos === 5);

    const antes = await app.inject({ method: "GET", url: "/api/movimientos", headers: { cookie } });

    const borrado = await app.inject({
      method: "DELETE",
      url: `/api/extractos/${conMovimientos.id}`,
      headers: { cookie },
    });
    assert.equal(borrado.statusCode, 200);

    const despues = await app.inject({ method: "GET", url: "/api/movimientos", headers: { cookie } });
    assert.equal(despues.json().total, antes.json().total, "los movimientos sobreviven al adjunto");
  });
});
