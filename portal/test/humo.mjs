// Prueba de humo del portal: abre todas las pantallas en un navegador de
// verdad y falla si alguna lanza una excepción o escribe un error en consola.
//
// Existe porque hubo un fallo que ni el linter ni el compilador vieron: un
// componente usado en JSX pero nunca importado. ESLint no resuelve las
// etiquetas JSX como referencias a variables y el empaquetador tampoco, así que
// el error solo aparecía al abrir la página. Esto lo abre.
//
// Uso:
//   node test/humo.mjs [http://localhost:8790] [correo] [contraseña]

import { spawn } from "node:child_process";

const CHROME =
  process.env.CHROME ??
  "/home/dev/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";

const BASE = process.argv[2] ?? "http://localhost:8790";
const CORREO = process.argv[3] ?? "vista@kora.test";
const CLAVE = process.argv[4] ?? "vista-definitiva-2026";

const RUTAS = [
  "/",
  "/analitica",
  "/movimientos",
  "/importar",
  "/reportes",
  "/presupuesto",
  "/deudas",
  "/ajustes",
];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Sesión por la API: aquí se prueban las pantallas, no el formulario de entrada.
const login = await fetch(`${BASE}/api/sesion/entrar`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ correo: CORREO, contrasena: CLAVE }),
});

if (!login.ok) {
  console.error(`✗ no se pudo iniciar sesión en ${BASE} (${login.status})`);
  process.exit(1);
}

const cookie = login.headers
  .getSetCookie()
  .find((c) => c.startsWith("kora_sesion="))
  .split(";")[0]
  .split("=")[1];

const puerto = 9351;
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${puerto}`,
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

await esperar(2500);

const objetivos = await (await fetch(`http://localhost:${puerto}/json/list`)).json();
const ws = new WebSocket(objetivos.find((o) => o.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let problemas = [];
let id = 0;
const pendientes = new Map();

ws.onmessage = (evento) => {
  const m = JSON.parse(evento.data);

  if (m.id && pendientes.has(m.id)) {
    pendientes.get(m.id)(m.result);
    pendientes.delete(m.id);
    return;
  }

  if (m.method === "Runtime.exceptionThrown") {
    const detalle = m.params.exceptionDetails;
    problemas.push(
      `excepción: ${detalle.exception?.description?.split("\n")[0] ?? detalle.text}`,
    );
  }

  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    const texto = m.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
    problemas.push(`consola: ${texto.split("\n")[0].slice(0, 200)}`);
  }
};

const enviar = (method, params = {}) =>
  new Promise((r) => {
    const propio = ++id;
    pendientes.set(propio, r);
    ws.send(JSON.stringify({ id: propio, method, params }));
  });

await enviar("Page.enable");
await enviar("Runtime.enable");
await enviar("Network.enable");
await enviar("Network.setCookie", {
  name: "kora_sesion",
  value: cookie,
  domain: new URL(BASE).hostname,
  path: "/",
  httpOnly: true,
});

let fallaron = 0;

for (const ruta of RUTAS) {
  problemas = [];
  await enviar("Page.navigate", { url: BASE + ruta });
  await esperar(3000);

  // Si la pantalla reventó, React deja el contenedor vacío.
  const { result } = await enviar("Runtime.evaluate", {
    expression: "document.querySelector('#root')?.innerText?.trim().length ?? 0",
    returnByValue: true,
  });

  const vacia = (result?.value ?? 0) < 40;
  if (vacia) problemas.push("la pantalla quedó en blanco");

  // Del logotipo hay dos versiones (una por tema) y solo una puede verse: si se
  // cuelan las dos, el CSS que oculta la otra dejó de ganar.
  const { result: logos } = await enviar("Runtime.evaluate", {
    expression: `[...document.querySelectorAll('img[alt="Kora"]')]
      .filter((i) => getComputedStyle(i).display !== "none").length`,
    returnByValue: true,
  });

  if ((logos?.value ?? 1) !== 1) {
    problemas.push(`se ven ${logos.value} logotipos a la vez; debería verse uno`);
  }

  if (problemas.length === 0) {
    console.log(`✓ ${ruta}`);
  } else {
    fallaron += 1;
    console.log(`✗ ${ruta}`);
    for (const problema of problemas) console.log(`    ${problema}`);
  }
}

ws.close();
chrome.kill();

if (fallaron > 0) {
  console.log(`\n${fallaron} pantalla(s) con problemas.`);
  process.exit(1);
}

console.log(`\n${RUTAS.length} pantallas abiertas sin errores.`);
