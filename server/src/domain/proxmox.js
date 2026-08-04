const MAX_RECURSOS = 2_000;
const MAX_NODOS = 32;
const MAX_TAREAS = 80;
const MAX_TEXTO = 500;

function numero(valor, fallback = 0) {
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : fallback;
}

function texto(valor, fallback = "") {
  if (valor === null || valor === undefined) return fallback;
  return String(valor).slice(0, MAX_TEXTO);
}

function arreglo(valor, limite = MAX_RECURSOS) {
  return Array.isArray(valor) ? valor.slice(0, limite) : [];
}

function fecha(valor) {
  const resultado = new Date(valor);
  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

function porcentaje(usado, total) {
  const maximo = numero(total);
  if (maximo <= 0) return 0;
  return Math.max(0, Math.min(100, (numero(usado) / maximo) * 100));
}

function porcentajeCpu(valor) {
  const actual = numero(valor);
  return Math.max(0, Math.min(100, actual <= 1 ? actual * 100 : actual));
}

function camposConfiguracion(config = {}) {
  const permitidos = [
    "arch", "bios", "boot", "cores", "cpu", "description", "features", "hostname",
    "memory", "name", "net0", "net1", "net2", "net3", "onboot", "ostype", "scsihw",
    "sockets", "startup", "swap", "tags", "unprivileged", "agent", "balloon",
  ];
  const salida = {};
  for (const clave of permitidos) {
    if (config[clave] !== undefined && config[clave] !== null) {
      salida[clave] = typeof config[clave] === "number"
        ? config[clave]
        : texto(config[clave], null);
    }
  }

  for (const [clave, valor] of Object.entries(config)) {
    if (/^(rootfs|(?:scsi|sata|virtio|ide)\d+)$/.test(clave)) salida[clave] = texto(valor);
  }
  return salida;
}

function normalizarRecurso(recurso = {}) {
  const type = texto(recurso.type).toLowerCase();
  const id = texto(recurso.id || `${type}/${recurso.vmid ?? recurso.storage ?? recurso.node}`);
  return {
    id,
    type,
    node: texto(recurso.node),
    vmid: recurso.vmid === undefined ? null : numero(recurso.vmid),
    name: texto(recurso.name || recurso.storage || recurso.node || id, id),
    status: texto(recurso.status, "unknown"),
    cpu: numero(recurso.cpu),
    maxcpu: numero(recurso.maxcpu),
    mem: numero(recurso.mem),
    maxmem: numero(recurso.maxmem),
    disk: numero(recurso.disk),
    maxdisk: numero(recurso.maxdisk),
    diskread: numero(recurso.diskread),
    diskwrite: numero(recurso.diskwrite),
    netin: numero(recurso.netin),
    netout: numero(recurso.netout),
    uptime: numero(recurso.uptime),
    template: Boolean(numero(recurso.template)),
    content: texto(recurso.content),
    plugintype: texto(recurso.plugintype),
    shared: Boolean(numero(recurso.shared)),
  };
}

function normalizarTarea(tarea = {}) {
  return {
    upid: texto(tarea.upid || tarea.id),
    node: texto(tarea.node),
    type: texto(tarea.type, "unknown"),
    status: texto(tarea.status || (tarea.endtime ? "unknown" : "running")),
    user: texto(tarea.user),
    vmid: tarea.id === undefined ? null : numero(tarea.id, null),
    starttime: numero(tarea.starttime, null),
    endtime: numero(tarea.endtime, null),
  };
}

function normalizarNodo(nodo = {}) {
  const detalle = nodo.statusDetail ?? nodo.status ?? {};
  return {
    name: texto(nodo.name || nodo.node),
    status: typeof nodo.status === "string" ? texto(nodo.status) : "online",
    detail: {
      cpu: numero(detalle.cpu),
      uptime: numero(detalle.uptime),
      loadavg: arreglo(detalle.loadavg, 3).map((valor) => numero(valor)),
      memory: {
        used: numero(detalle.memory?.used),
        total: numero(detalle.memory?.total),
        free: numero(detalle.memory?.free),
      },
      swap: {
        used: numero(detalle.swap?.used),
        total: numero(detalle.swap?.total),
        free: numero(detalle.swap?.free),
      },
      rootfs: {
        used: numero(detalle.rootfs?.used),
        total: numero(detalle.rootfs?.total),
        free: numero(detalle.rootfs?.free),
      },
      cpuinfo: {
        model: texto(detalle.cpuinfo?.model),
        cores: numero(detalle.cpuinfo?.cores),
        sockets: numero(detalle.cpuinfo?.sockets),
        cpus: numero(detalle.cpuinfo?.cpus),
        mhz: texto(detalle.cpuinfo?.mhz),
      },
      pveversion: texto(detalle.pveversion),
      kversion: texto(detalle.kversion),
    },
    storages: arreglo(nodo.storages, 128).map(normalizarRecurso),
    disks: arreglo(nodo.disks, 128).map((disco) => ({
      devpath: texto(disco.devpath),
      byId: texto(disco.by_id_link),
      model: texto(disco.model),
      vendor: texto(disco.vendor).trim(),
      serial: texto(disco.serial),
      type: texto(disco.type),
      size: numero(disco.size),
      health: texto(disco.health, "UNKNOWN"),
      wearout: Number.isFinite(Number(disco.wearout)) ? Number(disco.wearout) : null,
      rpm: Number.isFinite(Number(disco.rpm)) ? Number(disco.rpm) : null,
      used: texto(disco.used),
      smart: disco.smart && typeof disco.smart === "object" ? {
        health: texto(disco.smart.health || disco.smart.health_status),
        temperature: numero(disco.smart.temperature, null),
        powerOnHours: numero(disco.smart.power_on_hours, null),
      } : null,
    })),
    network: arreglo(nodo.network, 128).map((red) => ({
      iface: texto(red.iface),
      type: texto(red.type),
      active: Boolean(numero(red.active)),
      autostart: Boolean(numero(red.autostart)),
      address: texto(red.address),
      cidr: texto(red.cidr),
      bridgePorts: texto(red.bridge_ports),
      comments: texto(red.comments),
    })),
    services: arreglo(nodo.services, 128).map((servicio) => ({
      name: texto(servicio.name || servicio.service),
      state: texto(servicio.state),
      description: texto(servicio.desc || servicio.description),
    })),
    tasks: arreglo(nodo.tasks, MAX_TAREAS).map(normalizarTarea),
    updates: arreglo(nodo.updates, 500).map((paquete) => ({
      package: texto(paquete.Package || paquete.package),
      title: texto(paquete.Title || paquete.title),
      version: texto(paquete.Version || paquete.version),
      oldVersion: texto(paquete.OldVersion || paquete.oldVersion),
      origin: texto(paquete.Origin || paquete.origin),
    })),
    certificates: arreglo(nodo.certificates, 32).map((certificado) => ({
      filename: texto(certificado.filename),
      subject: texto(certificado.subject),
      issuer: texto(certificado.issuer),
      notafter: numero(certificado.notafter, null),
      fingerprint: texto(certificado.fingerprint),
    })),
    sensors: arreglo(nodo.sensors, 128).map((sensor) => ({
      name: texto(sensor.name),
      label: texto(sensor.label),
      temperature: numero(sensor.temperature, null),
    })),
    guests: arreglo(nodo.guests, MAX_RECURSOS).map((guest) => ({
      id: texto(guest.id || `${guest.type}/${guest.vmid}`),
      type: texto(guest.type),
      vmid: numero(guest.vmid),
      name: texto(guest.name || guest.config?.name || guest.config?.hostname),
      status: texto(guest.status || guest.current?.status, "unknown"),
      current: normalizarRecurso({ ...guest.current, ...guest }),
      config: camposConfiguracion(guest.config),
      snapshots: arreglo(guest.snapshots, 128).map((snapshot) => ({
        name: texto(snapshot.name),
        description: texto(snapshot.description),
        snaptime: numero(snapshot.snaptime, null),
        parent: texto(snapshot.parent),
      })),
      interfaces: arreglo(guest.interfaces, 64).map((interfaz) => ({
        name: texto(interfaz.name || interfaz.hwaddr || interfaz.inet),
        hardwareAddress: texto(interfaz["hardware-address"] || interfaz.hwaddr),
        addresses: arreglo(interfaz["ip-addresses"] || interfaz.inet, 32).map((ip) =>
          typeof ip === "string" ? ip : texto(ip["ip-address"] || ip.address),
        ),
      })),
    })),
  };
}

function combinarInventario(snapshot) {
  const recursos = snapshot.resources;
  const invitadosNodo = new Map();
  for (const nodo of snapshot.nodes) {
    for (const guest of nodo.guests) invitadosNodo.set(guest.id, guest);
  }

  snapshot.guests = recursos
    .filter((recurso) => recurso.type === "lxc" || recurso.type === "qemu")
    .map((recurso) => {
      const detalle = invitadosNodo.get(recurso.id);
      return {
        ...recurso,
        name: recurso.name || detalle?.name,
        config: detalle?.config ?? {},
        snapshots: detalle?.snapshots ?? [],
        interfaces: detalle?.interfaces ?? [],
      };
    });

  snapshot.storages = recursos.filter((recurso) => recurso.type === "storage");
  snapshot.nodeResources = recursos.filter((recurso) => recurso.type === "node");
  return snapshot;
}

export function normalizarSnapshot(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("La telemetría debe ser un objeto JSON.");
  }
  if (numero(payload.schemaVersion) !== 1) throw new Error("Versión de telemetría no compatible.");

  const agentId = texto(payload.agentId).toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(agentId)) {
    throw new Error("agentId no es válido.");
  }

  const capturedAt = fecha(payload.capturedAt);
  if (!capturedAt) throw new Error("capturedAt no es una fecha válida.");
  if (capturedAt.getTime() > Date.now() + 5 * 60_000) {
    throw new Error("capturedAt está demasiado adelantado.");
  }

  return combinarInventario({
    schemaVersion: 1,
    agentId,
    capturedAt,
    version: {
      release: texto(payload.version?.release),
      version: texto(payload.version?.version),
      repoid: texto(payload.version?.repoid),
    },
    cluster: {
      name: texto(payload.cluster?.name),
      quorate: payload.cluster?.quorate === undefined ? null : Boolean(payload.cluster.quorate),
      status: arreglo(payload.cluster?.status, 64).map((item) => ({
        id: texto(item.id),
        name: texto(item.name),
        type: texto(item.type),
        online: Boolean(numero(item.online)),
        quorate: item.quorate === undefined ? null : Boolean(item.quorate),
      })),
    },
    resources: arreglo(payload.resources).map(normalizarRecurso),
    nodes: arreglo(payload.nodes, MAX_NODOS).map(normalizarNodo),
    backupJobs: arreglo(payload.backupJobs, 128).map((job) => ({
      id: texto(job.id),
      node: texto(job.node),
      storage: texto(job.storage),
      schedule: texto(job.schedule),
      enabled: job.enabled === undefined ? true : Boolean(numero(job.enabled)),
      vmid: texto(job.vmid),
      mode: texto(job.mode),
      nextRun: numero(job.next_run, null),
    })),
    replicationJobs: arreglo(payload.replicationJobs, 128),
    collectionErrors: arreglo(payload.collectionErrors, 128).map((error) => texto(error)),
    local: {
      hostname: texto(payload.local?.hostname),
      loadavg: arreglo(payload.local?.loadavg, 3).map((valor) => numero(valor)),
      sensors: arreglo(payload.local?.sensors, 128).map((sensor) => ({
        name: texto(sensor.name),
        label: texto(sensor.label),
        temperature: numero(sensor.temperature, null),
      })),
    },
  });
}

