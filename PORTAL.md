# Portal privado de Kora

Portal cerrado con espacios independientes. Finanzas sustituye el flujo actual
de hoja de cálculo y extractos; Infraestructura monitoriza Proxmox sin exponer
la red doméstica a Render.

No tiene nada que ver con el sitio público de este mismo repositorio: son dos
aplicaciones independientes, con despliegues independientes.

## Qué hace

- **Movimientos** — alta manual, edición, filtros por cuenta, mes, categoría,
  sentido y texto; exportación a CSV.
- **Importación** — sube el extracto en PDF y lo convierte a filas, o pega una
  tabla (CSV, tabulaciones o Markdown). Las dos rutas pasan por una pantalla de
  revisión: **nada entra a la contabilidad sin que alguien lo confirme.**
- **Reportes mensuales** — el mismo cierre que se hacía a mano: pivot de gastos e
  ingresos por categoría, INGRESOS / GASTOS / TOTAL / PROMEDIO DIARIO LIBRE,
  comparación con el mes anterior, y el PDF del extracto adjunto. Al cerrar el
  mes, las cifras quedan congeladas.
- **Presupuesto fijo** — conceptos recurrentes con día de cobro y estado
  pagado/pendiente mes a mes, admitiendo un importe real distinto del planeado.
- **Deudas y deudores** — cuotas con saldo restante actualizado atómicamente, y
  quién te debe qué.
- **Ajustes** — cuentas, reglas de clasificación automática, personas con acceso
  y registro de auditoría.
- **Infraestructura** — estado vivo de nodos, CT y VMs, históricos, discos,
  SMART, almacenamiento, red, tareas, actualizaciones, backups y alertas.

## Decisiones que conviene conocer

**El dinero son enteros de centavos, nunca coma flotante.** `0.1 + 0.2` no da
`0.3`, y en un libro de cuentas ese error se acumula hasta descuadrar el mes.
La conversión desde texto se hace manipulando cadenas, sin pasar por
`parseFloat` en ningún momento.

**COP y USD no se mezclan.** Cada movimiento toma la moneda de su cuenta y los
reportes siempre se calculan por una sola moneda.

**El signo y el sentido no pueden separarse.** El único repositorio que inserta
movimientos deriva el sentido del signo y rechaza ceros. Todas las entradas,
incluidos PDF y CSV, pasan por ese mismo camino.

**Los perfiles de banco son declarativos.** Viven en `server/src/parsers/profiles.js` y describen
la forma de la línea, no el motor. Hay dos maneras: `fecha` para los extractos que ponen el importe
al final, y `fila` para los que lo ponen en medio con más columnas detrás. Un perfil solo se elige
si el propio documento lo delata; y si acierta el banco pero no consigue leer ni una fila —porque
cambiaron la maquetación— se recurre al perfil genérico y se avisa.

Tres cosas que aprendimos leyendo extractos de verdad, y que están cubiertas por pruebas:
el importe de la fila puede no ser el último número (el segundo suele ser una equivalencia en otra
moneda); las comisiones a veces no traen moneda y escriben `N/A`; y las descripciones largas se
parten en varias líneas, con el principio arriba de la fila y el final abajo.

**El PDF puede venir cifrado.** Los bancos colombianos suelen protegerlo con la cédula del titular.
El portal lo detecta, pide la contraseña y reintenta. La contraseña no se guarda: se usa para leer
y se descarta.

**Los duplicados se detectan, no se prohíben.** Cada movimiento lleva la huella
`sha256(cuenta + fecha + descripción normalizada + importe)` más un ordinal. Dos
cobros idénticos el mismo día son posibles —pasa constantemente—, pero el
importador avisa y deja decidir.

**El portal y la API comparten origen.** El mismo servicio de Node sirve la SPA y
`/api`, para que la cookie de sesión sea de primera parte: sin CORS, sin cookies
de terceros (que Safari bloquea) y con un CSP estricto que no permite cargar
nada de fuera, ni siquiera fuentes.

**Roles.** El propietario hace todo. El asesor registra, corrige, importa y arma
reportes, pero no borra movimientos ni cuentas, no gestiona accesos y no puede
reabrir un mes cerrado. Toda escritura queda en la auditoría.

## Estructura

```
server/            API en Fastify; también sirve la SPA compilada
  src/db/          conexión MongoDB e índices
  src/auth/        contraseñas, sesiones, guardas, límite de intentos
  src/domain/      dinero, fechas, movimientos, categorías
  src/parsers/     lectura de extractos en PDF y perfiles de banco
  src/import/      lectura de tablas pegadas
  src/routes/      endpoints
  scripts/         migraciones desde la hoja y desde PGlite
  test/            pruebas (datos inventados, formatos reales)
portal/            SPA en React que consume la API
agent/proxmox/      colector sin dependencias e instalación systemd para PVE
```

## Desarrollo local

El servidor usa MongoDB en local y en producción. Puedes apuntar el `.env` a un
cluster de Atlas de desarrollo o a MongoDB Community. Las pruebas no necesitan
ninguna instalación: levantan un replica set efímero por su cuenta.

```bash
cd server && npm ci && cp .env.example .env   # rellena MONGODB_URI
npm run dev                                    # API en http://localhost:8787

cd ../portal && npm ci
npm run dev                                    # portal en http://localhost:5180
```

Pruebas del servidor:

```bash
cd server && npm test
```

## Despliegue

Un solo Web Service de Render compila React y sirve tanto la SPA como Fastify.
Los datos viven en MongoDB Atlas, por lo que el filesystem efímero de Render no
contiene estado financiero.

