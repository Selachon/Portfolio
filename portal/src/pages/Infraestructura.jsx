import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  CircleOff,
  Clock3,
  Container,
  Database,
  HardDrive,
  Network,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api.js";
import { Aviso, Cargando, Kpi, MetaLinea, NumeroAnimado, Panel } from "../components/comunes.jsx";

const RANGOS = ["1h", "6h", "24h", "7d", "30d", "90d", "1a"];
const FECHA_HORA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "medium" });
const HORA = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
const ENTERO = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

function bytes(valor, decimales = 1) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return "0 B";
  const unidades = ["B", "KB", "MB", "GB", "TB", "PB"];
  const indice = Math.min(Math.floor(Math.log(numero) / Math.log(1024)), unidades.length - 1);
  return `${(numero / 1024 ** indice).toFixed(indice === 0 ? 0 : decimales)} ${unidades[indice]}`;
}

function tasa(valor) {
  return `${bytes(valor)}/s`;
}

function duracion(segundos) {
  const total = Math.max(0, Number(segundos) || 0);
  const dias = Math.floor(total / 86_400);
  const horas = Math.floor((total % 86_400) / 3_600);
  if (dias) return `${dias} d ${horas} h`;
  const minutos = Math.floor((total % 3_600) / 60);
  return `${horas} h ${minutos} min`;
}

function etiquetaTiempo(fecha, rango) {
  const valor = new Date(fecha);
  if (rango === "1h" || rango === "6h" || rango === "24h") return HORA.format(valor);
  return `${valor.getDate()}/${valor.getMonth() + 1}`;
}

function estadoEspanol(estado) {
  return ({ running: "Activo", stopped: "Detenido", online: "En línea", available: "Disponible", OK: "Correcto" })[estado] ?? estado ?? "Desconocido";
}

function useInfraestructura(rango) {
  const [estado, setEstado] = useState({ datos: null, error: null, actualizando: true });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let vigente = true;
    const cargar = async (silencioso = false) => {
      if (!silencioso) setEstado((actual) => ({ ...actual, actualizando: true }));
      try {
        const datos = await api.get(`/api/infraestructura/resumen?rango=${rango}`);
        if (vigente) setEstado({ datos, error: null, actualizando: false });
      } catch (error) {
        if (vigente) setEstado((actual) => ({ ...actual, error: error.message, actualizando: false }));
      }
    };

    cargar();
    const intervalo = window.setInterval(() => cargar(true), 20_000);
    return () => {
      vigente = false;
      window.clearInterval(intervalo);
    };
  }, [rango, revision]);

  return { ...estado, recargar: () => setRevision((actual) => actual + 1) };
}

function RangoControl({ valor, alCambiar }) {
  return (
    <div className="infra-rangos" aria-label="Rango del histórico">
      {RANGOS.map((rango) => (
        <button key={rango} type="button" aria-pressed={valor === rango} onClick={() => alCambiar(rango)}>
          {rango}
        </button>
      ))}
    </div>
  );
}

function EstadoVivo({ datos }) {
  return (
    <span className={`infra-vivo ${datos.connected ? "infra-vivo--ok" : "infra-vivo--stale"}`}>
      <i aria-hidden="true" />
      {datos.connected ? "En vivo" : `Sin señal · ${datos.ageSeconds}s`}
    </span>
  );
}

