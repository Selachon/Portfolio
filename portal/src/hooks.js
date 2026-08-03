// Hooks compartidos. Viven aparte de los componentes para que el recargado en
// caliente de React siga funcionando durante el desarrollo.

import { useCallback, useEffect, useState } from "react";

/**
 * Carga datos de la API y los mantiene sincronizados con sus dependencias.
 *
 * Descarta la respuesta si mientras llegaba cambiaron los filtros o la pantalla
 * se desmontó: sin eso, teclear rápido en un filtro puede acabar pintando el
 * resultado de una consulta anterior.
 *
 * `recargar()` repite la última petición, para usarlo después de guardar algo.
 */
export function useDatos(obtener, dependencias) {
  const [estado, setEstado] = useState({ datos: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;

    (async () => {
      try {
        const datos = await obtener();
        if (vigente) setEstado({ datos, error: null });
      } catch (fallo) {
        if (vigente) setEstado((previo) => ({ ...previo, error: fallo.message }));
      }
    })();

    return () => {
      vigente = false;
    };
    // `obtener` se recrea en cada render; las dependencias reales las declara
    // quien llama, más la versión que fuerza la recarga manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version]);

  const recargar = useCallback(() => setVersion((valor) => valor + 1), []);

  return { ...estado, recargar };
}
