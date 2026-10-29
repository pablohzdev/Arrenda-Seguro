// Fechas del contrato con su rol: "inicio" ("a partir del 01/01/2026"),
// "fin" ("vence el 15/02/2027") o null si ninguna frase de rol la precede.

import { dividirOraciones } from "./arbolExpresiones.js";
import { extraerFechas, palabras, patronDeFrases, plegar } from "./texto.js";

// Palabras máximas entre la frase de rol y la fecha.
const DISTANCIA_ROL = 6;

const cache = new WeakMap();
function regexRoles(idioma) {
  if (!cache.has(idioma)) {
    const { inicio, fin } = idioma.rolesFecha;
    cache.set(idioma, new RegExp(`(${patronDeFrases(inicio)})|(${patronDeFrases(fin)})`, "gu"));
  }
  return cache.get(idioma);
}

export function extraerFechasConRol(paginas, idioma) {
  const roles = regexRoles(idioma);
  const resultado = [];

  paginas.forEach(p => {
    dividirOraciones(p.texto).forEach(o => {
      const plegada = plegar(o.texto);
      let desde = 0;

      for (const f of extraerFechas(o.texto, idioma.formatoFecha)) {
        // La frase de rol debe estar entre la fecha anterior y ésta.
        const tramo = plegada.slice(desde, f.indice);
        let rol = null;
        let finRol = 0;
        for (const m of tramo.matchAll(roles)) {
          rol = m[1] !== undefined ? "inicio" : "fin";
          finRol = m.index + m[0].length;
        }
        if (rol && palabras(tramo.slice(finRol)).length > DISTANCIA_ROL) rol = null;

        resultado.push({
          texto: f.texto,
          fecha: f.fecha,
          rol,
          pagina: p.pagina,
          inicio: o.inicio + f.indice,
          fin: o.inicio + f.indice + f.texto.length
        });
        desde = f.indice + f.texto.length;
      }
    });
  });

  return resultado;
}

// Duración en meses entre la primera fecha de inicio y la primera de fin.
export function mesesEntreFechas(fechas) {
  const ini = fechas.find(f => f.rol === "inicio");
  const fin = fechas.find(f => f.rol === "fin");
  if (!ini || !fin) return undefined;
  return (fin.fecha - ini.fecha) / (1000 * 60 * 60 * 24 * 30.44);
}
