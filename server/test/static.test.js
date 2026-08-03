import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, crearApp } from "./helpers.js";

describe("entrega del portal", () => {
  let app;

  before(async () => {
    app = await crearApp();
  });

  after(async () => {
    await cerrarApp(app);
  });

  it("resuelve las rutas del cliente con index.html sin cachearlas", async () => {
    const respuesta = await app.inject({ method: "GET", url: "/analitica" });

    assert.equal(respuesta.statusCode, 200);
    assert.match(respuesta.headers["content-type"], /^text\/html/);
    assert.equal(respuesta.headers["cache-control"], "no-cache");
    assert.match(respuesta.body, /<!doctype html>/i);
  });

  it("no entrega index.html cuando falta un asset", async () => {
    const respuesta = await app.inject({
      method: "GET",
      url: "/assets/Analitica-version-anterior.js",
    });

    assert.equal(respuesta.statusCode, 404);
    assert.match(respuesta.headers["content-type"], /^text\/plain/);
    assert.equal(respuesta.headers["cache-control"], "no-store");
    assert.doesNotMatch(respuesta.body, /<!doctype html>/i);
  });
});
