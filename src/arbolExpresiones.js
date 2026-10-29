// Árbol de expresiones por oración: Oracion -> Clausula -> Token.
// Una cláusula se delimita por , ; : y las dependencias se resuelven así:
//  - una negación sólo afecta a un token de su misma cláusula (ver negacionPrevia);
//  - un mitigador afecta a los tokens de su cláusula; si su cláusula no tiene
//    tokens sensibles, depende de la cláusula vecina a la que modifica
//    (la siguiente si abre la oración, "Salvo X, ..."; si no, la anterior).

import { negacionPrevia, plegar, regexDeFrases } from "./texto.js";

// Abreviaturas cuyo punto no cierra la oración.
const ABREVIATURAS = new Set([
  "no", "nº", "num", "av", "avda", "c", "sr", "sra", "srta", "dr", "dra", "lic", "ing",
  "art", "arts", "inc", "pag", "ej", "etc", "st", "mr", "mrs", "ms", "apt", "ltd", "co", "vs"
]);

const cache = new WeakMap();
function reglasDe(idioma) {
  if (!cache.has(idioma)) {
    cache.set(idioma, {
      tokens: Object.entries(idioma.tokens).map(([tipo, lista]) => ({ tipo, regex: regexDeFrases(lista) })),
      mitigadores: regexDeFrases(idioma.mitigadores)
    });
  }
  return cache.get(idioma);
}

// Corta en . ! ? seguidos de espacio, salvo tras abreviaturas ("Av.", "No. 32")
// o numerales de lista cortos ("1. The tenant...").
export function dividirOraciones(texto) {
  const oraciones = [];
  let inicio = 0;
  for (const m of texto.matchAll(/[.!?]+(?=\s|$)/g)) {
    const previa = texto.slice(inicio, m.index).split(/\s+/).pop() || "";
    if (m[0] === "." && (ABREVIATURAS.has(plegar(previa)) || /^\d{1,2}$/.test(previa))) continue;
    const fin = m.index + m[0].length;
    oraciones.push({ inicio, texto: texto.slice(inicio, fin) });
    inicio = fin;
  }
  if (texto.slice(inicio).trim()) oraciones.push({ inicio, texto: texto.slice(inicio) });
  return oraciones;
}

export function construirArbol(oracion, idioma) {
  const reglas = reglasDe(idioma);
  const plegada = plegar(oracion.texto);
  const clausulas = [...oracion.texto.matchAll(/[^,;:]+[,;:]?/g)].map(m => ({
    inicio: m.index,
    texto: m[0],
    tokens: [],
    mitigadores: []
  }));
  const clausulaDe = indice => clausulas.find(c => indice >= c.inicio && indice < c.inicio + c.texto.length);

  for (const { tipo, regex } of reglas.tokens) {
    for (const m of plegada.matchAll(regex)) {
      const clausula = clausulaDe(m.index);
      clausula?.tokens.push({
        tipo,
        palabra: oracion.texto.slice(m.index, m.index + m[0].length),
        inicio: m.index - clausula.inicio
      });
    }
  }

  for (const m of plegada.matchAll(reglas.mitigadores)) {
    clausulaDe(m.index)?.mitigadores.push(oracion.texto.slice(m.index, m.index + m[0].length));
  }

  return { ...oracion, clausulas };
}

// A qué cláusula modifica cada mitigador (dependencia gramatical).
function resolverMitigadores(clausulas, idioma) {
  const tieneSensibles = c => c.tokens.some(t => idioma.sensibles.includes(t.tipo));
  const mitigadas = new Map();
  clausulas.forEach((c, i) => {
    if (c.mitigadores.length === 0) return;
    let destino = c;
    if (!tieneSensibles(c)) {
      const vecina = i === 0 ? clausulas[i + 1] : clausulas[i - 1];
      if (vecina && tieneSensibles(vecina)) destino = vecina;
    }
    mitigadas.set(destino, c.mitigadores[0]);
  });
  return mitigadas;
}

// Devuelve cada token con su estado (ACTIVO | NEGADO | MITIGADO) y el motivo.
export function evaluarArbol(arbol, idioma) {
  const mitigadas = resolverMitigadores(arbol.clausulas, idioma);
  const resultados = [];

  for (const clausula of arbol.clausulas) {
    for (const token of clausula.tokens) {
      const negacion = negacionPrevia(clausula.texto.slice(0, token.inicio), idioma);

      let estado = "ACTIVO";
      let motivo = null;
      if (idioma.sensibles.includes(token.tipo)) {
        if (negacion) {
          estado = "NEGADO";
          motivo = `negación "${negacion}"`;
        } else if (mitigadas.has(clausula)) {
          estado = "MITIGADO";
          motivo = `mitigador "${mitigadas.get(clausula)}"`;
        }
      }

      resultados.push({
        tipo: token.tipo,
        palabra: token.palabra,
        estado,
        motivo,
        posicion: arbol.inicio + clausula.inicio + token.inicio
      });
    }
  }

  return resultados;
}
