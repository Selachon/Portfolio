// Recepción local de extractos de muestra.
//
// Herramienta de desarrollo, NO parte del portal: sirve para dejar en esta
// máquina un par de extractos reales con los que afinar los perfiles de banco.
//
// Escucha solo en 127.0.0.1 a propósito. Para llegar desde el móvil o desde
// otro equipo se publica con Tailscale, que cifra el tránsito y solo deja
// entrar a los dispositivos de tu propia red:
//
//   node scripts/recibir-extractos.js
//   tailscale serve --bg --https=8443 localhost:9000
//
// Los archivos caen en extractos-reales/, que está ignorado por git: nunca
// llegan al repositorio.

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { extraerFilas } from "../src/parsers/pdfText.js";

const RAIZ = resolve(dirname(dirname(fileURLToPath(import.meta.url))), "..");
const DESTINO = join(RAIZ, "extractos-reales");
const PUERTO = Number(process.env.PUERTO ?? 9000);
// Por defecto solo localhost. Se puede atar a la IP de Tailscale (100.x.y.z)
// para llegar desde el móvil sin pasar por `tailscale serve`, que exige root;
// esa red ya va cifrada de extremo a extremo y solo la ven tus dispositivos.
const HOST = process.env.HOST ?? "127.0.0.1";
const MAXIMO_BYTES = 25 * 1024 * 1024;
const PDF_MAGIC = Buffer.from("%PDF-");
// Las contraseñas de los PDF cifrados se guardan aquí, junto a los propios
// archivos: en esta máquina y fuera del repositorio. Nunca viajan a ningún sitio.
const CLAVES = join(DESTINO, ".claves.json");

async function leerClaves() {
  try {
    return JSON.parse(await readFile(CLAVES, "utf8"));
  } catch {
    return {};
  }
}

/** ¿Se puede abrir sin contraseña? */
async function necesitaClave(contenido) {
  try {
    await extraerFilas(contenido);
    return false;
  } catch (error) {
    return error?.name === "ErrorContrasenaPdf";
  }
}

