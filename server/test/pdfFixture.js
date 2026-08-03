// Genera un PDF mínimo pero válido, con texto colocado en coordenadas reales.
//
// Sirve para probar el motor de lectura de extractos de verdad —pasa por
// pdf.js igual que un PDF del banco— sin meter en el repositorio un extracto
// auténtico ni añadir una dependencia solo para las pruebas.

function escaparTexto(texto) {
  return texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * `paginas` es un array de páginas; cada página es un array de líneas
 * { texto, x, y } en puntos, con el origen abajo a la izquierda.
 */
export function construirPdf(paginas) {
  const objetos = [];
  const agregar = (contenido) => {
    objetos.push(contenido);
    return objetos.length; // los números de objeto empiezan en 1
  };

  // WinAnsiEncoding para que los acentos escritos en latin1 lleguen enteros,
  // igual que en un extracto de verdad.
  const idFuente = agregar(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );

  const idsPagina = [];
  const idPaginas = objetos.length + 1 + paginas.length * 2; // se reserva sitio

  for (const lineas of paginas) {
    const flujo = [
      "BT",
      "/F1 9 Tf",
      ...lineas.map(
        ({ texto, x, y }) => `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escaparTexto(texto)}) Tj`,
      ),
      "ET",
    ].join("\n");

    const idFlujo = agregar(`<< /Length ${Buffer.byteLength(flujo, "latin1")} >>\nstream\n${flujo}\nendstream`);
    idsPagina.push(
      agregar(
        `<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 612 792] ` +
          `/Resources << /Font << /F1 ${idFuente} 0 R >> >> /Contents ${idFlujo} 0 R >>`,
      ),
    );
  }

  const idArbol = agregar(
    `<< /Type /Pages /Kids [${idsPagina.map((id) => `${id} 0 R`).join(" ")}] /Count ${idsPagina.length} >>`,
  );
  const idCatalogo = agregar(`<< /Type /Catalog /Pages ${idArbol} 0 R >>`);

  // Ensamblado con su tabla de referencias cruzadas.
  let pdf = "%PDF-1.4\n";
  const posiciones = [];

  objetos.forEach((contenido, indice) => {
    posiciones.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${indice + 1} 0 obj\n${contenido}\nendobj\n`;
  });

  const inicioXref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const posicion of posiciones) {
    pdf += `${String(posicion).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root ${idCatalogo} 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

/** Convierte filas de un extracto en líneas colocadas como una tabla. */
export function extractoComoPdf(encabezado, filas) {
  const lineas = [];
  let y = 740;

  for (const texto of encabezado) {
    lineas.push({ texto, x: 50, y });
    y -= 16;
  }

  y -= 10;
  for (const fila of filas) {
    // Tres columnas a distinta altura horizontal, como en un extracto real.
    lineas.push({ texto: fila.fecha, x: 50, y });
    lineas.push({ texto: fila.descripcion, x: 130, y });
    lineas.push({ texto: fila.valor, x: 430, y });
    y -= 14;
  }

  return construirPdf([lineas]);
}

/**
 * Extracto con el diseño de Lulo Bank: número de transacción primero, dos
 * fechas, descripción y valor con signo. Si `descripcion` es null, la fila sale
 * sin descripción y sus trozos van en las líneas de arriba y abajo, que es como
 * el banco parte las descripciones largas de verdad.
 */
export function extractoLuloComoPdf(filas) {
  const lineas = [
    { texto: "Extracto de cuenta", x: 50, y: 750 },
    { texto: "Lulo Bank NIT 901 383 474-9", x: 50, y: 734 },
    { texto: "No. Fecha operación Fecha autorización Descripción Valor", x: 50, y: 712 },
  ];

  let y = 690;

  for (const fila of filas) {
    if (fila.trozoAntes) {
      lineas.push({ texto: fila.trozoAntes, x: 260, y });
      y -= 14;
    }

    lineas.push({ texto: fila.numero, x: 50, y });
    lineas.push({ texto: fila.fecha, x: 130, y });
    lineas.push({ texto: fila.fecha, x: 200, y });
    if (fila.descripcion) lineas.push({ texto: fila.descripcion, x: 260, y });
    lineas.push({ texto: fila.valor, x: 470, y });
    y -= 14;

    if (fila.trozoDespues) {
      lineas.push({ texto: fila.trozoDespues, x: 260, y });
      y -= 14;
    }
  }

  return construirPdf([lineas]);
}
