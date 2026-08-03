// Semillas: solo lo que hace falta para que el portal sea usable el primer día.
// Nunca pisa datos existentes.

import { collection, createDocument } from "./index.js";
import { REGLAS_INICIALES } from "../domain/categories.js";

export async function sembrarReglasIniciales({ log = console.log } = {}) {
  const rules = collection("category_rules");
  if ((await rules.estimatedDocumentCount()) > 0) return 0;

  await rules.insertMany(
    REGLAS_INICIALES.map((regla) =>
      createDocument({
        pattern: regla.pattern,
        match_type: regla.match_type ?? "contiene",
        category: regla.category,
        direction: regla.direction ?? null,
        priority: regla.priority,
        active: true,
      }),
    ),
  );

  log(`✓ ${REGLAS_INICIALES.length} reglas de categoría iniciales.`);
  return REGLAS_INICIALES.length;
}