function tasa(actual, anterior, segundos) {
  if (!anterior || segundos <= 0) return 0;
  const delta = numero(actual) - numero(anterior);
  return delta >= 0 ? delta / segundos : 0;
}

export function crearMuestra(snapshot, anterior = null) {
  const anteriorSnapshot = anterior?.snapshot;
  const segundos = anteriorSnapshot
    ? Math.max(1, (snapshot.capturedAt - new Date(anteriorSnapshot.capturedAt)) / 1_000)
    : 0;
  const anteriores = new Map((anteriorSnapshot?.guests ?? []).map((guest) => [guest.id, guest]));

  const nodoRecurso = snapshot.nodeResources[0] ?? {};
  const nodoDetalle = snapshot.nodes[0]?.detail ?? {};
  const sensores = [...(snapshot.nodes[0]?.sensors ?? []), ...(snapshot.local.sensors ?? [])]
    .filter((sensor) => Number.isFinite(sensor.temperature));

  return {
    agent_id: snapshot.agentId,
    captured_at: snapshot.capturedAt,
    node: {
      id: nodoRecurso.id || `node/${snapshot.nodes[0]?.name || snapshot.local.hostname}`,
      name: nodoRecurso.name || snapshot.nodes[0]?.name || snapshot.local.hostname,
      status: nodoRecurso.status || snapshot.nodes[0]?.status || "unknown",
      cpuPercent: porcentajeCpu(nodoRecurso.cpu || nodoDetalle.cpu),
      memoryPercent: porcentaje(nodoRecurso.mem || nodoDetalle.memory?.used, nodoRecurso.maxmem || nodoDetalle.memory?.total),
      diskPercent: porcentaje(nodoRecurso.disk || nodoDetalle.rootfs?.used, nodoRecurso.maxdisk || nodoDetalle.rootfs?.total),
      swapPercent: porcentaje(nodoDetalle.swap?.used, nodoDetalle.swap?.total),
      load1: numero(nodoDetalle.loadavg?.[0] ?? snapshot.local.loadavg?.[0]),
      uptime: numero(nodoRecurso.uptime || nodoDetalle.uptime),
      temperatureMax: sensores.length ? Math.max(...sensores.map((sensor) => sensor.temperature)) : null,
    },
    guests: snapshot.guests.map((guest) => {
      const previo = anteriores.get(guest.id);
      return {
        id: guest.id,
        type: guest.type,
        vmid: guest.vmid,
        name: guest.name,
        status: guest.status,
        cpuPercent: porcentajeCpu(guest.cpu),
        memoryPercent: porcentaje(guest.mem, guest.maxmem),
        diskPercent: porcentaje(guest.disk, guest.maxdisk),
        netInBps: tasa(guest.netin, previo?.netin, segundos),
        netOutBps: tasa(guest.netout, previo?.netout, segundos),
        diskReadBps: tasa(guest.diskread, previo?.diskread, segundos),
        diskWriteBps: tasa(guest.diskwrite, previo?.diskwrite, segundos),
        uptime: guest.uptime,
      };
    }),
    storages: snapshot.storages.map((storage) => ({
      id: storage.id,
      name: storage.name,
      status: storage.status,
      usedPercent: porcentaje(storage.disk, storage.maxdisk),
      used: storage.disk,
      total: storage.maxdisk,
    })),
  };
}