function TooltipMetrica({ active, payload, label, formatter = (valor) => `${DECIMAL.format(valor)}%` }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__titulo">{label}</div>
      {payload.map((item) => (
        <div className="chart-tooltip__fila" key={item.dataKey}>
          <i className="chart-tooltip__punto" style={{ background: item.color }} />
          <span>{item.name}</span>
          <strong>{formatter(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function GraficoNodo({ historial, rango }) {
  const puntos = historial.map((punto) => ({
    ...punto.node,
    at: etiquetaTiempo(punto.at, rango),
  }));

  return (
    <Panel
      className="infra-grafico-principal"
      titulo="Pulso del nodo"
      extra={<span className="mono-uppr">CPU · RAM · raíz</span>}
    >
      {puntos.length < 2 ? (
        <div className="chart-empty">El histórico aparecerá después de los primeros snapshots.</div>
      ) : (
        <div className="chart-frame chart-frame--infra">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={puntos} margin={{ top: 10, right: 8, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id="infraCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--infra-cyan)" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="var(--infra-cyan)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="infraMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--infra-amber)" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="var(--infra-amber)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--hair)" vertical={false} />
              <XAxis dataKey="at" stroke="var(--ink-3)" tickLine={false} axisLine={false} minTickGap={34} fontSize={9} />
              <YAxis domain={[0, 100]} stroke="var(--ink-3)" tickLine={false} axisLine={false} fontSize={9} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<TooltipMetrica />} />
              <Area type="monotone" dataKey="cpuPercent" name="CPU" stroke="var(--infra-cyan)" fill="url(#infraCpu)" strokeWidth={2} isAnimationActive />
              <Area type="monotone" dataKey="memoryPercent" name="RAM" stroke="var(--infra-amber)" fill="url(#infraMem)" strokeWidth={2} isAnimationActive />
              <Area type="monotone" dataKey="diskPercent" name="Raíz" stroke="var(--infra-pink)" fill="transparent" strokeWidth={1.5} isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function Alertas({ alertas, compacto = false }) {
  if (!alertas.length) {
    return (
      <div className="infra-sin-alertas">
        <CheckCircle2 size={18} /> Sin alertas activas
      </div>
    );
  }
  return (
    <div className={`infra-alertas ${compacto ? "infra-alertas--compactas" : ""}`}>
      {alertas.map((alerta) => {
        const Icono = alerta.level === "critical" ? AlertTriangle : TriangleAlert;
        return (
          <article key={alerta.id} className={`infra-alerta infra-alerta--${alerta.level}`}>
            <Icono size={16} />
            <div><strong>{alerta.title}</strong><span>{alerta.detail}</span></div>
          </article>
        );
      })}
    </div>
  );
}

function Capacidad({ valor, tono }) {
  return (
    <div className="infra-capacidad" aria-label={`${DECIMAL.format(valor)}%`}>
      <span style={{ width: `${Math.min(valor, 100)}%`, background: tono }} />
    </div>
  );
}

function Topologia({ snapshot, sample }) {
  return (
    <Panel titulo="Topología viva" extra={<span className="mono-uppr">{snapshot.guests.length} invitados</span>}>
      <div className="infra-topologia">
        <div className="infra-nodo">
          <span><Server size={26} /></span>
          <div>
            <small>Nodo PVE 8.4</small>
            <strong>{sample.node.name}</strong>
            <em>{DECIMAL.format(sample.node.cpuPercent)}% CPU · {DECIMAL.format(sample.node.memoryPercent)}% RAM</em>
          </div>
          <i className="infra-nodo__pulso" aria-hidden="true" />
        </div>
        <div className="infra-conexiones" aria-hidden="true"><i /><i /><i /></div>
        <div className="infra-invitados-mapa">
          {snapshot.guests.map((guest, indice) => (
            <div key={guest.id} className={`infra-mapa-guest ${guest.status === "running" ? "activo" : "detenido"}`} style={{ "--orden": indice }}>
              {guest.type === "lxc" ? <Container size={15} /> : <Box size={15} />}
              <span><strong>{guest.name}</strong><small>{guest.type.toUpperCase()} {guest.vmid}</small></span>
              <i aria-label={estadoEspanol(guest.status)} />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function TablaInvitados({ guests, onSelect }) {
  return (
    <div className="tabla-envoltura infra-tabla-invitados">
      <table>
        <thead><tr><th>Invitado</th><th>Estado</th><th>CPU</th><th>Memoria</th><th>Disco</th><th>Red ↓ / ↑</th></tr></thead>
        <tbody>
          {guests.map((guest) => (
            <tr key={guest.id} onClick={() => onSelect?.(guest.id)} tabIndex={onSelect ? 0 : undefined}>
              <td><strong>{guest.name}</strong><div className="tenue mono">{guest.type.toUpperCase()} {guest.vmid}</div></td>
              <td><span className={`infra-estado infra-estado--${guest.status}`}>{estadoEspanol(guest.status)}</span></td>
              <td className="num">{DECIMAL.format(guest.cpuPercent)}%</td>
              <td className="num">{DECIMAL.format(guest.memoryPercent)}%</td>
              <td className="num">{DECIMAL.format(guest.diskPercent)}%</td>
              <td className="num">{tasa(guest.netInBps)} / {tasa(guest.netOutBps)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Resumen({ datos, rango }) {
  const { snapshot, sample } = datos.state;
  const activos = snapshot.guests.filter((guest) => guest.status === "running").length;
  const maxStorage = sample.storages.reduce((maximo, storage) => storage.usedPercent > maximo.usedPercent ? storage : maximo, sample.storages[0] ?? { usedPercent: 0, name: "Sin storage" });

  return (
    <>
      <div className="rejilla infra-kpis aparece">
        <Kpi etiqueta="CPU · Iroha" numero={sample.node.cpuPercent} sufijo="%" pie={`${sample.node.load1.toFixed(2)} carga${sample.node.temperatureMax === null ? "" : ` · ${DECIMAL.format(sample.node.temperatureMax)} °C`}`} />
        <Kpi etiqueta="Memoria" numero={sample.node.memoryPercent} sufijo="%" pie={`${bytes(snapshot.nodeResources[0]?.mem)} de ${bytes(snapshot.nodeResources[0]?.maxmem)}`} />
        <Kpi etiqueta={`Capacidad · ${maxStorage.name}`} numero={maxStorage.usedPercent} sufijo="%" pie={`${bytes(maxStorage.used)} utilizados`} tono={maxStorage.usedPercent >= 80 ? "negativo" : ""} />
        <Kpi etiqueta="Invitados activos" numero={activos} pie={`${snapshot.guests.length} CT y VMs inventariados`} tono="positivo" />
      </div>

      <div className="infra-resumen-grid aparece">
        <GraficoNodo historial={datos.history} rango={rango} />
        <Panel titulo="Alertas activas" extra={<span className="mono-uppr">{datos.alerts.length}</span>}>
          <Alertas alertas={datos.alerts} compacto />
        </Panel>
      </div>

      <div className="infra-resumen-grid infra-resumen-grid--mitad aparece">
        <Topologia snapshot={snapshot} sample={sample} />
        <Panel titulo="Capacidad lógica" extra={<Database size={15} />}>
          <div className="infra-storage-lista">
            {sample.storages.map((storage) => (
              <div key={storage.id}>
                <div className="entre"><strong>{storage.name}</strong><span className="mono">{DECIMAL.format(storage.usedPercent)}%</span></div>
                <Capacidad valor={storage.usedPercent} tono={storage.usedPercent >= 80 ? "var(--bad)" : "var(--infra-cyan)"} />
                <small>{bytes(storage.used)} de {bytes(storage.total)}</small>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <section className="infra-seccion aparece">
        <div className="infra-seccion__head"><h2>Invitados</h2><span>{activos} activos · {snapshot.guests.length - activos} detenidos</span></div>
        <TablaInvitados guests={sample.guests} />
      </section>
    </>
  );
}

function useHistorialGuest(guest, rango) {
  const [estado, setEstado] = useState({ history: [], error: null });
  useEffect(() => {
    let vigente = true;
    if (!guest) return undefined;
    api.get(`/api/infraestructura/invitados/${guest.type}/${guest.vmid}/historial?rango=${rango}`)
      .then((datos) => vigente && setEstado({ history: datos.history, error: null }))
      .catch((error) => vigente && setEstado({ history: [], error: error.message }));
    return () => { vigente = false; };
  }, [guest, rango]);
  return estado;
}

function DetalleGuest({ guest, sample, rango }) {
  const { history } = useHistorialGuest(guest, rango);
  if (!guest || !sample) return <div className="vacio">Selecciona un invitado.</div>;
  const config = guest.config ?? {};
  const discos = Object.entries(config).filter(([key]) => /^(rootfs|(?:scsi|sata|virtio|ide)\d+)$/.test(key));
  const chart = history.map((punto) => ({ ...punto, at: etiquetaTiempo(punto.at, rango) }));

  return (
    <div className="infra-guest-detalle">
      <header>
        <span className="infra-guest-detalle__icono">{guest.type === "lxc" ? <Container /> : <Box />}</span>
        <div><small>{guest.type.toUpperCase()} {guest.vmid}</small><h2>{guest.name}</h2></div>
        <span className={`infra-estado infra-estado--${guest.status}`}>{estadoEspanol(guest.status)}</span>
      </header>

      <div className="infra-mini-kpis">
        <div><span>CPU</span><strong><NumeroAnimado valor={sample.cpuPercent} sufijo="%" /></strong></div>
        <div><span>RAM</span><strong><NumeroAnimado valor={sample.memoryPercent} sufijo="%" /></strong></div>
        <div><span>Disco</span><strong><NumeroAnimado valor={sample.diskPercent} sufijo="%" /></strong></div>
        <div><span>Uptime</span><strong>{duracion(sample.uptime)}</strong></div>
      </div>

      <div className="chart-frame chart-frame--guest">
        {chart.length < 2 ? <div className="chart-empty">Esperando histórico del invitado.</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 12, right: 5, bottom: 0, left: -25 }}>
              <CartesianGrid stroke="var(--hair)" vertical={false} />
              <XAxis dataKey="at" stroke="var(--ink-3)" tickLine={false} axisLine={false} minTickGap={30} fontSize={8} />
              <YAxis domain={[0, 100]} stroke="var(--ink-3)" tickLine={false} axisLine={false} fontSize={8} />
              <Tooltip content={<TooltipMetrica />} />
              <Area type="monotone" dataKey="cpuPercent" name="CPU" stroke="var(--infra-cyan)" fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="memoryPercent" name="RAM" stroke="var(--infra-amber)" fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="diskPercent" name="Disco" stroke="var(--infra-pink)" fill="transparent" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="infra-detalle-grid">
        <section><h3>Asignación</h3><dl>
          <div><dt>vCPU</dt><dd>{guest.maxcpu || config.cores || "—"}</dd></div>
          <div><dt>Memoria</dt><dd>{bytes(guest.maxmem)}</dd></div>
          <div><dt>Arquitectura</dt><dd>{config.arch || "—"}</dd></div>
          <div><dt>Sistema</dt><dd>{config.ostype || "—"}</dd></div>
          <div><dt>Inicio automático</dt><dd>{Number(config.onboot) === 1 ? "Sí" : "No"}</dd></div>
          <div><dt>Privilegios</dt><dd>{guest.type === "lxc" ? Number(config.unprivileged) === 1 ? "No privilegiado" : "Privilegiado" : "KVM"}</dd></div>
        </dl></section>
        <section><h3>Tráfico actual</h3><dl>
          <div><dt>Entrada</dt><dd>{tasa(sample.netInBps)}</dd></div>
          <div><dt>Salida</dt><dd>{tasa(sample.netOutBps)}</dd></div>
          <div><dt>Lectura</dt><dd>{tasa(sample.diskReadBps)}</dd></div>
          <div><dt>Escritura</dt><dd>{tasa(sample.diskWriteBps)}</dd></div>
        </dl></section>
      </div>

      <div className="infra-detalle-listas">
        <section><h3>Volúmenes</h3>{discos.length ? discos.map(([key, value]) => <code key={key}>{key}: {value}</code>) : <span className="tenue">Sin detalle de volúmenes.</span>}</section>
        <section><h3>Red e IP</h3>{guest.interfaces?.length ? guest.interfaces.map((iface) => <code key={iface.name}>{iface.name}: {iface.addresses.join(", ") || iface.hardwareAddress}</code>) : <span className="tenue">El agente invitado no reporta interfaces.</span>}</section>
        <section><h3>Snapshots</h3>{guest.snapshots?.filter((snap) => snap.name !== "current").length ? guest.snapshots.filter((snap) => snap.name !== "current").map((snap) => <code key={snap.name}>{snap.name}</code>) : <span className="tenue">Sin snapshots.</span>}</section>
      </div>
    </div>
  );
}

function Invitados({ datos, rango }) {
  const { snapshot, sample } = datos.state;
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState(snapshot.guests[0]?.id ?? null);
  const invitados = useMemo(() => snapshot.guests.filter((guest) => {
    const coincideTipo = filtro === "todos" || guest.type === filtro || guest.status === filtro;
    const coincideTexto = `${guest.name} ${guest.vmid}`.toLowerCase().includes(busqueda.toLowerCase());
    return coincideTipo && coincideTexto;
  }), [snapshot.guests, filtro, busqueda]);
  const guest = snapshot.guests.find((item) => item.id === seleccion) ?? invitados[0];
  const guestSample = sample.guests.find((item) => item.id === guest?.id);

  return (
    <div className="infra-inventario aparece">
      <aside className="infra-inventario__lista">
        <div className="infra-busqueda"><Search size={14} /><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar CT o VM" /></div>
        <div className="infra-filtros">
          {[['todos', 'Todos'], ['lxc', 'CT'], ['qemu', 'VM'], ['running', 'Activos'], ['stopped', 'Detenidos']].map(([id, nombre]) => (
            <button key={id} type="button" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{nombre}</button>
          ))}
        </div>
        <div className="infra-guest-lista">
          {invitados.map((item) => {
            const metrica = sample.guests.find((actual) => actual.id === item.id);
            return (
              <button key={item.id} type="button" className={guest?.id === item.id ? "activo" : ""} onClick={() => setSeleccion(item.id)}>
                {item.type === "lxc" ? <Container size={16} /> : <Box size={16} />}
                <span><strong>{item.name}</strong><small>{item.type.toUpperCase()} {item.vmid} · {estadoEspanol(item.status)}</small></span>
                <em>{DECIMAL.format(metrica?.cpuPercent ?? 0)}%</em>
              </button>
            );
          })}
        </div>
      </aside>
      <section className="infra-inventario__detalle">
        <DetalleGuest guest={guest} sample={guestSample} rango={rango} />
      </section>
    </div>
  );
}

function Almacenamiento({ datos }) {
  const { snapshot, sample } = datos.state;
  const discos = snapshot.nodes.flatMap((node) => node.disks);
  const barras = sample.storages.map((storage) => ({ name: storage.name, used: storage.used / 1024 ** 3, free: (storage.total - storage.used) / 1024 ** 3 }));
  return (
    <>
      <div className="infra-storage-grid aparece">
        {sample.storages.map((storage) => (
          <article key={storage.id} className="infra-storage-card">
            <header><Database size={19} /><span className={`infra-estado infra-estado--${storage.status}`}>{estadoEspanol(storage.status)}</span></header>
            <small>{snapshot.storages.find((item) => item.id === storage.id)?.plugintype || "storage"}</small>
            <h2>{storage.name}</h2>
            <strong><NumeroAnimado valor={storage.usedPercent} sufijo="%" /></strong>
            <Capacidad valor={storage.usedPercent} tono={storage.usedPercent >= 80 ? "var(--bad)" : "var(--infra-cyan)"} />
            <footer><span>{bytes(storage.used)} usados</span><span>{bytes(storage.total - storage.used)} libres</span></footer>
          </article>
        ))}
      </div>

      <div className="infra-resumen-grid aparece">
        <Panel titulo="Capacidad comparada" extra={<span className="mono-uppr">GiB</span>}>
          <div className="chart-frame chart-frame--storage">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barras} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid stroke="var(--hair)" horizontal={false} />
                <XAxis type="number" stroke="var(--ink-3)" tickLine={false} axisLine={false} fontSize={9} />
                <YAxis type="category" dataKey="name" width={74} stroke="var(--ink-3)" tickLine={false} axisLine={false} fontSize={9} />
                <Tooltip content={<TooltipMetrica formatter={(v) => `${DECIMAL.format(v)} GiB`} />} />
                <Bar dataKey="used" stackId="capacidad" name="Usado" fill="var(--infra-amber)" isAnimationActive />
                <Bar dataKey="free" stackId="capacidad" name="Libre" fill="var(--infra-cyan)" opacity={0.42} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel titulo="Protección de datos" extra={<ShieldCheck size={15} />}>
          <div className="infra-proteccion">
            <div className={snapshot.backupJobs.length ? "ok" : "warn"}><span>Trabajos de backup</span><strong>{snapshot.backupJobs.length}</strong></div>
            <div className={snapshot.replicationJobs.length ? "ok" : "neutral"}><span>Replicaciones</span><strong>{snapshot.replicationJobs.length}</strong></div>
            <p>{snapshot.backupJobs.length ? "Hay copias programadas en Proxmox." : "No existe ningún trabajo de backup programado."}</p>
          </div>
        </Panel>
      </div>

      <section className="infra-seccion aparece">
        <div className="infra-seccion__head"><h2>Discos físicos</h2><span>{discos.length} dispositivos</span></div>
        <div className="infra-discos">
          {discos.map((disk) => (
            <article key={disk.devpath}>
              <header><HardDrive size={22} /><span className={`infra-estado ${disk.health === "PASSED" ? "infra-estado--running" : "infra-estado--stopped"}`}>{disk.health}</span></header>
              <small>{disk.type.toUpperCase()} · {disk.devpath}</small>
              <h3>{disk.model}</h3>
              <strong>{bytes(disk.size)}</strong>
              <dl>
                <div><dt>Uso</dt><dd>{disk.used || "—"}</dd></div>
                <div><dt>RPM</dt><dd>{disk.rpm || (disk.type === "ssd" ? "Estado sólido" : "—")}</dd></div>
                <div><dt>Vida útil</dt><dd>{disk.wearout === null ? "N/D" : `${disk.wearout}%`}</dd></div>
                <div><dt>Temperatura</dt><dd>{disk.smart?.temperature ? `${disk.smart.temperature} °C` : "N/D"}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ActividadVista({ datos }) {
  const { snapshot } = datos.state;
  const node = snapshot.nodes[0] ?? { tasks: [], services: [], updates: [], certificates: [] };
  const serviciosMal = node.services.filter((service) => !["running", "active"].includes(service.state));
  const referenciaTemporal = new Date(datos.state.received_at).getTime();
  return (
    <>
      <div className="infra-resumen-grid aparece">
        <Panel titulo="Alertas y hallazgos" extra={<span className="mono-uppr">{datos.alerts.length} activos</span>}>
          <Alertas alertas={datos.alerts} />
        </Panel>
        <Panel titulo="Estado operativo" extra={<Activity size={15} />}>
          <div className="infra-operativo">
            <div><span>Servicios</span><strong>{node.services.length - serviciosMal.length}/{node.services.length}</strong><small>activos</small></div>
            <div><span>Actualizaciones</span><strong>{node.updates.length}</strong><small>pendientes</small></div>
            <div><span>Consultas omitidas</span><strong>{snapshot.collectionErrors?.length ?? 0}</strong><small>sin soporte</small></div>
            <div><span>Backups</span><strong>{snapshot.backupJobs.length}</strong><small>programados</small></div>
          </div>
        </Panel>
      </div>

      <div className="infra-actividad-grid aparece">
        <Panel titulo="Eventos de Kora" extra={<Clock3 size={15} />}>
          <div className="infra-eventos">
            {datos.events.length ? datos.events.map((evento) => (
              <article key={evento.event_key}><i className={`nivel-${evento.level}`} /><div><strong>{evento.title}</strong><span>{evento.detail}</span></div><time>{FECHA_HORA.format(new Date(evento.at))}</time></article>
            )) : <div className="vacio">Todavía no hay cambios registrados.</div>}
          </div>
        </Panel>
        <Panel titulo="Tareas recientes" extra={<span className="mono-uppr">{node.tasks.length}</span>}>
          <div className="infra-tareas">
            {node.tasks.length ? node.tasks.map((task) => (
              <div key={task.upid}><span className={`infra-estado infra-estado--${task.status === "OK" ? "running" : task.endtime ? "stopped" : "available"}`}>{task.status}</span><strong>{task.type}</strong><small>{task.vmid || task.node} · {task.starttime ? FECHA_HORA.format(new Date(task.starttime * 1000)) : "—"}</small></div>
            )) : <div className="vacio">Sin tareas recientes.</div>}
          </div>
        </Panel>
      </div>

      <div className="infra-actividad-grid aparece">
        <Panel titulo="Servicios con atención" extra={<Server size={15} />}>
          {serviciosMal.length ? <div className="infra-servicios">{serviciosMal.map((service) => <div key={service.name}><CircleOff size={14} /><span><strong>{service.name}</strong><small>{service.description}</small></span><em>{service.state}</em></div>)}</div> : <div className="infra-sin-alertas"><CheckCircle2 size={18} /> Todos los servicios reportados están activos</div>}
        </Panel>
        <Panel titulo="Actualizaciones disponibles" extra={<span className="mono-uppr">{node.updates.length}</span>}>
          <div className="infra-updates">
            {node.updates.slice(0, 16).map((update) => <div key={update.package}><strong>{update.package}</strong><span>{update.oldVersion || "—"} → {update.version}</span></div>)}
            {!node.updates.length && <div className="infra-sin-alertas"><CheckCircle2 size={18} /> Sistema al día</div>}
          </div>
        </Panel>
      </div>

      <div className="infra-actividad-grid aparece">
        <Panel titulo="Red del nodo" extra={<Network size={15} />}>
          <div className="infra-red-lista">
            {node.network.map((iface) => (
              <div key={iface.iface}>
                <span className={`infra-estado infra-estado--${iface.active ? "running" : "stopped"}`}>{iface.active ? "Activa" : "Inactiva"}</span>
                <strong>{iface.iface}</strong>
                <small>{iface.cidr || iface.address || iface.type} {iface.bridgePorts ? `· ${iface.bridgePorts}` : ""}</small>
              </div>
            ))}
            {!node.network.length && <div className="vacio">Sin interfaces reportadas.</div>}
          </div>
        </Panel>
        <Panel titulo="Certificados" extra={<ShieldCheck size={15} />}>
          <div className="infra-certificados">
            {node.certificates.map((certificate) => {
              const dias = certificate.notafter ? Math.floor((certificate.notafter * 1000 - referenciaTemporal) / 86_400_000) : null;
              return <div key={certificate.fingerprint || certificate.filename}><strong>{certificate.filename || certificate.subject}</strong><span>{dias === null ? "Vigencia desconocida" : `${Math.max(dias, 0)} días restantes`}</span><small>{certificate.issuer}</small></div>;
            })}
            {!node.certificates.length && <div className="vacio">Sin certificados reportados.</div>}
          </div>
        </Panel>
      </div>
    </>
  );
}

function SinConexion({ configured }) {
  return (
    <div className="infra-sin-conexion aparece">
      <div className="infra-radar" aria-hidden="true"><span /><span /><Server size={30} /></div>
      <span className="mono-uppr">Iroha · esperando señal</span>
      <h1>Telemetría aún no conectada</h1>
      <p>{configured ? "Render está preparado y espera el primer snapshot del colector." : "Falta configurar el secreto de ingesta en Render."}</p>
    </div>
  );
}

export default function Infraestructura({ vista = "resumen" }) {
  const [rango, setRango] = useState("24h");
  const { datos, error, actualizando, recargar } = useInfraestructura(rango);
  const titulos = {
    resumen: ["Infraestructura", "Iroha", "Estado general"],
    invitados: ["Infraestructura", "Iroha", "CT y VMs"],
    almacenamiento: ["Infraestructura", "Iroha", "Almacenamiento"],
    actividad: ["Infraestructura", "Iroha", "Actividad"],
  };

  if (!datos && actualizando) return <Cargando texto="Sincronizando con Iroha" />;
  if (!datos && error) return <Aviso tipo="error">{error}</Aviso>;

  return (
    <>
      <MetaLinea partes={titulos[vista]} />
      <div className="cabecera-pagina infra-cabecera">
        <div>
          <h1>{vista === "resumen" ? "Iroha" : titulos[vista][2]} <em>/ PVE</em></h1>
          <p>{datos?.state ? `Último snapshot: ${FECHA_HORA.format(new Date(datos.state.received_at))}` : "Colector Proxmox de solo lectura"}</p>
        </div>
        <div className="infra-controles">
          {datos?.state && <EstadoVivo datos={datos} />}
          <RangoControl valor={rango} alCambiar={setRango} />
          <button className="icono" type="button" onClick={recargar} title="Actualizar ahora" aria-label="Actualizar telemetría">
            <RefreshCw size={15} className={actualizando ? "girando" : ""} />
          </button>
        </div>
      </div>

      {error && <Aviso tipo="atencion">No se pudo actualizar: {error}. Se conserva el último snapshot.</Aviso>}
      {!datos?.state ? <SinConexion configured={datos?.configured} /> : (
        <>
          {!datos.connected && <Aviso tipo="error">La información está desactualizada: Iroha no está enviando telemetría.</Aviso>}
          {vista === "resumen" && <Resumen datos={datos} rango={rango} />}
          {vista === "invitados" && <Invitados datos={datos} rango={rango} />}
          {vista === "almacenamiento" && <Almacenamiento datos={datos} />}
          {vista === "actividad" && <ActividadVista datos={datos} />}
        </>
      )}
    </>
  );
}
