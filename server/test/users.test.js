import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, collection, crearApp, crearUsuario, iniciarSesion } from "./helpers.js";

describe("gestión de usuarios", () => {
  let app;
  let cookieDuena;
  let cookieAsesor;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "duena@kora.test", role: "owner", name: "Sela" });
    await crearUsuario({ email: "asesor@kora.test", role: "advisor", name: "Camilo" });
    cookieDuena = (await iniciarSesion(app, "duena@kora.test")).cookie;
    cookieAsesor = (await iniciarSesion(app, "asesor@kora.test")).cookie;
  });

  after(async () => {
    await cerrarApp(app);
  });

  it("el asesor no puede ver ni crear usuarios", async () => {
    const lista = await app.inject({
      method: "GET",
      url: "/api/usuarios",
      headers: { cookie: cookieAsesor },
    });
    assert.equal(lista.statusCode, 403);

    const alta = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: { cookie: cookieAsesor },
      payload: { correo: "intruso@kora.test", nombre: "Intruso" },
    });
    assert.equal(alta.statusCode, 403);
  });

  it("el asesor tampoco puede leer la auditoría", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auditoria",
      headers: { cookie: cookieAsesor },
    });
    assert.equal(res.statusCode, 403);
  });

  it("la propietaria crea una cuenta con contraseña temporal de un solo uso", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: { cookie: cookieDuena },
      payload: { correo: "Nuevo@Kora.test", nombre: "Nuevo Asesor", rol: "advisor" },
    });

    assert.equal(res.statusCode, 200);
    const cuerpo = res.json();
    assert.equal(cuerpo.usuario.correo, "nuevo@kora.test", "el correo se normaliza a minúsculas");
    assert.equal(cuerpo.usuario.debeCambiarContrasena, true);
    assert.ok(cuerpo.contrasenaTemporal.length >= 20);

    // La contraseña temporal sirve para entrar, y no quedó guardada en claro.
    const { cookie } = await iniciarSesion(app, "nuevo@kora.test", cuerpo.contrasenaTemporal);
    assert.ok(cookie);

    const user = await collection("users").findOne({ email: "nuevo@kora.test" });
    assert.ok(!user.password_hash.includes(cuerpo.contrasenaTemporal));
  });

  it("no permite dos cuentas con el mismo correo", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/usuarios",
      headers: { cookie: cookieDuena },
      payload: { correo: "asesor@kora.test", nombre: "Repetido" },
    });
    assert.equal(res.statusCode, 409);
  });

  it("la propietaria no puede desactivarse ni degradarse a sí misma", async () => {
    const yo = await app.inject({ method: "GET", url: "/api/yo", headers: { cookie: cookieDuena } });
    const miId = yo.json().usuario.id;

    const desactivar = await app.inject({
      method: "PATCH",
      url: `/api/usuarios/${miId}`,
      headers: { cookie: cookieDuena },
      payload: { activo: false },
    });
    assert.equal(desactivar.statusCode, 403);

    const degradar = await app.inject({
      method: "PATCH",
      url: `/api/usuarios/${miId}`,
      headers: { cookie: cookieDuena },
      payload: { rol: "advisor" },
    });
    assert.equal(degradar.statusCode, 403);
  });

  it("desactivar a alguien lo echa en el acto", async () => {
    const user = await collection("users").findOne({ email: "asesor@kora.test" });

    const res = await app.inject({
      method: "PATCH",
      url: `/api/usuarios/${user.id}`,
      headers: { cookie: cookieDuena },
      payload: { activo: false },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().usuario.activo, false);

    const conSesionVieja = await app.inject({
      method: "GET",
      url: "/api/yo",
      headers: { cookie: cookieAsesor },
    });
    assert.equal(conSesionVieja.statusCode, 401);

    // Y tampoco puede volver a entrar.
    const reintento = await app.inject({
      method: "POST",
      url: "/api/sesion/entrar",
      payload: { correo: "asesor@kora.test", contrasena: "contrasena-de-prueba-1" },
    });
    assert.equal(reintento.statusCode, 401);
  });

  it("deja rastro en la auditoría de quién hizo cada cosa", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auditoria",
      headers: { cookie: cookieDuena },
    });

    const acciones = res.json().eventos.map((evento) => evento.accion);
    assert.ok(acciones.includes("usuario.creado"));
    assert.ok(acciones.includes("usuario.actualizado"));
    assert.ok(
      res.json().eventos.every((evento) => evento.fecha),
      "todo evento debería tener fecha",
    );
  });
});
