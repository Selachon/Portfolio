// Lo que debes (en cuotas) y lo que te deben.

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { api, dinero } from "../api.js";
import {
  Aviso,
  Barra,
  Campo,
  Cargando,
  Kpi,
  MetaLinea,
  Modal,
  TablaVacia,
} from "../components/comunes.jsx";
import { useDatos } from "../hooks.js";

export default function Deudas() {
  const [creando, setCreando] = useState(null);

  const { datos, error, recargar } = useDatos(async () => {
    const [deudas, deudores] = await Promise.all([api.get("/api/deudas"), api.get("/api/deudores")]);
    return { deudas, deudores };
  }, []);

  const pagarCuota = async (deuda) => {
    await api.post(`/api/deudas/${deuda.id}/cuota`);
    recargar();
  };

  const cobrar = async (deudor) => {
    await api.patch(`/api/deudores/${deudor.id}`, { estado: "cobrado" });
    recargar();
  };

  if (!datos) return error ? <Aviso tipo="error">{error}</Aviso> : <Cargando />;

  const { deudas, deudores } = datos;

  return (
    <>
      <MetaLinea partes={["Deudas", `${deudas.resumen.cuotasPendientes} cuotas pendientes`]} />

      <div className="cabecera-pagina">
        <div>
          <h1>
            Deudas y <em>deudores</em>
          </h1>
          <p>Lo que debes en cuotas y lo que te deben.</p>
        </div>
      </div>

      {error && <Aviso tipo="error">{error}</Aviso>}

      <div className="rejilla aparece" style={{ marginBottom: 22 }}>
        <Kpi
          etiqueta="Saldo pendiente de tus deudas"
          centavos={-deudas.resumen.restanteCentavos}
          pie={`${deudas.resumen.cuotasPendientes} cuota(s) por pagar`}
        />
        <Kpi etiqueta="Por cobrar" centavos={deudores.resumen.pendienteCentavos} />
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
              <th className="num">Valor</th>
              <th className="num">Día</th>
              <th className="num">Cuotas</th>
              <th className="num">Restante</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {deudas.deudas.length === 0 ? (
              <TablaVacia columnas={6} texto="No tienes deudas registradas." />
            ) : (
              deudas.deudas.map((deuda) => (
                <tr key={deuda.id} style={{ opacity: deuda.activa ? 1 : 0.5 }}>
                  <td>
                    {deuda.concepto}
                    {deuda.notas && <div className="tenue">{deuda.notas}</div>}
                  </td>
                  <td className="num">{dinero(deuda.centavos, deuda.moneda)}</td>
                  <td className="num">{deuda.dia ?? "—"}</td>
                  <td className="num">
                    {deuda.pagadas} / {deuda.cuotas}
                    <Barra porcentaje={(deuda.pagadas / deuda.cuotas) * 100} />
                  </td>
                  <td className="num negativo">{dinero(deuda.restanteCentavos, deuda.moneda)}</td>
                  <td>
                    {deuda.pendientes > 0 && (
                      <button className="icono" title="Registrar una cuota pagada" onClick={() => pagarCuota(deuda)}>
                        <Check size={14} />
                      </button>
                    )}
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
              <th className="num">Valor</th>
              <th className="num">Día</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {deudores.deudores.length === 0 ? (
              <TablaVacia columnas={5} texto="Nadie te debe nada registrado." />
            ) : (
              deudores.deudores.map((deudor) => (
                <tr key={deudor.id}>
                  <td>
                    {deudor.deudor}
                    {deudor.notas && <div className="tenue">{deudor.notas}</div>}
                  </td>
                  <td className="num">{dinero(deudor.centavos, deudor.moneda)}</td>
                  <td className="num">{deudor.dia ?? "—"}</td>
                  <td>
                    <span className={`etiqueta ${deudor.estado === "cobrado" ? "etiqueta--ok" : ""}`}>
                      {deudor.estado}
                    </span>
                  </td>
                  <td>
                    {deudor.estado === "pendiente" && (
                      <button className="icono" title="Marcar como cobrado" onClick={() => cobrar(deudor)}>
                        <Check size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creando && (
        <FormularioDeuda
          tipo={creando}
          alCerrar={() => setCreando(null)}
          alGuardar={() => {
            setCreando(null);
            recargar();
          }}
        />
      )}
    </>
  );
}

function FormularioDeuda({ tipo, alCerrar, alGuardar }) {
  const esDeuda = tipo === "deuda";
  const [valores, setValores] = useState({
    concepto: "",
    deudor: "",
    importe: "",
    dia: "",
    cuotas: "1",
    pagadas: "0",
    notas: "",
  });
  const [error, setError] = useState(null);

  const cambiar = (campo) => (evento) =>
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }));

  const enviar = async (evento) => {
    evento.preventDefault();
    try {
      if (esDeuda) {
        await api.post("/api/deudas", {
          concepto: valores.concepto,
          importe: valores.importe,
          dia: valores.dia || null,
          cuotas: Number(valores.cuotas),
          pagadas: Number(valores.pagadas),
          notas: valores.notas,
        });
      } else {
        await api.post("/api/deudores", {
          deudor: valores.deudor,
          importe: valores.importe,
          dia: valores.dia || null,
          notas: valores.notas,
        });
      }
      alGuardar();
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  return (
    <Modal titulo={esDeuda ? "Nueva deuda" : "Nuevo deudor"} alCerrar={alCerrar}>
      <form onSubmit={enviar}>
        {error && <Aviso tipo="error">{error}</Aviso>}

        <Campo etiqueta={esDeuda ? "Concepto" : "¿Quién te debe?"}>
          <input
            value={esDeuda ? valores.concepto : valores.deudor}
            onChange={cambiar(esDeuda ? "concepto" : "deudor")}
            required
            autoFocus
          />
        </Campo>

        <div className="campos">
          <Campo etiqueta="Valor">
            <input value={valores.importe} onChange={cambiar("importe")} required />
          </Campo>
          <Campo etiqueta="Día del mes">
            <input value={valores.dia} onChange={cambiar("dia")} />
          </Campo>
        </div>

        {esDeuda && (
          <div className="campos">
            <Campo etiqueta="Cuotas totales">
              <input type="number" min="1" value={valores.cuotas} onChange={cambiar("cuotas")} required />
            </Campo>
            <Campo etiqueta="Cuotas ya pagadas">
              <input type="number" min="0" value={valores.pagadas} onChange={cambiar("pagadas")} />
            </Campo>
          </div>
        )}

        <Campo etiqueta="Notas">
          <input value={valores.notas} onChange={cambiar("notas")} />
        </Campo>

        <div className="acciones">
          <button className="principal" type="submit">
            Guardar
          </button>
          <button type="button" onClick={alCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