1. En Atlas, deja al usuario de la aplicación únicamente el rol `readWrite`
   sobre la base `kora` y genera una contraseña nueva.
2. En Render, crea un **Blueprint** desde este repositorio. `render.yaml` compila
   el portal, instala el servidor y configura el health check.
3. Cuando Render lo solicite, pega la URI nueva como `MONGODB_URI`. No añadas la
   URI al archivo YAML ni a Git.
4. Para el primer despliegue, permite temporalmente la conexión desde Render en
   la IP Access List de Atlas. Después copia los rangos de **Connect → Outbound**
   del servicio y deja solo esos rangos autorizados.
5. Si usarás el dominio propio, crea `portal.korabysela.dev` en Render y apunta
   el CNAME indicado. Si usarás el subdominio de Render, cambia `PUBLIC_ORIGIN`
   por `https://kora-portal.onrender.com`.
6. Comprueba `GET /api/salud` y entra con las credenciales existentes. Los datos
   ya migrados no necesitan variables de bootstrap.

En una base completamente vacía, añade temporalmente
`BOOTSTRAP_OWNER_EMAIL`, `BOOTSTRAP_OWNER_PASSWORD` y `BOOTSTRAP_OWNER_NAME` en
el panel de Render. Bórralas después de cambiar la contraseña inicial.

Los índices se verifican automáticamente en cada arranque.

## Monitoreo de Proxmox

La integración es de salida: el agente consulta `127.0.0.1:8006` dentro de
Iroha y publica snapshots por HTTPS en Render. No se abre el puerto 8006, Render
no entra a Tailscale y el secreto del token de Proxmox nunca sale del nodo.

### 1. Rotar y preparar el token de Proxmox

Todo secreto pegado en un chat debe considerarse comprometido. Elimina el token
anterior, vuelve a crearlo y conserva el nuevo valor fuera del repositorio:

```bash
pveum user token remove kora-monitor@pve portal
pveum user token add kora-monitor@pve portal -privsep 1
pveum acl modify / -token 'kora-monitor@pve!portal' -role PVEAuditor
pveum user token permissions kora-monitor@pve portal
```

### 2. Configurar Render

Genera un secreto distinto al de Proxmox:

```bash
openssl rand -hex 32
```

Guárdalo como `PROXMOX_INGEST_TOKEN` en **Environment** del servicio de Render.
El Blueprint ya declara la variable y las retenciones. Despliega la versión
nueva antes de encender el agente.

### 3. Instalar el agente en Iroha

Con el repositorio actualizado dentro de Iroha:

```bash
cd agent/proxmox
./install.sh
nano /etc/kora-proxmox-agent.env
```

En ese archivo coloca el secreto nuevo de Proxmox y, en `KORA_INGEST_TOKEN`, el
mismo secreto generado para Render. El archivo queda con permisos `0600`.

Prueba una captura antes de habilitar el temporizador:

```bash
systemctl start kora-proxmox-agent.service
journalctl -u kora-proxmox-agent.service -n 30 --no-pager
systemctl enable --now kora-proxmox-agent.timer
systemctl list-timers kora-proxmox-agent.timer
```

El servicio usa un usuario dinámico, endurecimiento de systemd y conexiones de
solo lectura. Envía cada 20 segundos. MongoDB conserva datos crudos por 7 días,
puntos de 5 minutos por 31 días y puntos horarios/diarios por 400 días.

### Límites del plan gratuito

Render duerme el servicio gratuito tras 15 minutos sin tráfico, así que la
primera visita puede tardar alrededor de un minuto. El proceso puede reiniciarse
sin perder datos porque Atlas está fuera de su filesystem.

## Respaldos

El respaldo controlado por la propietaria sigue siendo `GET /api/export/todo`:
baja un JSON con todo, extractos incluidos. **Guárdalo cifrado: contiene
información financiera.** No incluye contraseñas ni sesiones.

## Migrar desde la hoja

Exporta cada pestaña como CSV y pásala al script. Es idempotente.

```bash
cd server
node --env-file=.env scripts/importar-hoja.js movimientos "Cuenta principal" feb-2026.csv --anio 2026
node --env-file=.env scripts/importar-hoja.js presupuesto presupuesto.csv
node --env-file=.env scripts/importar-hoja.js deudas deudas.csv
node --env-file=.env scripts/importar-hoja.js deudores deudores.csv
```

También se puede hacer todo desde el portal, pegando cada pestaña en
**Importar → Pegar una tabla**.

## Seguridad

- Sin registro público. El primer usuario se crea por variables de entorno con
  contraseña temporal obligatoria.
- Contraseñas con scrypt (memory-hard, de la librería estándar de Node: cero
  dependencias nativas que puedan romper un despliegue).
- Sesiones opacas en base de datos; solo se guarda el hash del token, así que
  quien lea la base no puede suplantar a nadie. Revocables al instante.
- Cookie `HttpOnly; Secure; SameSite=Lax`. Ningún token en `localStorage`.
- Límite de intentos de acceso por correo y por IP.
- Mensaje de error único ante credenciales malas, y mismo tiempo de respuesta
  exista o no el correo: la duración no delata qué correos están registrados.
- Cambiar la contraseña cierra las demás sesiones. Desactivar a alguien lo echa
  en el acto.
- CSP estricta, HSTS, `noindex`, y `Cache-Control: no-store` en toda la API.
- Los PDF se validan por su firma binaria, no por la extensión.
