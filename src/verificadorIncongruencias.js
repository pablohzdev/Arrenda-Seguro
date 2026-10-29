import { IDIOMAS } from "./idiomas.js";
import { dividirOraciones } from "./arbolExpresiones.js";
import { extraerFechasConRol, mesesEntreFechas } from "./periodo.js";
import { duracionDelContrato } from "./reglasEntorno.js";
import { palabras, patronDeFrases, plegar, regexDeFrases } from "./texto.js";

// Palabras de contenido que se comparan a cada lado de una frase contradictoria.
const VENTANA_TEMA = 4;
// Palabras máximas entre un concepto de pago y su importe.
const DISTANCIA_PAGO = 8;
// Diferencia tolerada (meses) entre la vigencia declarada y la de las fechas.
const TOLERANCIA_MESES = 1;

const PRECIO = /\$\s?\d[\d.,]*\d|\$\s?\d/g;

const cache = new WeakMap();
function reglasDe(idioma) {
  if (!cache.has(idioma)) {
    cache.set(idioma, {
      // Los pares más específicos primero ("podrá subarrendar" antes que "podrá").
      pares: [...idioma.contradicciones]
        .sort((a, b) => b[0].length - a[0].length)
        .map(([si, no]) => ({ si: regexDeFrases([si]), no: regexDeFrases([no]) })),
      ambiguas: regexDeFrases(idioma.ambiguas),
      pago: new RegExp(patronDeFrases(idioma.conceptosPago), "gu"),
      excluidas: new Set([...idioma.partes, ...idioma.negaciones].map(plegar))
    });
  }
  return cache.get(idioma);
}

// Valor numérico de "$1.500.000", "$1,500.50", "$900".
function valorPrecio(texto) {
  const cifra = texto.replace(/[$\s]/g, "").replace(/[.,](?=\d{3}(?:\D|$))/g, "");
  return Number(cifra.replace(",", "."));
}

function formatearFecha(fecha) {
  return fecha.toISOString().slice(0, 10);
}

