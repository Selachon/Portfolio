import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cerrarApp, crearApp, crearUsuario, iniciarSesion } from "./helpers.js";

const TOKEN = "token-de-prueba-proxmox-32-caracteres-seguro";
const BASE_TIME = new Date(Date.now() - 60_000);

function snapshot({ capturedAt = BASE_TIME.toISOString(), guestStatus = "running" } = {}) {
  return {
    schemaVersion: 1,
    agentId: "iroha",
    capturedAt,
    version: { version: "8.4.19", release: "8.4" },
    resources: [
      { id: "node/Iroha", type: "node", node: "Iroha", status: "online", cpu: 0.61, mem: 9_169_969_152, maxmem: 16_600_223_744, disk: 47_517_286_400, maxdisk: 73_778_954_240, uptime: 4_474_007 },
      { id: "lxc/100", type: "lxc", vmid: 100, node: "Iroha", name: "Portainer", status: guestStatus, cpu: 0.18, mem: 870_641_664, maxmem: 8_589_934_592, disk: 19_359_850_496, maxdisk: 67_452_530_688, netin: 94_224_861_415, netout: 12_717_482_940, uptime: 3_680_344 },
      { id: "storage/Iroha/local-lvm", type: "storage", node: "Iroha", storage: "local-lvm", status: "available", disk: 124_598_819_487, maxdisk: 171_979_046_912, plugintype: "lvmthin" },
    ],
    nodes: [{
      name: "Iroha",
      status: "online",
      statusDetail: { cpu: 0.61, uptime: 4_474_007, loadavg: [1.1, 0.8, 0.5], memory: { used: 9_169_969_152, total: 16_600_223_744 }, rootfs: { used: 47_517_286_400, total: 73_778_954_240 }, cpuinfo: { model: "Test CPU", cores: 4 } },
      disks: [{ devpath: "/dev/sda", model: "WDS240", type: "ssd", size: 256_060_514_304, health: "PASSED", wearout: 100 }],
      guests: [{ id: "lxc/100", type: "lxc", vmid: 100, name: "Portainer", status: guestStatus, config: { cores: 2, memory: 8192, onboot: 1 }, snapshots: [] }],
      tasks: [],
      updates: [],
    }],
    backupJobs: [],
  };
}

describe("monitoreo de Proxmox", () => {
  let app;
  let cookie;

  before(async () => {
    app = await crearApp();
    await crearUsuario({ email: "owner@infra.test" });
    ({ cookie } = await iniciarSesion(app, "owner@infra.test"));
  });

  after(async () => cerrarApp(app));

  it("rechaza telemetría que no venga del colector", async () => {
    const respuesta = await app.inject({ method: "POST", url: "/api/infraestructura/ingesta", payload: snapshot() });
    assert.equal(respuesta.statusCode, 401);
  });

  it("recibe un snapshot real y lo expone solo dentro de la sesión", async () => {
    const ingesta = await app.inject({
      method: "POST",
      url: "/api/infraestructura/ingesta",
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: snapshot(),
    });
    assert.equal(ingesta.statusCode, 202);

    const sinSesion = await app.inject({ method: "GET", url: "/api/infraestructura/resumen" });
    assert.equal(sinSesion.statusCode, 401);

    const resumen = await app.inject({ method: "GET", url: "/api/infraestructura/resumen?rango=24h", headers: { cookie } });
    assert.equal(resumen.statusCode, 200);
    const body = resumen.json();
    assert.equal(body.state.snapshot.guests[0].name, "Portainer");
    assert.equal(body.state.snapshot.nodes[0].disks[0].health, "PASSED");
    assert.equal(Math.round(body.state.sample.node.cpuPercent), 61);
    assert.ok(body.alerts.some((alerta) => alerta.id === "no-backups"));
  });

  it("registra cambios de estado y calcula tasas sin aceptar duplicados", async () => {
    const siguiente = snapshot({ capturedAt: new Date(BASE_TIME.getTime() + 20_000).toISOString(), guestStatus: "stopped" });
    siguiente.resources[1].netin += 20_000;
    const ingesta = await app.inject({
      method: "POST",
      url: "/api/infraestructura/ingesta",
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: siguiente,
    });
    assert.equal(ingesta.statusCode, 202);

    const repetida = await app.inject({
      method: "POST",
      url: "/api/infraestructura/ingesta",
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: siguiente,
    });
    assert.equal(repetida.json().duplicate, true);

    const resumen = await app.inject({ method: "GET", url: "/api/infraestructura/resumen?rango=1h", headers: { cookie } });
    const body = resumen.json();
    assert.equal(body.state.sample.guests[0].netInBps, 1_000);
    assert.ok(body.events.some((evento) => evento.type === "guest.status"));
    assert.ok(body.alerts.some((alerta) => alerta.id === "guest-lxc/100-stopped"));
  });

  it("valida el rango y el identificador de invitado", async () => {
    const rango = await app.inject({ method: "GET", url: "/api/infraestructura/resumen?rango=eterno", headers: { cookie } });
    assert.equal(rango.statusCode, 400);

    const historial = await app.inject({ method: "GET", url: "/api/infraestructura/invitados/lxc/100/historial?rango=1h", headers: { cookie } });
    assert.equal(historial.statusCode, 200);
    assert.equal(historial.json().guest.name, "Portainer");
  });
});
