// Lo que debes y lo que te deben.
//
// Las dos cosas se llevan igual: por cuotas pactadas o abonando libre, con el
// saldo bajando por lo que de verdad se pagó y un historial que lo explica.

import { useState } from "react";
import { Check, Coins, History, Plus } from "lucide-react";
import { api, dinero } from "../api.js";
import { Aviso, Campo, Cargando, Kpi, MetaLinea, Modal, TablaVacia } from "../components/comunes.jsx";
import { Avance, FormularioAbono, HistorialAbonos } from "../components/saldos.jsx";
import { useDatos } from "../hooks.js";

// Vocabulario de cada lado. El modelo es el mismo, pero "abonar a una deuda" y
// "anotar lo que te devolvieron" no se dicen igual.
const TEXTOS = {
  deuda: {
    ruta: "/api/deudas",
    clave: "deuda",
    titulo: "Abonar a",
    saldo: "Saldo pendiente",
    cuanto: "¿Cuánto abonaste?",
    todo: "Saldar del todo",
    boton: "Registrar abono",
    notas: "De dónde salió el dinero, por ejemplo",
    capital: "Capital",
    abonado: "Abonado",
    previo: (importe) =>
      `Esta deuda ya venía con ${importe} abonados de antes de usar el portal, así que ese pago no aparece en la lista.`,
  },
  cobro: {
    ruta: "/api/deudores",
    clave: "deudor",
    titulo: "Anotar un pago de",
    saldo: "Falta por cobrar",
    cuanto: "¿Cuánto te pagó?",
    todo: "Pagó todo",
    boton: "Registrar pago",
    notas: "Cómo te lo pasó, por ejemplo",
    capital: "Le prestaste",
    abonado: "Ya te devolvió",
    previo: (importe) =>
      `Este cobro ya figuraba con ${importe} recuperados de antes de usar el portal, así que ese pago no aparece en la lista.`,
  },
};