function alerta(id, level, title, detail, resource = null) {
  return { id, level, title, detail, resource };
}

function evaluarPorcentaje(lista, { id, title, value, resource }) {
  if (value >= 90) lista.push(alerta(id, "critical", title, `${value.toFixed(1)}% utilizado.`, resource));
  else if (value >= 80) lista.push(alerta(id, "warning", title, `${value.toFixed(1)}% utilizado.`, resource));
}

export function crearAlertas(state, { now = new Date(), staleAfterSeconds = 120 } = {}) {
  if (!state?.snapshot || !state?.sample) return [];
  const { snapshot, sample } = state;
  const resultado = [];
  const segundos = Math.max(
    (now - new Date(state.received_at)) / 1_000,
    (now - new Date(snapshot.capturedAt)) / 1_000,
  );
  if (segundos > staleAfterSeconds) {
    resultado.push(alerta("agent-stale", "critical", "Iroha dejó de reportar", `Último dato hace ${Math.floor(segundos)} segundos.`, snapshot.agentId));
  }

  if (sample.node.status !== "online") {
    resultado.push(alerta("node-offline", "critical", `${sample.node.name} está fuera de línea`, "Proxmox no reporta el nodo como disponible.", sample.node.id));
  }
  evaluarPorcentaje(resultado, { id: "node-memory", title: "Memoria del nodo alta", value: sample.node.memoryPercent, resource: sample.node.id });
  evaluarPorcentaje(resultado, { id: "node-root", title: "Disco raíz del nodo alto", value: sample.node.diskPercent, resource: sample.node.id });

  for (const storage of sample.storages) {
    if (storage.status !== "available") {
      resultado.push(alerta(`storage-${storage.id}-offline`, "critical", `${storage.name} no está disponible`, `Estado actual: ${storage.status}.`, storage.id));
    }
    evaluarPorcentaje(resultado, { id: `storage-${storage.id}`, title: `Capacidad alta en ${storage.name}`, value: storage.usedPercent, resource: storage.id });
  }

  for (const disk of snapshot.nodes.flatMap((node) => node.disks)) {
    if (disk.health && disk.health !== "PASSED") {
      resultado.push(alerta(`disk-${disk.devpath}`, "critical", `SMART degradado en ${disk.model || disk.devpath}`, `Estado reportado: ${disk.health}.`, disk.devpath));
    }
    if (disk.wearout !== null && disk.wearout <= 20) {
      resultado.push(alerta(`wear-${disk.devpath}`, disk.wearout <= 10 ? "critical" : "warning", `Vida útil baja en ${disk.model || disk.devpath}`, `${disk.wearout}% restante.`, disk.devpath));
    }
  }

  for (const guest of snapshot.guests) {
    if (guest.status === "stopped" && Number(guest.config?.onboot) === 1) {
      resultado.push(alerta(`guest-${guest.id}-stopped`, "warning", `${guest.name} está detenido`, "Está configurado para iniciar con el nodo.", guest.id));
    }
  }

  const tareas = snapshot.nodes.flatMap((node) => node.tasks);
  const desde = now.getTime() / 1_000 - 86_400;
  const fallidas = tareas.filter((task) => task.endtime >= desde && task.status && task.status !== "OK");
  if (fallidas.length) {
    resultado.push(alerta("failed-tasks", "warning", `${fallidas.length} tarea(s) fallaron en 24 horas`, "Revisa la actividad reciente del nodo.", sample.node.id));
  }

  if (snapshot.backupJobs.length === 0) {
    resultado.push(alerta("no-backups", "warning", "No hay copias programadas", "Proxmox no reporta ningún trabajo de backup configurado.", sample.node.id));
  }

  for (const certificate of snapshot.nodes.flatMap((node) => node.certificates)) {
    if (!certificate.notafter) continue;
    const dias = Math.floor((certificate.notafter * 1_000 - now.getTime()) / 86_400_000);
    if (dias <= 30) {
      resultado.push(alerta(
        `certificate-${certificate.fingerprint || certificate.filename}`,
        dias <= 14 ? "critical" : "warning",
        `Certificado próximo a vencer`,
        `${certificate.filename || certificate.subject}: ${Math.max(dias, 0)} día(s) restantes.`,
        sample.node.id,
      ));
    }
  }

  const prioridad = { critical: 0, warning: 1, info: 2 };
  return resultado.sort((a, b) => prioridad[a.level] - prioridad[b.level]);
}

