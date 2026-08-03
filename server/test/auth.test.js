import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, collection, crearApp, crearUsuario, iniciarSesion } from "./helpers.js";

describe("acceso al portal", () => {
  let app;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner" });
    await crearUsuario({ email: "asesor@kora.test", role: "advisor" });
  });

  after(async () => {
    await cerrarApp(app);
  });

  it("deja pasar el estado de salud sin sesión", async () => {
    const res = await app.inject({ method: "GET", url: "/api/salud" });
    assert.equal(res.statusCode, 200);
  });

  it("cierra cualquier ruta de la API sin sesión", async () => {
    for (const url of ["/api/yo", "/api/movimientos", "/api/cuentas", "/api/usuarios"]) {
      const res = await app.inject({ method: "GET", url });
      assert.equal(res.statusCode, 401, `${url} debería exigir sesión`);
    }
  });

  it("rechaza credenciales incorrectas con un mensaje que no delata el correo", async () => {
    const inexistente = await app.inject({
      method: "POST",
      url: "/api/sesion/entrar",
      payload: { correo: "nadie@kora.test", contrasena: "loquesea12345" },
    });
    const claveMala = await app.inject({
      method: "POST",
      url: "/api/sesion/entrar",
      payload: { correo: "duena@kora.test", contrasena: "claveequivocada1" },
    });

    assert.equal(inexistente.statusCode, 401);
    assert.equal(claveMala.statusCode, 401);
    assert.equal(inexistente.json().error.mensaje, claveMala.json().error.mensaje);
  });

  it("entra con credenciales correctas y entrega una cookie protegida", async () => {
    const { respuesta } = await iniciarSesion(app, "duena@kora.test");
    const cookie = respuesta.cookies.find((c) => c.name === "kora_sesion");

    assert.equal(respuesta.json().usuario.rol, "owner");
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite.toLowerCase(), "lax");
    assert.equal(cookie.path, "/");
  });

  it("guarda solo el hash de la sesión, nunca el token", async () => {
    const { respuesta } = await iniciarSesion(app, "duena@kora.test");
    const token = respuesta.cookies.find((c) => c.name === "kora_sesion").value;

    const rows = await collection("sessions").find({}, { projection: { token_hash: 1 } }).toArray();
    assert.ok(rows.length > 0);
    assert.ok(rows.every((fila) => fila.token_hash !== token));
  });

  it("cierra la sesión al salir", async () => {
    const { cookie } = await iniciarSesion(app, "duena@kora.test");

    const antes = await app.inject({ method: "GET", url: "/api/yo", headers: { cookie } });
    assert.equal(antes.statusCode, 200);

    await app.inject({ method: "POST", url: "/api/sesion/salir", headers: { cookie } });

    const despues = await app.inject({ method: "GET", url: "/api/yo", headers: { cookie } });
    assert.equal(despues.statusCode, 401, "la cookie ya no debería servir");
  });

  it("bloquea tras varios intentos fallidos seguidos", async () => {
    const intentar = () =>
      app.inject({
        method: "POST",
        url: "/api/sesion/entrar",
        payload: { correo: "asesor@kora.test", contrasena: "estanoes-la-clave1" },
      });

    let bloqueado = null;
    for (let i = 0; i < 8 && !bloqueado; i += 1) {
      const res = await intentar();
      if (res.statusCode === 429) bloqueado = res;
    }

    assert.ok(bloqueado, "debería haber bloqueado antes del octavo intento");

    // El bloqueo tampoco deja entrar con la contraseña buena.
    const conClaveBuena = await app.inject({
      method: "POST",
      url: "/api/sesion/entrar",
      payload: { correo: "asesor@kora.test", contrasena: "contrasena-de-prueba-1" },
    });
    assert.equal(conClaveBuena.statusCode, 429);
  });
});

describe("contraseña temporal", () => {
  let app;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "nuevo@kora.test", role: "owner", mustChangePassword: true });
  });

  after(async () => {
    await cerrarApp(app);
  });

  it("no deja usar el portal hasta cambiarla", async () => {
    const { cookie } = await iniciarSesion(app, "nuevo@kora.test");

    const bloqueada = await app.inject({ method: "GET", url: "/api/cuentas", headers: { cookie } });
    assert.equal(bloqueada.statusCode, 403);

    const permitida = await app.inject({ method: "GET", url: "/api/yo", headers: { cookie } });
    assert.equal(permitida.statusCode, 200);
  });

  it("exige una contraseña razonable", async () => {
    const { cookie } = await iniciarSesion(app, "nuevo@kora.test");

    const corta = await app.inject({
      method: "POST",
      url: "/api/sesion/contrasena",
      headers: { cookie },
      payload: { actual: "contrasena-de-prueba-1", nueva: "corta1" },
    });
    assert.equal(corta.statusCode, 400);
  });

  it("al cambiarla, desbloquea el portal y cierra las demás sesiones", async () => {
    const primera = await iniciarSesion(app, "nuevo@kora.test");
    const segunda = await iniciarSesion(app, "nuevo@kora.test");

    const cambio = await app.inject({
      method: "POST",
      url: "/api/sesion/contrasena",
      headers: { cookie: segunda.cookie },
      payload: { actual: "contrasena-de-prueba-1", nueva: "una-clave-nueva-2026" },
    });
    assert.equal(cambio.statusCode, 200);

    const cookieRenovada = `kora_sesion=${
      cambio.cookies.find((c) => c.name === "kora_sesion").value
    }`;
    const ahora = await app.inject({
      method: "GET",
      url: "/api/cuentas",
      headers: { cookie: cookieRenovada },
    });
    assert.notEqual(ahora.statusCode, 403, "ya no debería exigir cambio de contraseña");

    const vieja = await app.inject({
      method: "GET",
      url: "/api/yo",
      headers: { cookie: primera.cookie },
    });
    assert.equal(vieja.statusCode, 401, "la sesión anterior debería haberse cerrado");
  });
});