export default function Deudas() {
  const [creando, setCreando] = useState(null);
  const [abonando, setAbonando] = useState(null);
  const [viendo, setViendo] = useState(null);
  const [error, setError] = useState(null);

  const { datos, error: errorCarga, recargar } = useDatos(async () => {
    const [deudas, deudores] = await Promise.all([api.get("/api/deudas"), api.get("/api/deudores")]);
    return { deudas, deudores };
  }, []);

  const accion = async (ejecutar) => {
    setError(null);
    try {
      await ejecutar();
      recargar();
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  if (!datos) return errorCarga ? <Aviso tipo="error">{errorCarga}</Aviso> : <Cargando />;

  const { deudas, deudores } = datos;
  const { resumen } = deudas;
  const cobros = deudores.resumen;

  const abrirAbono = (fila, lado) =>
    setAbonando({ lado, saldo: { ...fila, nombre: lado === "deuda" ? fila.concepto : fila.deudor } });
  const abrirHistorial = (fila, lado) =>
    setViendo({ lado, saldo: { ...fila, nombre: lado === "deuda" ? fila.concepto : fila.deudor } });

  return (
    <>
      <MetaLinea
        partes={[
          "Deudas",
          `${resumen.activas} activas`,
          `${cobros.pendientes} por cobrar`,
        ]}
      />

      <div className="cabecera-pagina">
        <div>
          <h1>
            Deudas y <em>deudores</em>
          </h1>
          <p>Lo que debes y lo que te deben, por cuotas o abonando libre.</p>
        </div>
      </div>

      {(error || errorCarga) && <Aviso tipo="error">{error ?? errorCarga}</Aviso>}

      <div className="rejilla aparece" style={{ marginBottom: 22 }}>
        <Kpi
          etiqueta="Saldo pendiente de tus deudas"
          centavos={-resumen.restanteCentavos}
          pie={
            resumen.capitalCentavos > 0
              ? `Llevas abonado ${dinero(resumen.abonadoCentavos)} de ${dinero(resumen.capitalCentavos)}`
              : undefined
          }
        />
        <Kpi
          etiqueta="Te falta por cobrar"
          centavos={cobros.pendienteCentavos}
          pie={
            cobros.prestadoCentavos > 0
              ? `Ya recuperaste ${dinero(cobros.recuperadoCentavos)} de ${dinero(cobros.prestadoCentavos)}`
              : undefined
          }
        />
        <Kpi
          etiqueta="Balance"
          centavos={cobros.pendienteCentavos - resumen.restanteCentavos}
          pie="Lo que te deben menos lo que debes"
        />
      </div>

      <div className="entre" style={{ marginBottom: 10 }}>
        <h2>Lo que debes</h2>
        <button onClick={() => setCreando("deuda")}>
          <Plus size={14} /> Nueva deuda
        </button>
      </div>

      <div className="tabla-envoltura aparece" style={{ marginBottom: 30 }}>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th className="num">Capital</th>
              <th className="num">Día</th>
              <th>Avance</th>
              <th className="num">Restante</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {deudas.deudas.length === 0 ? (
              <TablaVacia columnas={6} texto="No tienes deudas registradas." />
            ) : (
              deudas.deudas.map((deuda) => (
                <tr key={deuda.id} style={{ opacity: deuda.activa && !deuda.saldada ? 1 : 0.55 }}>
                  <td>
                    {deuda.concepto}
                    <div className="tenue">
                      <span className="etiqueta" style={{ marginRight: 6 }}>
                        {deuda.tipo === "cuotas" ? "por cuotas" : "abono libre"}
                      </span>
                      {deuda.saldada && <span className="etiqueta etiqueta--ok">saldada</span>}
                    </div>
                    {deuda.notas && <div className="tenue">{deuda.notas}</div>}
                  </td>
                  <td className="num">{dinero(deuda.centavos, deuda.moneda)}</td>
                  <td className="num">{deuda.dia ?? "—"}</td>
                  <td style={{ minWidth: 150 }}>
                    <Avance
                      saldo={deuda}
                      textoLibre={`${dinero(deuda.abonadoCentavos, deuda.moneda)} abonado`}
                    />
                  </td>
                  <td className={`num ${deuda.saldada ? "positivo" : "negativo"}`}>
                    {dinero(deuda.restanteCentavos, deuda.moneda)}
                    {deuda.cuotaSugeridaCentavos > 0 && (
                      <div className="tenue">cuota ≈ {dinero(deuda.cuotaSugeridaCentavos, deuda.moneda)}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 2 }}>
                      {!deuda.saldada && (
                        <button
                          className="icono"
                          title="Registrar un abono por el importe que sea"
                          onClick={() => abrirAbono(deuda, "deuda")}
                        >
                          <Coins size={14} />
                        </button>
                      )}
                      {!deuda.saldada && deuda.tipo === "cuotas" && deuda.pendientes > 0 && (
                        <button
                          className="icono"
                          title={`Pagué la cuota (${dinero(deuda.cuotaSugeridaCentavos, deuda.moneda)})`}
                          onClick={() => accion(() => api.post(`/api/deudas/${deuda.id}/cuota`))}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        className="icono"
                        title="Ver el historial de abonos"
                        onClick={() => abrirHistorial(deuda, "deuda")}
                      >
                        <History size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="entre" style={{ marginBottom: 10 }}>
        <h2>Lo que te deben</h2>
        <button onClick={() => setCreando("deudor")}>
          <Plus size={14} /> Nuevo deudor
        </button>
      </div>

      <div className="tabla-envoltura aparece">
        <table>
          <thead>
            <tr>
              <th>Deudor</th>
              <th className="num">Le prestaste</th>
              <th className="num">Día</th>
              <th>Avance</th>
              <th className="num">Falta</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {deudores.deudores.length === 0 ? (
              <TablaVacia columnas={6} texto="Nadie te debe nada registrado." />
            ) : (
              deudores.deudores.map((deudor) => (
                <tr key={deudor.id} style={{ opacity: deudor.estado === "pendiente" ? 1 : 0.55 }}>
                  <td>
                    {deudor.deudor}
                    <div className="tenue">
                      <span className="etiqueta" style={{ marginRight: 6 }}>
                        {deudor.tipo === "cuotas" ? "por cuotas" : "abono libre"}
                      </span>
                      <span
                        className={`etiqueta ${deudor.estado === "cobrado" ? "etiqueta--ok" : ""}`}
                      >
                        {deudor.estado}
                      </span>
                    </div>
                    {deudor.notas && <div className="tenue">{deudor.notas}</div>}
                  </td>
                  <td className="num">{dinero(deudor.centavos, deudor.moneda)}</td>
                  <td className="num">{deudor.dia ?? "—"}</td>
                  <td style={{ minWidth: 150 }}>
                    <Avance
                      saldo={deudor}
                      textoLibre={`${dinero(deudor.abonadoCentavos, deudor.moneda)} recuperado`}
                    />
                  </td>
                  <td className={`num ${deudor.saldada ? "positivo" : ""}`}>
                    {dinero(deudor.restanteCentavos, deudor.moneda)}
                    {deudor.cuotaSugeridaCentavos > 0 && (
                      <div className="tenue">
                        cuota ≈ {dinero(deudor.cuotaSugeridaCentavos, deudor.moneda)}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 2 }}>
                      {deudor.estado === "pendiente" && !deudor.saldada && (
                        <button
                          className="icono"
                          title="Anotar un pago que te hizo"
                          onClick={() => abrirAbono(deudor, "cobro")}
                        >
                          <Coins size={14} />
                        </button>
                      )}
                      {deudor.estado === "pendiente" && !deudor.saldada && (
                        <button
                          className="icono"
                          title="Ya me pagó todo"
                          onClick={() =>
                            accion(() => api.patch(`/api/deudores/${deudor.id}`, { estado: "cobrado" }))
                          }
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        className="icono"
                        title="Ver el historial de pagos"
                        onClick={() => abrirHistorial(deudor, "cobro")}
                      >
                        <History size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creando && (
        <FormularioSaldo
          tipo={creando}
          alCerrar={() => setCreando(null)}
          alGuardar={() => {
            setCreando(null);
            recargar();
          }}
        />
      )}

      {abonando && (
        <FormularioAbono
          saldo={abonando.saldo}
          ruta={TEXTOS[abonando.lado].ruta}
          textos={TEXTOS[abonando.lado]}
          alCerrar={() => setAbonando(null)}
          alGuardar={() => {
            setAbonando(null);
            recargar();
          }}
        />
      )}

      {viendo && (
        <HistorialAbonos
          saldo={viendo.saldo}
          ruta={TEXTOS[viendo.lado].ruta}
          clave={TEXTOS[viendo.lado].clave}
          textos={TEXTOS[viendo.lado]}
          alCerrar={() => setViendo(null)}
          alCambiar={recargar}
        />
      )}
    </>
  );
}

function FormularioSaldo({ tipo, alCerrar, alGuardar }) {
  const esDeuda = tipo === "deuda";
  const [valores, setValores] = useState({
    nombre: "",
    importe: "",
    dia: "",
    // Una deuda propia suele venir de un crédito con cuotas; lo que te deben,
    // casi nunca.
    tipoSaldo: esDeuda ? "cuotas" : "libre",
    cuotas: "1",
    pagadas: "0",
    abonado: "",
    notas: "",
  });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (evento) =>
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }));

  const porCuotas = valores.tipoSaldo === "cuotas";

  const enviar = async (evento) => {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    const comun = {
      importe: valores.importe,
      dia: valores.dia || null,
      tipo: valores.tipoSaldo,
      cuotas: porCuotas ? Number(valores.cuotas) : undefined,
      pagadas: porCuotas ? Number(valores.pagadas) : undefined,
      abonado: valores.abonado || undefined,
      notas: valores.notas,
    };

    try {
      if (esDeuda) {
        await api.post("/api/deudas", { ...comun, concepto: valores.nombre });
      } else {
        await api.post("/api/deudores", { ...comun, deudor: valores.nombre });
      }
      alGuardar();
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={esDeuda ? "Nueva deuda" : "Nuevo deudor"} alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        {error && <Aviso tipo="error">{error}</Aviso>}

        <Campo etiqueta={esDeuda ? "Concepto" : "¿Quién te debe?"}>
          <input value={valores.nombre} onChange={cambiar("nombre")} required autoFocus />
        </Campo>

        <div className="campos">
          <Campo etiqueta={esDeuda ? "Capital total" : "¿Cuánto le prestaste?"}>
            <input value={valores.importe} onChange={cambiar("importe")} required />
          </Campo>
          <Campo etiqueta="Día del mes">
            <input value={valores.dia} onChange={cambiar("dia")} />
          </Campo>
        </div>

        <Campo etiqueta={esDeuda ? "¿Cómo se paga?" : "¿Cómo te va a pagar?"}>
          <select value={valores.tipoSaldo} onChange={cambiar("tipoSaldo")}>
            <option value="cuotas">Por cuotas pactadas</option>
            <option value="libre">Abonando libre, sin cuota fija</option>
          </select>
        </Campo>

        {porCuotas ? (
          <div className="campos">
            <Campo etiqueta="Cuotas totales">
              <input type="number" min="1" value={valores.cuotas} onChange={cambiar("cuotas")} required />
            </Campo>
            <Campo etiqueta={esDeuda ? "Cuotas ya pagadas" : "Cuotas ya cobradas"}>
              <input type="number" min="0" value={valores.pagadas} onChange={cambiar("pagadas")} />
            </Campo>
          </div>
        ) : (
          <Campo etiqueta={esDeuda ? "¿Ya habías abonado algo? (opcional)" : "¿Ya te devolvió algo? (opcional)"}>
            <input
              value={valores.abonado}
              onChange={cambiar("abonado")}
              placeholder="Déjalo vacío si todavía no hay nada"
            />
          </Campo>
        )}

        <Campo etiqueta="Notas">
          <input value={valores.notas} onChange={cambiar("notas")} />
        </Campo>

        <div className="acciones">
          <button className="principal" type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={alCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