// Palabras de contenido de la cláusula a ambos lados de [ini, fin) de la
// oración, como Map plegada -> original.
function tema(oracion, ini, fin, excluidas) {
  const contenido = texto => (texto.match(/[\p{L}\p{N}']+/gu) || [])
    .filter(w => w.length >= 4 && !excluidas.has(plegar(w)));
  const clausulaAntes = oracion.slice(0, ini).split(/[,;:]/).pop();
  const clausulaDespues = oracion.slice(fin).split(/[,;:]/)[0];
  return new Map([
    ...contenido(clausulaAntes).slice(-VENTANA_TEMA),
    ...contenido(clausulaDespues).slice(0, VENTANA_TEMA)
  ].map(w => [plegar(w), w]));
}

const recortar = texto => texto.replace(/\s+/g, " ").trim();

export function analizarIncongruencias(paginas, idiomaId = "es") {

  const idioma = IDIOMAS[idiomaId];
  const reglas = reglasDe(idioma);
  const incongruencias = [];

  const oraciones = paginas.flatMap(p =>
    dividirOraciones(p.texto).map(o => ({ ...o, pagina: p.pagina, plegada: plegar(o.texto) }))
  );
  const resaltar = (o, ini, fin) => ({ pagina: o.pagina, inicio: o.inicio + ini, fin: o.inicio + fin });

  // ===============================
  // CONTRADICCIONES: misma acción afirmada y negada sobre el mismo tema
  // ===============================

  const paresVistos = new Set();
  reglas.pares.forEach(par => {
    const afirmaciones = [];
    const negaciones = [];

    oraciones.forEach(o => {
      const negadas = [...o.plegada.matchAll(par.no)].map(m => [m.index, m.index + m[0].length]);
      negadas.forEach(([ini, fin]) => negaciones.push({ o, ini, fin }));
      for (const m of o.plegada.matchAll(par.si)) {
        if (negadas.some(([ini, fin]) => m.index >= ini && m.index < fin)) continue;
        afirmaciones.push({ o, ini: m.index, fin: m.index + m[0].length });
      }
    });

    for (const a of afirmaciones) {
      for (const n of negaciones) {
        if (a.o === n.o) continue;
        const clave = `${a.o.pagina}:${a.o.inicio}|${n.o.pagina}:${n.o.inicio}`;
        if (paresVistos.has(clave)) continue;

        const temaA = tema(a.o.texto, a.ini, a.fin, reglas.excluidas);
        const comun = [...tema(n.o.texto, n.ini, n.fin, reglas.excluidas)]
          .filter(([w]) => temaA.has(w))
          .map(([w]) => temaA.get(w));
        if (comun.length === 0) continue;

        paresVistos.add(clave);
        incongruencias.push({
          tipo: "CONTRADICCIÓN",
          frase: recortar(a.o.texto),
          pagina: a.o.pagina,
          resaltados: [resaltar(a.o, a.ini, a.fin), resaltar(n.o, n.ini, n.fin)],
          detalle: `Contradice a la cláusula de la página ${n.o.pagina}: "${recortar(n.o.texto)}". Ambas tratan sobre: ${comun.join(", ")}.`
        });
      }
    }
  });

  // ===============================
  // AMBIGÜEDADES
  // ===============================

  oraciones.forEach(o => {
    const expresiones = [...o.plegada.matchAll(reglas.ambiguas)];
    if (expresiones.length === 0) return;
    incongruencias.push({
      tipo: "AMBIGÜEDAD",
      frase: recortar(o.texto),
      pagina: o.pagina,
      resaltados: expresiones.map(m => resaltar(o, m.index, m.index + m[0].length)),
      detalle: `La expresión ${expresiones.map(m => `"${o.texto.slice(m.index, m.index + m[0].length)}"`).join(", ")} deja la condición a criterio de una de las partes o sin un parámetro objetivo.`
    });
  });

  // ===============================
  // PRECIOS: la renta debe tener un único importe en todo el contrato
  // ===============================

  const rentas = [];
  oraciones.forEach(o => {
    let desde = 0;
    for (const m of o.texto.matchAll(PRECIO)) {
      // El concepto debe estar entre el precio anterior y éste, y cerca.
      const tramo = o.plegada.slice(desde, m.index);
      const conceptos = [...tramo.matchAll(reglas.pago)];
      const ultimo = conceptos[conceptos.length - 1];
      if (ultimo && palabras(tramo.slice(ultimo.index + ultimo[0].length)).length <= DISTANCIA_PAGO) {
        rentas.push({ o, texto: m[0], valor: valorPrecio(m[0]), ini: m.index, fin: m.index + m[0].length });
      }
      desde = m.index + m[0].length;
    }
  });

  if (new Set(rentas.map(r => r.valor)).size > 1) {
    incongruencias.push({
      tipo: "INCONSISTENCIA DE PAGO",
      frase: recortar(rentas[0].o.texto),
      pagina: rentas[0].o.pagina,
      resaltados: rentas.map(r => resaltar(r.o, r.ini, r.fin)),
      detalle: `La renta aparece con importes distintos: ${rentas.map(r => `${r.texto} (pág. ${r.o.pagina})`).join(", ")}.`
    });
  }

  // ===============================
  // FECHAS: inicio/fin únicos, fin posterior al inicio y acordes a la vigencia
  // ===============================

  const fechas = extraerFechasConRol(paginas, idioma);
  const marcarFechas = (lista, detalle) => incongruencias.push({
    tipo: "FECHA CONTRADICTORIA",
    frase: lista.map(f => f.texto).join(" — "),
    pagina: lista[0].pagina,
    resaltados: lista.map(f => ({ pagina: f.pagina, inicio: f.inicio, fin: f.fin })),
    detalle
  });

  for (const rol of ["inicio", "fin"]) {
    const delRol = fechas.filter(f => f.rol === rol);
    if (new Set(delRol.map(f => +f.fecha)).size > 1) {
      marcarFechas(delRol, `El contrato indica más de una fecha de ${rol}: ${delRol.map(f => f.texto).join(", ")}.`);
    }
  }

  const inicio = fechas.find(f => f.rol === "inicio");
  const fin = fechas.find(f => f.rol === "fin");
  if (inicio && fin && fin.fecha <= inicio.fecha) {
    marcarFechas([inicio, fin], `La fecha de fin (${formatearFecha(fin.fecha)}) no es posterior a la de inicio (${formatearFecha(inicio.fecha)}).`);
  } else if (inicio && fin) {
    const declarada = duracionDelContrato(paginas, idiomaId);
    const real = mesesEntreFechas(fechas);
    if (declarada !== undefined && declarada !== real && Math.abs(declarada - real) > TOLERANCIA_MESES) {
      marcarFechas([inicio, fin], `La vigencia declarada (${Math.round(declarada)} meses) no coincide con las fechas de inicio y fin (${Math.round(real)} meses).`);
    }
  }

  return incongruencias;

}