/** Quita rutas y caracteres raros: el nombre lo elige quien sube el archivo. */
function nombreSeguro(original) {
  const base = String(original ?? "extracto.pdf")
    .split(/[\\/]/)
    .pop()
    .replace(/[^\w.\- áéíóúüñÁÉÍÓÚÜÑ]/g, "_")
    .slice(0, 120);

  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

const PAGINA = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Enviar extractos · Kora</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:20px;
    background:#131c2b; color:#f4f7fb;
    font-family:"Inter Tight","Segoe UI",system-ui,-apple-system,sans-serif; }
  .caja { width:100%; max-width:460px; background:#1b2738;
    border:1px solid rgba(196,181,253,.14); border-radius:16px; padding:28px; }
  h1 { margin:0 0 4px; font-size:20px; }
  p { color:#7686a0; font-size:13px; margin:0 0 20px; line-height:1.5; }
  label { display:block; font-size:12px; color:#b7c2d4; margin-bottom:6px; }
  input, select { width:100%; box-sizing:border-box; background:#131c2b;
    border:1px solid rgba(196,181,253,.3); border-radius:9px; color:#f4f7fb;
    padding:10px 12px; font-family:inherit; font-size:14px; margin-bottom:14px; }
  button { width:100%; background:#ffb3d9; color:#131c2b; border:none; border-radius:9px;
    padding:12px; font-family:inherit; font-size:15px; font-weight:600; cursor:pointer; }
  button:disabled { opacity:.5; cursor:not-allowed; }
  .aviso { border-radius:10px; padding:11px 14px; font-size:13px; margin-bottom:14px;
    border:1px solid; line-height:1.45; }
  .ok { background:rgba(110,231,183,.09); border-color:rgba(110,231,183,.3); color:#c4f5e2; }
  .mal { background:rgba(253,164,175,.1); border-color:rgba(253,164,175,.35); color:#ffd9de; }
  .lista { font-size:12px; color:#7686a0; margin-top:18px; line-height:1.7; }
  .lista b { color:#b7c2d4; font-weight:500; }
</style>
</head>
<body>
  <form class="caja" method="post" action="/" enctype="multipart/form-data">
    <h1>Enviar extractos</h1>
    <p>Solo PDF, hasta 25 MB. Se guardan en esta máquina; no salen a internet
       ni entran al repositorio.</p>

    <div id="mensaje"></div>

    <label for="banco">¿De qué cuenta es?</label>
    <select id="banco" name="banco">
      <option value="cop">Cuenta en pesos (COP)</option>
      <option value="usd">Cuenta en dólares (USD)</option>
      <option value="otra">Otra</option>
    </select>

    <label for="archivo">Archivo PDF</label>
    <input id="archivo" type="file" name="archivo" accept="application/pdf,.pdf" required>

    <button type="submit">Enviar</button>

    <div class="lista" id="recibidos"></div>
  </form>

<script>
const form = document.querySelector("form");
const mensaje = document.getElementById("mensaje");
const recibidos = document.getElementById("recibidos");

async function listar() {
  const r = await fetch("/recibidos");
  const { archivos } = await r.json();

  if (!archivos.length) {
    recibidos.innerHTML = "<b>Todavía no ha llegado ninguno.</b>";
    return;
  }

  recibidos.innerHTML = "<b>Ya recibidos:</b><br>" + archivos.map((a) => {
    const estado = !a.cifrado ? "" : a.conClave ? " · 🔓 con contraseña" : " · 🔒 cifrado";
    return a.nombre + " · " + a.kb + " kB" + estado;
  }).join("<br>");

  const cifrados = archivos.filter((a) => a.cifrado && !a.conClave);
  if (!cifrados.length) return;

  recibidos.innerHTML += '<div style="margin-top:16px"><b>Estos vienen cifrados. ' +
    'Escribe su contraseña (los bancos suelen usar la cédula):</b></div>' +
    cifrados.map((a, i) =>
      '<div style="margin-top:10px">' + a.nombre +
      '<input type="password" data-archivo="' + encodeURIComponent(a.nombre) +
      '" id="clave' + i + '" placeholder="contraseña" style="margin-top:6px">' +
      '<button type="button" data-clave="' + i + '">Comprobar y guardar</button></div>'
    ).join("");

  for (const boton of recibidos.querySelectorAll("button[data-clave]")) {
    boton.addEventListener("click", async () => {
      const campo = document.getElementById("clave" + boton.dataset.clave);
      boton.disabled = true;
      boton.textContent = "Comprobando…";

      const respuesta = await fetch("/clave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nombre: decodeURIComponent(campo.dataset.archivo),
          clave: campo.value,
        }),
      });

      const cuerpo = await respuesta.json();
      mensaje.innerHTML = '<div class="aviso ' + (respuesta.ok ? "ok" : "mal") + '">' +
        cuerpo.mensaje + "</div>";
      boton.disabled = false;
      boton.textContent = "Comprobar y guardar";
      if (respuesta.ok) listar();
    });
  }
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = form.querySelector("button");
  boton.disabled = true;
  boton.textContent = "Enviando…";
  mensaje.innerHTML = "";

  try {
    const respuesta = await fetch("/", { method: "POST", body: new FormData(form) });
    const cuerpo = await respuesta.json();
    mensaje.innerHTML = '<div class="aviso ' + (respuesta.ok ? "ok" : "mal") + '">' +
      cuerpo.mensaje + "</div>";
    if (respuesta.ok) form.querySelector('input[type=file]').value = "";
  } catch (fallo) {
    mensaje.innerHTML = '<div class="aviso mal">No se pudo enviar: ' + fallo.message + "</div>";
  } finally {
    boton.disabled = false;
    boton.textContent = "Enviar";
    listar();
  }
});

listar();
</script>
</body>
</html>`;

const app = Fastify({ logger: false, bodyLimit: MAXIMO_BYTES });
await app.register(multipart, { limits: { fileSize: MAXIMO_BYTES, files: 1 } });

app.get("/", async (_peticion, respuesta) => {
  respuesta.type("text/html; charset=utf-8");
  return PAGINA;
});

app.get("/recibidos", async () => {
  await mkdir(DESTINO, { recursive: true });
  const nombres = (await readdir(DESTINO)).filter((n) => n.toLowerCase().endsWith(".pdf"));

  const claves = await leerClaves();

  const archivos = await Promise.all(
    nombres.map(async (nombre) => {
      const ruta = join(DESTINO, nombre);
      const cifrado = await necesitaClave(await readFile(ruta));

      return {
        nombre,
        kb: Math.round((await stat(ruta)).size / 1024),
        cifrado,
        conClave: Boolean(claves[nombre]),
      };
    }),
  );

  return { archivos };
});

app.post("/", async (peticion, respuesta) => {
  const archivo = await peticion.file();
  if (!archivo) {
    return respuesta.code(400).send({ mensaje: "No llegó ningún archivo." });
  }

  const contenido = await archivo.toBuffer();

  // Que se llame .pdf no basta: se comprueba la firma del archivo.
  if (!contenido.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return respuesta.code(400).send({ mensaje: "Ese archivo no es un PDF." });
  }

  const banco = archivo.fields?.banco?.value ?? "otra";
  const huella = createHash("sha256").update(contenido).digest("hex").slice(0, 8);
  const nombre = `${banco}-${huella}-${nombreSeguro(archivo.filename)}`;

  await mkdir(DESTINO, { recursive: true });
  await writeFile(join(DESTINO, nombre), contenido);

  console.log(`✓ recibido ${nombre} (${Math.round(contenido.length / 1024)} kB)`);

  return {
    mensaje: `Recibido: ${nombre} (${Math.round(contenido.length / 1024)} kB).`,
    nombre,
  };
});

/** Guarda la contraseña de un PDF, pero solo si de verdad lo abre. */
app.post("/clave", async (peticion, respuesta) => {
  const { nombre, clave } = peticion.body ?? {};

  const nombres = (await readdir(DESTINO)).filter((n) => n.toLowerCase().endsWith(".pdf"));
  if (!nombres.includes(nombre)) {
    return respuesta.code(404).send({ mensaje: "Ese archivo no está aquí." });
  }

  const contenido = await readFile(join(DESTINO, nombre));

  // Solo se guarda si de verdad abre el PDF: así no queda una clave inútil.
  try {
    await extraerFilas(contenido, { contrasena: clave });
  } catch (error) {
    return respuesta.code(400).send({
      mensaje:
        error?.name === "ErrorContrasenaPdf"
          ? "Esa contraseña no abre el PDF."
          : "No se pudo comprobar la contraseña.",
    });
  }

  const claves = await leerClaves();
  claves[nombre] = clave;
  await writeFile(CLAVES, JSON.stringify(claves, null, 2));

  console.log(`✓ contraseña verificada y guardada para ${nombre}`);
  return { mensaje: "Contraseña correcta y guardada. Ya puedo leer ese extracto." };
});

await app.listen({ port: PUERTO, host: HOST });

console.log(`Recepción de extractos en http://${HOST}:${PUERTO}`);
console.log(`Los archivos se guardan en ${DESTINO}`);
console.log(`Con HTTPS y nombre bonito:  tailscale serve --bg --https=8443 localhost:${PUERTO}`);