export function crearEventos(snapshot, anterior, receivedAt, expiresAt) {
  const eventos = [];
  if (!anterior?.snapshot) {
    eventos.push({
      event_key: `${snapshot.agentId}:connected:${snapshot.capturedAt.toISOString()}`,
      agent_id: snapshot.agentId,
      at: snapshot.capturedAt,
      type: "agent.connected",
      level: "info",
      title: "Colector conectado",
      detail: `Comenzó la telemetría de ${snapshot.nodes[0]?.name || snapshot.agentId}.`,
      received_at: receivedAt,
      expires_at: expiresAt,
    });
    return eventos;
  }

  const anteriores = new Map(anterior.snapshot.guests.map((guest) => [guest.id, guest]));
  for (const guest of snapshot.guests) {
    const previo = anteriores.get(guest.id);
    if (previo && previo.status !== guest.status) {
      eventos.push({
        event_key: `${snapshot.agentId}:guest:${guest.id}:${guest.status}:${snapshot.capturedAt.toISOString()}`,
        agent_id: snapshot.agentId,
        at: snapshot.capturedAt,
        type: "guest.status",
        level: guest.status === "running" ? "success" : "warning",
        title: `${guest.name} cambió a ${guest.status}`,
        detail: `${previo.status} → ${guest.status}`,
        resource_id: guest.id,
        received_at: receivedAt,
        expires_at: expiresAt,
      });
    }
  }

  const tareasPrevias = new Set(anterior.snapshot.nodes.flatMap((node) => node.tasks).map((task) => task.upid));
  for (const task of snapshot.nodes.flatMap((node) => node.tasks)) {
    if (!task.upid || tareasPrevias.has(task.upid) || !task.endtime) continue;
    eventos.push({
      event_key: `${snapshot.agentId}:task:${task.upid}`,
      agent_id: snapshot.agentId,
      at: new Date(task.endtime * 1_000),
      type: "task.completed",
      level: task.status === "OK" ? "success" : "warning",
      title: `${task.type} terminó ${task.status === "OK" ? "correctamente" : "con error"}`,
      detail: task.vmid ? `Recurso ${task.vmid}` : task.node,
      resource_id: task.vmid ? String(task.vmid) : task.node,
      received_at: receivedAt,
      expires_at: expiresAt,
    });
  }
  return eventos;
}
